import { adminFetchJson, adminFetchMultipartJson, type AdminJsonResult } from '@/lib/admin-api';

export type SiteMediaItem = { name: string; url: string; path: string };

export function fetchProjectSiteMedia(projectId: string): Promise<AdminJsonResult<{ items?: SiteMediaItem[] }>> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/site/media`);
}

export function uploadProjectSiteImage(projectId: string, file: File): Promise<
  AdminJsonResult<{ success?: boolean; publicUrl?: string; path?: string }>
> {
  const fd = new FormData();
  fd.append('file', file);
  return adminFetchMultipartJson(`/api/admin/projects/${encodeURIComponent(projectId)}/upload`, fd);
}
