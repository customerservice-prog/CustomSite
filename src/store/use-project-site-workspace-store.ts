import { create } from 'zustand';
import type { ProjectSite, ProjectSiteFile } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { composePreviewDocument } from '@/lib/site-builder/compose-preview-document';
import { getProjectSite, saveProjectSite } from '@/lib/site-builder/project-site-storage';
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
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
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

function recomputePreview(site: ProjectSite): string {
  try {
    return composePreviewDocument(site);
  } catch {
    return '<!DOCTYPE html><html lang="en"><body><p>Preview unavailable.</p></body></html>';
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
  optimisticPersist: (projectId: string, opts?: { snapshot?: boolean }) => void;
  /** Merge Rbyan output into the shared site + version list + background save. */
  applyRbyanOutput: (
    projectId: string,
    files: RbyanGeneratedFile[],
    meta: { label: string; plan: string[] }
  ) => void;
  requestQuickAddPage: () => void;
  /** JSON bundle for duplicating a site into another project or doc. */
  copySiteBundleForDuplicate: (projectId: string) => Promise<boolean>;
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
    const now = Date.now();
    const withSnapshot = opts?.snapshot !== false;
    const snapshotFiles = siteFilesToVersionPayload(get().byProjectId[projectId]!.site);
    set((s) => ({
      byProjectId: {
        ...s.byProjectId,
        [projectId]: { ...row, saveStatus: 'saving', saveError: null, lastSavedAt: now },
      },
    }));
    void saveProjectSite(row.site)
      .then(() => {
        if (withSnapshot) {
          get().appendSnapshot(projectId, 'Manual save', ['Saved from Site Builder'], snapshotFiles);
        }
        set((s) => {
          const r = get().byProjectId[projectId];
          if (!r) return s;
          return {
            byProjectId: {
              ...s.byProjectId,
              [projectId]: { ...r, saveStatus: 'saved', saveError: null },
            },
          };
        });
      })
      .catch((e) => {
        const saveError = humanizeError(e);
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
          lastSavedAt: Date.now(),
          saveStatus: 'saved',
          saveError: null,
          versions: listRbyanVersions(projectId),
        },
      },
    }));
    void saveProjectSite(site).catch(() => {
      set((st) => {
        const r = get().byProjectId[projectId];
        if (!r) return st;
        return {
          byProjectId: {
            ...st.byProjectId,
            [projectId]: { ...r, saveStatus: 'error', saveError: humanizeError(new Error('network')) },
          },
        };
      });
    });
  },
}));
