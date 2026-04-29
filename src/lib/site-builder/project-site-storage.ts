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

function writeLocal(site: ProjectSite) {
  try {
    localStorage.setItem(storageKey(site.projectId), JSON.stringify(site));
  } catch {
    /* quota */
  }
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

async function tryPushToApi(site: ProjectSite): Promise<void> {
  for (const f of site.files) {
    await adminFetchJson(`/api/admin/projects/${encodeURIComponent(site.projectId)}/site/file`, {
      method: 'PUT',
      json: { path: f.name, content: f.content, content_encoding: 'utf8' },
    });
  }
}

/** Load site files: prefer local cache; if empty, try API once and mirror to local. */
export async function getProjectSite(projectId: string): Promise<ProjectSite> {
  const cached = readLocal(projectId);
  if (cached && cached.files.length > 0) {
    return cached;
  }

  const fromApi = await tryLoadFromApi(projectId);
  if (fromApi && fromApi.files.length > 0) {
    writeLocal(fromApi);
    return fromApi;
  }

  return { projectId, files: [] };
}

/** Persist site bundle to localStorage; best-effort sync to API (never throws). */
export async function saveProjectSite(site: ProjectSite): Promise<void> {
  writeLocal(site);
  void tryPushToApi(site).catch(() => {
    /* offline / auth — local copy is canonical for builder */
  });
}
