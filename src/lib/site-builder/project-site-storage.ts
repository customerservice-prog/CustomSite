/**
 * Project site file bundle: API when reachable, always mirrored to localStorage
 * so the builder works with no backend (key project_site_<projectId>).
 */

import type { ProjectSite, ProjectSiteFile } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';
import { adminFetchJson } from '@/lib/admin-api';

const LS_PREFIX = 'project_site_';

function storageKey(projectId: string): string {
  return `${LS_PREFIX}${projectId}`;
}

function readLocal(projectId: string): ProjectSite | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const o = JSON.parse(raw) as ProjectSite;
    if (!o || o.projectId !== projectId || !Array.isArray(o.files)) return null;
    return o;
  } catch {
    return null;
  }
}

function writeLocal(site: ProjectSite): boolean {
  try {
    localStorage.setItem(storageKey(site.projectId), JSON.stringify(site));
    return true;
  } catch {
    return false;
  }
}

function mergeApiSiteWithLocal(api: ProjectSite, local: ProjectSite | null): ProjectSite {
  if (!local?.files?.length) return api;
  const byName = new Map(local.files.map((f) => [f.name, f]));
  const merged = api.files.map((af) => {
    const loc = byName.get(af.name);
    if (!loc) return af;
    const aLen = (af.content || '').trim().length;
    const lLen = (loc.content || '').trim().length;
    if (lLen > aLen) {
      return { ...af, content: loc.content, updatedAt: loc.updatedAt };
    }
    return af;
  });
  const apiNames = new Set(api.files.map((f) => f.name));
  const extras = local.files.filter((f) => !apiNames.has(f.name));
  return { projectId: api.projectId, files: [...merged, ...extras] };
}

async function tryLoadFromApi(projectId: string): Promise<ProjectSite | null> {
  const list = await adminFetchJson<{ files?: { path: string }[] }>(
    `/api/admin/projects/${encodeURIComponent(projectId)}/site`
  );
  if (!list.ok || !Array.isArray(list.data.files) || list.data.files.length === 0) {
    return null;
  }
  const files: ProjectSiteFile[] = [];
  for (const row of list.data.files) {
    const path = row.path;
    if (!path || /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(path)) continue;
    const get = await adminFetchJson<{ content?: string }>(
      `/api/admin/projects/${encodeURIComponent(projectId)}/site/file?${new URLSearchParams({ path }).toString()}`
    );
    if (!get.ok) continue;
    const content = get.data.content != null ? String(get.data.content) : '';
    files.push(newFile(path, content));
  }
  if (files.length === 0) return null;
  return { projectId, files };
}

async function tryPushToApi(site: ProjectSite): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const f of site.files) {
    const r = await adminFetchJson<unknown>(`/api/admin/projects/${encodeURIComponent(site.projectId)}/site/file`, {
      method: 'PUT',
      json: { path: f.name, content: f.content, content_encoding: 'utf8' },
    });
    if (!r.ok) {
      return { ok: false, error: r.error || `Could not save “${f.name}”` };
    }
  }
  return { ok: true };
}

/**
 * Load site files: merge API with localStorage so a partial/empty API response
 * does not wipe files that were saved locally or lose longer in-browser edits.
 */
export async function getProjectSite(projectId: string): Promise<ProjectSite> {
  const cached = readLocal(projectId);
  const fromApi = await tryLoadFromApi(projectId);

  if (fromApi && fromApi.files.length > 0) {
    const merged = mergeApiSiteWithLocal(fromApi, cached);
    writeLocal(merged);
    return merged;
  }

  if (cached && cached.files.length > 0) {
    return cached;
  }

  return { projectId, files: [] };
}

export type SaveProjectSiteResult = {
  /** Browser storage write (local copy for the builder). */
  localSaved: boolean;
  apiOk: boolean;
  apiError?: string;
};

/** Persist site bundle to localStorage, then sync each file to the API. Never throws. */
export async function saveProjectSite(site: ProjectSite): Promise<SaveProjectSiteResult> {
  const localSaved = writeLocal(site);
  if (!localSaved) {
    return {
      localSaved: false,
      apiOk: false,
      apiError: 'Could not write to browser storage (quota full or private mode).',
    };
  }
  try {
    const api = await tryPushToApi(site);
    if (!api.ok) {
      return { localSaved: true, apiOk: false, apiError: api.error };
    }
    return { localSaved: true, apiOk: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { localSaved: true, apiOk: false, apiError: msg };
  }
}
