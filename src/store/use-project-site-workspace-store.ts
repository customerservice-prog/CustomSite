import { create } from 'zustand';
import type { ProjectSite, ProjectSiteFile } from '@/lib/site-builder/project-site-model';
import { inferFileType, newFile } from '@/lib/site-builder/project-site-model';
import { composePreviewDocument } from '@/lib/site-builder/compose-preview-document';
import { getProjectSite, saveProjectSite, type SaveProjectSiteResult } from '@/lib/site-builder/project-site-storage';
import type { RbyanGeneratedFile, RbyanVersionEntry } from '@/lib/rbyan/types';
import { rbyanFilesToProjectFiles } from '@/lib/rbyan/types';
import { appendRbyanVersion, listRbyanVersions } from '@/lib/rbyan/version-history';

export type BuilderSurfaceMode = 'ai' | 'code';

export type ProjectSiteWorkspaceRow = {
  projectId: string;
  site: ProjectSite;
  activeFile: string;
  previewHtml: string;
  previewNonce: number;
  lastSavedAt: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'saved_local_only' | 'error';
  saveError: string | null;
  loadStatus: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  hydrated: boolean;
  builderSurface: BuilderSurfaceMode;
  versions: RbyanVersionEntry[];
  rbyanBusy: boolean;
};

const PREVIEW_DEBOUNCE_MS = 220;

function humanizeError(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/network|failed to fetch|load failed/i.test(m)) {
    return 'Could not reach the server — using your local copy.';
  }
  if (/401|403|session|unauth|invalid session/i.test(m)) {
    return 'Session expired — reconnecting… your work is saved locally.';
  }
  return 'Something went wrong — your edits are still here. Try again shortly.';
}

function humanizeSiteApiSaveError(apiError: string | undefined): string {
  const m = (apiError || '').trim();
  if (!m) return humanizeError(new Error('unknown'));
  if (/foreign key|site_files_project_id_fkey|violates foreign key/i.test(m)) {
    return 'Cloud save failed: project row could not be created in the database (check Supabase logs / permissions). Your files are still in this browser only.';
  }
  if (/network|failed to fetch|load failed/i.test(m)) {
    return 'Could not reach the server — your work is saved in this browser only.';
  }
  if (/401|403|session|unauth|invalid session/i.test(m)) {
    return 'Session expired — sign in again. Your work is saved in this browser only.';
  }
  return `Cloud save failed: ${m}`;
}

function escapePreviewErr(msg: string): string {
  return msg
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recomputePreview(site: ProjectSite): string {
  try {
    return composePreviewDocument(site);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head><body style="font-family:system-ui;padding:1rem"><p><strong>Preview could not compile.</strong></p><pre style="white-space:pre-wrap;word-break:break-word">${escapePreviewErr(m)}</pre></body></html>`;
  }
}

function siteFilesToVersionPayload(site: ProjectSite): RbyanVersionEntry['files'] {
  return site.files.map((f) => ({ name: f.name, type: f.type, content: f.content }));
}

type Store = {
  byProjectId: Record<string, ProjectSiteWorkspaceRow>;
  previewTimers: Record<string, ReturnType<typeof setTimeout> | undefined>;
  /** Last project that hydrated the workspace (for global shortcuts). */
  lastFocusedProjectId: string | null;
  /** Incremented so Site Builder can open the quick-add-page strip. */
  quickAddPageNonce: number;
  ensureRow: (projectId: string) => void;
  hydrate: (projectId: string) => Promise<void>;
  setBuilderSurface: (projectId: string, mode: BuilderSurfaceMode) => void;
  setRbyanBusy: (projectId: string, busy: boolean) => void;
  setActiveFile: (projectId: string, name: string) => void;
  /** Replace entire site and refresh preview immediately (Rbyan apply, restore, starter). */
  setSiteImmediate: (projectId: string, site: ProjectSite) => void;
  /** Patch one file; preview debounces to avoid iframe thrash while typing. */
  patchSiteFile: (projectId: string, fileName: string, content: string) => void;
  scheduleDebouncedPreview: (projectId: string) => void;
  /** Apply pending preview immediately (e.g. before save). */
  flushPreview: (projectId: string) => void;
  refreshVersions: (projectId: string) => void;
  appendSnapshot: (projectId: string, label: string, plan: string[], files: RbyanVersionEntry['files']) => void;
  /** UI shows saved immediately; persistence runs in background. */
  optimisticPersist: (
    projectId: string,
    opts?: { snapshot?: boolean; snapshotLabel?: string; snapshotPlan?: string[] }
  ) => void;
  /** Restore files from a saved version entry (local history). */
  revertWorkspaceToVersion: (projectId: string, versionId: string) => { ok: true } | { ok: false; error: string };
  /** Merge Rbyan output into the shared site + version list + background save. */
  applyRbyanOutput: (
    projectId: string,
    files: RbyanGeneratedFile[],
    meta: { label: string; plan: string[] }
  ) => void;
  requestQuickAddPage: () => void;
  /** JSON bundle for duplicating a site into another project or doc. */
  copySiteBundleForDuplicate: (projectId: string) => Promise<boolean>;
  /** Paste JSON from Copy site — replaces workspace files for this project. */
  importSiteBundleFromJson: (projectId: string, json: string) => { ok: true } | { ok: false; error: string };
  /** Align save badge after external persist (e.g. starter seed `saveProjectSite`). */
  recordPersistResult: (projectId: string, result: SaveProjectSiteResult) => void;
};

function emptyRow(projectId: string): ProjectSiteWorkspaceRow {
  const site: ProjectSite = { projectId, files: [] };
  return {
    projectId,
    site,
    activeFile: 'index.html',
    previewHtml: recomputePreview(site),
    previewNonce: 0,
    lastSavedAt: null,
    saveStatus: 'idle',
    saveError: null,
    loadStatus: 'idle',
    loadError: null,
    hydrated: false,
    builderSurface: 'code',
    versions: [],
    rbyanBusy: false,
  };
}

export const useProjectSiteWorkspaceStore = create<Store>((set, get) => ({
  byProjectId: {},
  previewTimers: {},
  lastFocusedProjectId: null,
  quickAddPageNonce: 0,

  requestQuickAddPage() {
    set((s) => ({ quickAddPageNonce: s.quickAddPageNonce + 1 }));
  },

  recordPersistResult(projectId, result) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    if (!result.localSaved) {
      const saveError = result.apiError || 'Could not save locally.';
      set((s) => ({
        byProjectId: {
          ...s.byProjectId,
          [projectId]: { ...row, saveStatus: 'error', saveError },
        },
      }));
      return;
    }
    if (result.apiOk) {
      set((s) => ({
        byProjectId: {
          ...s.byProjectId,
          [projectId]: {
            ...row,
            saveStatus: 'saved',
            saveError: null,
            lastSavedAt: Date.now(),
          },
        },
      }));
      return;
    }
    const saveError = humanizeSiteApiSaveError(result.apiError);
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: {
          ...row,
          saveStatus: 'saved_local_only',
          saveError,
          lastSavedAt: Date.now(),
        },
      },
    }));
  },

  async copySiteBundleForDuplicate(projectId) {
    const row = get().byProjectId[projectId];
    if (!row?.site.files.length) return false;
    const payload = JSON.stringify({ projectId, exportedAt: new Date().toISOString(), files: row.site.files });
    try {
      await navigator.clipboard.writeText(payload);
      return true;
    } catch {
      return false;
    }
  },

  importSiteBundleFromJson(projectId, json) {
    try {
      const data = JSON.parse(json) as { files?: unknown[] };
      if (!data?.files?.length) {
        return { ok: false, error: 'Expected JSON with a non-empty "files" array (same shape as Copy site).' };
      }
      const files: ProjectSiteFile[] = [];
      for (let i = 0; i < data.files.length; i++) {
        const raw = data.files[i] as Partial<ProjectSiteFile>;
        const name = String(raw?.name ?? '').trim() || `file-${i + 1}`;
        const content = String(raw?.content ?? '');
        const type =
          raw?.type === 'html' || raw?.type === 'css' || raw?.type === 'js' ? raw.type : inferFileType(name);
        const updatedAt = typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString();
        const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : name;
        files.push({ id, name, content, type, updatedAt });
      }
      const site: ProjectSite = { projectId, files };
      get().setSiteImmediate(projectId, site);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Invalid JSON — paste the exact output from Copy site.' };
    }
  },

  ensureRow(projectId) {
    if (!projectId) return;
    if (get().byProjectId[projectId]) return;
    set((s) => ({ byProjectId: { ...s.byProjectId, [projectId]: emptyRow(projectId) } }));
  },

  async hydrate(projectId) {
    if (!projectId) return;
    get().ensureRow(projectId);
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: { ...s.byProjectId[projectId], loadStatus: 'loading', loadError: null },
      },
    }));
    try {
      const site = await getProjectSite(projectId);
      const versions = listRbyanVersions(projectId);
      const previewHtml = recomputePreview(site);
      set((s) => {
        const prev = s.byProjectId[projectId];
        return {
          lastFocusedProjectId: projectId,
          byProjectId: {
            ...s.byProjectId,
            [projectId]: {
              ...prev,
              site,
              previewHtml,
              previewNonce: prev.previewNonce + 1,
              loadStatus: 'ready',
              loadError: null,
              hydrated: true,
              versions,
            },
          },
        };
      });
    } catch (e) {
      const loadError = humanizeError(e);
      set((s) => ({
        lastFocusedProjectId: projectId,
        byProjectId: {
          ...s.byProjectId,
          [projectId]: { ...s.byProjectId[projectId], loadStatus: 'error', loadError, hydrated: true },
        },
      }));
    }
  },

  setBuilderSurface(projectId, mode) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    set((s) => ({ byProjectId: { ...s.byProjectId, [projectId]: { ...row, builderSurface: mode } } }));
  },

  setRbyanBusy(projectId, busy) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    set((s) => ({ byProjectId: { ...s.byProjectId, [projectId]: { ...row, rbyanBusy: busy } } }));
  },

  setActiveFile(projectId, name) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    set((s) => ({ byProjectId: { ...s.byProjectId, [projectId]: { ...row, activeFile: name } } }));
  },

  setSiteImmediate(projectId, site) {
    get().ensureRow(projectId);
    const row = get().byProjectId[projectId];
    const previewHtml = recomputePreview(site);
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: {
          ...row,
          site,
          previewHtml,
          previewNonce: row.previewNonce + 1,
        },
      },
    }));
  },

  scheduleDebouncedPreview(projectId) {
    const prevT = get().previewTimers[projectId];
    if (prevT) clearTimeout(prevT);
    const t = setTimeout(() => {
      const row = get().byProjectId[projectId];
      if (!row) return;
      const previewHtml = recomputePreview(row.site);
      set((s) => ({
        byProjectId: {
          ...s.byProjectId,
          [projectId]: { ...row, previewHtml, previewNonce: row.previewNonce + 1 },
        },
        previewTimers: { ...s.previewTimers, [projectId]: undefined },
      }));
    }, PREVIEW_DEBOUNCE_MS);
    set((s) => ({ previewTimers: { ...s.previewTimers, [projectId]: t } }));
  },

  flushPreview(projectId) {
    const prevT = get().previewTimers[projectId];
    if (prevT) clearTimeout(prevT);
    const row = get().byProjectId[projectId];
    if (!row) return;
    const previewHtml = recomputePreview(row.site);
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: { ...row, previewHtml, previewNonce: row.previewNonce + 1 },
      },
      previewTimers: { ...s.previewTimers, [projectId]: undefined },
    }));
  },

  patchSiteFile(projectId, fileName, content) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    const idx = row.site.files.findIndex((f) => f.name === fileName || f.id === fileName);
    let files: ProjectSiteFile[];
    if (idx < 0) {
      files = [...row.site.files, newFile(fileName, content)];
    } else {
      files = row.site.files.map((f, i) =>
        i === idx ? { ...f, content, updatedAt: new Date().toISOString() } : f
      );
    }
    const site: ProjectSite = { ...row.site, files };
    set((s) => ({ byProjectId: { ...s.byProjectId, [projectId]: { ...row, site } } }));
    get().scheduleDebouncedPreview(projectId);
  },

  refreshVersions(projectId) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: { ...row, versions: listRbyanVersions(projectId) },
      },
    }));
  },

  appendSnapshot(projectId, label, plan, files) {
    appendRbyanVersion(projectId, {
      id: `snap-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label,
      plan,
      files,
    });
    get().refreshVersions(projectId);
  },

  optimisticPersist(projectId, opts) {
    const row = get().byProjectId[projectId];
    if (!row) return;
    get().flushPreview(projectId);
    const withSnapshot = opts?.snapshot !== false;
    const siteToSave = get().byProjectId[projectId]!.site;
    const snapshotFiles = siteFilesToVersionPayload(siteToSave);
    const snapLabel = opts?.snapshotLabel;
    const snapPlan = opts?.snapshotPlan;
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: { ...row, saveStatus: 'saving', saveError: null },
      },
    }));
    void saveProjectSite(siteToSave)
      .then((result) => {
        if (!result.localSaved) {
          const saveError = result.apiError || 'Could not save locally.';
          set((s) => {
            const r = get().byProjectId[projectId];
            if (!r) return s;
            return {
              byProjectId: {
                ...s.byProjectId,
                [projectId]: { ...r, saveStatus: 'error', saveError },
              },
            };
          });
          return;
        }
        if (withSnapshot) {
          const label =
            snapLabel ??
            (result.apiOk ? 'Manual save — saved to server' : 'Manual save — local only (server failed)');
          const plan =
            snapPlan ??
            (result.apiOk ? ['Server API accepted the write'] : ['Server API failed', result.apiError || 'unknown']);
          get().appendSnapshot(projectId, label, plan, snapshotFiles);
        }
        if (result.apiOk) {
          set((s) => {
            const r = get().byProjectId[projectId];
            if (!r) return s;
            return {
              byProjectId: {
                ...s.byProjectId,
                [projectId]: { ...r, saveStatus: 'saved', saveError: null, lastSavedAt: Date.now() },
              },
            };
          });
          return;
        }
        const saveError = humanizeSiteApiSaveError(result.apiError);
        set((s) => {
          const r = get().byProjectId[projectId];
          if (!r) return s;
          return {
            byProjectId: {
              ...s.byProjectId,
              [projectId]: { ...r, saveStatus: 'saved_local_only', saveError, lastSavedAt: Date.now() },
            },
          };
        });
      })
      .catch((err) => {
        const saveError = humanizeError(err);
        set((s) => {
          const r = get().byProjectId[projectId];
          if (!r) return s;
          return {
            byProjectId: {
              ...s.byProjectId,
              [projectId]: { ...r, saveStatus: 'error', saveError },
            },
          };
        });
      });
  },

  applyRbyanOutput(projectId, files, meta) {
    get().ensureRow(projectId);
    const prev = get().byProjectId[projectId];
    if (!prev) return;
    appendRbyanVersion(projectId, {
      id: `pre-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: 'Before AI apply',
      plan: ['Automatic restore point before Bryan the Brain output'],
      files: siteFilesToVersionPayload(prev.site) as RbyanGeneratedFile[],
    });
    const site: ProjectSite = { projectId, files: rbyanFilesToProjectFiles(projectId, files) };
    const previewHtml = recomputePreview(site);
    appendRbyanVersion(projectId, {
      id: `gen-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: meta.label,
      plan: meta.plan,
      files,
    });
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: {
          ...prev,
          site,
          previewHtml,
          previewNonce: prev.previewNonce + 1,
          saveStatus: 'saving',
          saveError: null,
          versions: listRbyanVersions(projectId),
        },
      },
    }));
    void saveProjectSite(site)
      .then((result) => {
        if (!result.localSaved) {
          const saveError = result.apiError || 'Could not save locally.';
          set((st) => {
            const r = get().byProjectId[projectId];
            if (!r) return st;
            return {
              byProjectId: {
                ...st.byProjectId,
                [projectId]: { ...r, saveStatus: 'error', saveError },
              },
            };
          });
          return;
        }
        if (result.apiOk) {
          set((st) => {
            const r = get().byProjectId[projectId];
            if (!r) return st;
            return {
              byProjectId: {
                ...st.byProjectId,
                [projectId]: {
                  ...r,
                  saveStatus: 'saved',
                  saveError: null,
                  lastSavedAt: Date.now(),
                },
              },
            };
          });
          return;
        }
        const saveError = humanizeSiteApiSaveError(result.apiError);
        set((st) => {
          const r = get().byProjectId[projectId];
          if (!r) return st;
          return {
            byProjectId: {
              ...st.byProjectId,
              [projectId]: {
                ...r,
                saveStatus: 'saved_local_only',
                saveError,
                lastSavedAt: Date.now(),
              },
            },
          };
        });
      })
      .catch((err) => {
        const saveError = humanizeError(err);
        set((st) => {
          const r = get().byProjectId[projectId];
          if (!r) return st;
          return {
            byProjectId: {
              ...st.byProjectId,
              [projectId]: { ...r, saveStatus: 'error', saveError },
            },
          };
        });
      });
  },

  revertWorkspaceToVersion(projectId, versionId) {
    const list = listRbyanVersions(projectId);
    const v = list.find((x) => x.id === versionId);
    if (!v) return { ok: false, error: 'That version was not found.' };
    const site: ProjectSite = { projectId, files: rbyanFilesToProjectFiles(projectId, v.files) };
    get().setSiteImmediate(projectId, site);
    get().optimisticPersist(projectId, {
      snapshot: true,
      snapshotLabel: `Restored: ${v.label}`,
      snapshotPlan: ['revert', versionId],
    });
    return { ok: true };
  },
}));
