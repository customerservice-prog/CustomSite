/**
 * Unified Site builder file API: Postgres + Express when `VITE_USE_REAL_API=1`,
 * otherwise browser localStorage (internal production workflow without Supabase).
 */

import { adminFetchJson, getAccessToken, tryRefreshAccessToken, type AdminJsonResult } from '@/lib/admin-api';
import { LIVE_DESTRUCT_CONFIRM, LIVE_DESTRUCT_CONFIRM_HEADER } from '@/lib/live-destructive-confirm';
import { shouldShowDemoDatasetBanner } from '@/lib/runtime-demo';
import {
  localSiteDeleteFile,
  localSiteGetFile,
  localSiteListFiles,
  localSiteMergeFiles,
  localSitePutFile,
  type LocalSiteFileRow,
} from '@/lib/site-builder/local-site-files-store';
import { localBasicStarterMap } from '@/lib/site-builder/local-starter-files';

export type SiteWorkspaceFileRow = LocalSiteFileRow;

export function shouldPersistSiteFilesLocally(): boolean {
  return shouldShowDemoDatasetBanner();
}

/** When true, the SPA is built for production API and site PUTs should target the server (not local-only mocks). */
export function siteFilesTargetLiveServer(): boolean {
  return !shouldPersistSiteFilesLocally();
}

/** Synchronous read for preview memoization (local workspace only). */
export function readLocalWorkspaceFileSync(projectId: string, path: string): string | null {
  if (!shouldPersistSiteFilesLocally()) return null;
  return localSiteGetFile(projectId, path);
}

export async function siteBuilderListFiles(projectId: string): Promise<AdminJsonResult<{ files?: SiteWorkspaceFileRow[] }>> {
  if (shouldPersistSiteFilesLocally()) {
    return { ok: true, data: { files: localSiteListFiles(projectId) } };
  }
  return adminFetchJson<{ files?: SiteWorkspaceFileRow[] }>(`/api/admin/projects/${encodeURIComponent(projectId)}/site`);
}

export async function siteBuilderGetFile(
  projectId: string,
  path: string
): Promise<AdminJsonResult<{ content?: string; path?: string }>> {
  if (shouldPersistSiteFilesLocally()) {
    const content = localSiteGetFile(projectId, path);
    if (content == null) return { ok: false, status: 404, error: 'Not found' };
    return { ok: true, data: { path, content } };
  }
  const q = new URLSearchParams({ path }).toString();
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/file?${q}`);
}

export async function siteBuilderPutFile(
  projectId: string,
  path: string,
  content: string
): Promise<AdminJsonResult<{ success?: boolean }>> {
  if (shouldPersistSiteFilesLocally()) {
    localSitePutFile(projectId, path, content);
    return { ok: true, data: { success: true } };
  }
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/file`, {
    method: 'PUT',
    json: { path, content, content_encoding: 'utf8' },
  });
}

export async function siteBuilderDeleteFile(
  projectId: string,
  path: string,
  opts?: { confirmLiveDestructive?: boolean }
): Promise<AdminJsonResult<{ success?: boolean }>> {
  if (shouldPersistSiteFilesLocally()) {
    localSiteDeleteFile(projectId, path);
    return { ok: true, data: { success: true } };
  }
  const headers: HeadersInit = {};
  if (opts?.confirmLiveDestructive) {
    headers[LIVE_DESTRUCT_CONFIRM_HEADER] = LIVE_DESTRUCT_CONFIRM.DELETE_LIVE_SITE_FILE;
  }
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/file?${new URLSearchParams({ path }).toString()}`, {
    method: 'DELETE',
    headers,
  });
}

/** `GET …/site/export` — repo-style ZIP of all `site_files` + handoff readme / JSON (see `routes/siteBuilder.js`). */
export type SiteSourceExportZipResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; status: number; error: string };

export async function fetchProjectSiteSourceExportZip(projectId: string): Promise<SiteSourceExportZipResult> {
  const path = `/api/admin/projects/${encodeURIComponent(projectId)}/site/export`;

  async function fetchOnce(bearer: string | null): Promise<Response> {
    const headers: HeadersInit = {};
    if (bearer?.trim()) headers.Authorization = `Bearer ${bearer.trim()}`;
    return fetch(path, { headers });
  }

  let token = getAccessToken()?.trim() ?? '';
  let res = await fetchOnce(token || null);
  if (res.status === 401) {
    const next = await tryRefreshAccessToken();
    if (next?.trim()) res = await fetchOnce(next.trim());
  }

  if (!res.ok) {
    try {
      const j = (await res.json()) as { error?: string };
      return { ok: false, status: res.status, error: String(j?.error || res.statusText) };
    } catch {
      const t = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: t.slice(0, 400) || res.statusText };
    }
  }

  const blob = await res.blob();
  let filename = `site-source-${projectId.slice(0, 8)}.zip`;
  const cd = res.headers.get('Content-Disposition') || '';
  const mStar = cd.match(/filename\*=UTF-8''([^;]+)/i);
  const mPlain = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;\s]+)/);
  if (mStar?.[1]) {
    try {
      filename = decodeURIComponent(mStar[1]);
    } catch {
      filename = mStar[1];
    }
  } else if (mPlain?.[1]) {
    filename = mPlain[1].replace(/^["']|["']$/g, '');
  }

  return { ok: true, blob, filename };
}

/** Seed basic files then caller overwrites index (matches server /site/init + put flow). */
export async function siteBuilderInitBasicTemplate(projectId: string): Promise<AdminJsonResult<{ success?: boolean }>> {
  if (shouldPersistSiteFilesLocally()) {
    localSiteMergeFiles(projectId, localBasicStarterMap());
    return { ok: true, data: { success: true } };
  }
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/init`, {
    method: 'POST',
    json: { template: 'basic' },
  });
}
