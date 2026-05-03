import { adminFetchJson, getAccessToken, tryRefreshAccessToken, type AdminJsonResult } from '@/lib/admin-api';
import { LIVE_DESTRUCT_CONFIRM, LIVE_DESTRUCT_CONFIRM_HEADER } from '@/lib/live-destructive-confirm';

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
  /** Thumbnail mq probe: unchecked | ok | unavailable */
  health_status?: string | null;
  health_checked_at?: string | null;
  last_checked?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
  /** best_of_jm | podcast | custom — site HTML / .video-card lineage */
  source?: string | null;
  /** Matches data-category on site (podcast, religion, power, …) */
  category?: string | null;
  episode_number?: number | null;
  playlist_id?: string | null;
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
  videoId: string,
  opts?: { confirmLiveDestructive?: boolean }
): Promise<AdminJsonResult<{ success?: boolean }>> {
  const headers: HeadersInit = {};
  if (opts?.confirmLiveDestructive) {
    headers[LIVE_DESTRUCT_CONFIRM_HEADER] = LIVE_DESTRUCT_CONFIRM.DELETE_LIVE_PROJECT_VIDEO;
  }
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers,
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

/** Mirrored MP4 (or yt-dlp output) from global `videos` archive, keyed by catalog YouTube IDs. Requires migration 017 + archive sync. */
export type VideoArchiveZipResult =
  | { ok: true; blob: Blob; filename: string }
  | { ok: false; status: number; error: string };

export async function fetchProjectVideosArchiveZip(projectId: string): Promise<VideoArchiveZipResult> {
  const path = `/api/admin/projects/${encodeURIComponent(projectId)}/videos/archive-zip`;

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
  let filename = `project-${projectId.slice(0, 8)}-videos-mp4.zip`;
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

export function replaceAdminProjectVideoYoutube(
  projectId: string,
  videoRowId: string,
  body: { youtube_id?: string; replacement_youtube_id?: string; patch_site_html?: boolean }
): Promise<
  AdminJsonResult<{
    video?: ProjectVideoRow;
    pathsUpdated?: number;
  }>
> {
  return adminFetchJson(
    `/api/admin/projects/${encodeURIComponent(projectId)}/videos/${encodeURIComponent(videoRowId)}/replace-youtube`,
    {
      method: 'POST',
      json: body,
    }
  );
}

export type PublicProjectVideoItem = {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail: string;
  status: string;
  watchUrl?: string;
  source?: string;
  category?: string | null;
  episode_number?: number | null;
  playlist_id?: string | null;
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
