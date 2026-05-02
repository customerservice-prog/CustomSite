import { adminFetchJson, type AdminJsonResult } from '@/lib/admin-api';

export type ProjectVideoRow = {
  id: string;
  project_id: string;
  youtube_id: string;
  title: string;
  description?: string | null;
  author_name?: string | null;
  thumbnail_url?: string | null;
  cached_thumbnail?: string | null;
  duration?: string | null;
  view_count?: string | null;
  status?: string | null;
  last_checked?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

export type CheckVideosSummary = {
  checked: number;
  active: number;
  unavailable: number;
  summary?: string;
};

export function fetchAdminProjectVideos(projectId: string): Promise<
  AdminJsonResult<{ videos?: ProjectVideoRow[] }>
> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos`);
}

export function addAdminProjectVideo(
  projectId: string,
  body: { youtube_url?: string; youtube_id?: string; description?: string }
): Promise<AdminJsonResult<{ video?: ProjectVideoRow }>> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos`, {
    method: 'POST',
    json: body,
  });
}

export function deleteAdminProjectVideo(
  projectId: string,
  videoId: string
): Promise<AdminJsonResult<{ success?: boolean }>> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
  });
}

export function reorderAdminProjectVideos(
  projectId: string,
  orderedIds: string[]
): Promise<AdminJsonResult<{ success?: boolean }>> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos/reorder`, {
    method: 'PUT',
    json: { ordered_ids: orderedIds },
  });
}

export function checkAdminProjectVideos(projectId: string): Promise<
  AdminJsonResult<CheckVideosSummary>
> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos/check`, {
    method: 'POST',
  });
}

export function cacheAdminProjectVideoThumbnails(projectId: string): Promise<
  AdminJsonResult<{ queued?: number; cached?: number; failed?: number }>
> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos/cache-thumbnails`, {
    method: 'POST',
  });
}

export type PublicProjectVideoItem = {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail: string;
  status: string;
  watchUrl?: string;
};

/** Unauthenticated catalog for deployed client sites (`/api/public/...`). */
export async function fetchPublicProjectVideos(
  projectId: string
): Promise<AdminJsonResult<{ videos?: PublicProjectVideoItem[] }>> {
  try {
    const path = `/api/public/projects/${encodeURIComponent(projectId)}/videos`;
    const res = await fetch(path);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = (await res.json()) as { videos?: PublicProjectVideoItem[] };
      if (!res.ok) {
        const errBody = data as unknown as { error?: string };
        return {
          ok: false,
          status: res.status,
          error: errBody?.error || res.statusText || 'Request failed',
        };
      }
      return { ok: true, data };
    }
    if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
    return { ok: true, data: { videos: [] } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, error: msg };
  }
}
