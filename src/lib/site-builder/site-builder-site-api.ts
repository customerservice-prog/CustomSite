/**
 * Unified Site builder file API: Postgres + Express when `VITE_USE_REAL_API=1`,
 * otherwise browser localStorage (internal production workflow without Supabase).
 */

import { adminFetchJson, type AdminJsonResult } from '@/lib/admin-api';
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

export async function siteBuilderDeleteFile(projectId: string, path: string): Promise<AdminJsonResult<{ success?: boolean }>> {
  if (shouldPersistSiteFilesLocally()) {
    localSiteDeleteFile(projectId, path);
    return { ok: true, data: { success: true } };
  }
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/file?${new URLSearchParams({ path }).toString()}`, {
    method: 'DELETE',
  });
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
