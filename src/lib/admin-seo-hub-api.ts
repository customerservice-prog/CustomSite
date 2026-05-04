import { adminFetchJson } from '@/lib/admin-api';

export type SeoChecklistCell = {
  completed: boolean;
  completed_at: string | null;
  auto_detected: boolean;
  notes: string | null;
};

export type SeoProjectRow = {
  id?: string;
  project_id?: string;
  gbp_place_id?: string | null;
  gbp_name?: string | null;
  gbp_category?: string | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  near_me_keywords?: string[] | null;
  target_city?: string | null;
  review_goal?: number | null;
  review_link?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SeoHubPayload = {
  project?: { id: string; name?: string };
  seo: SeoProjectRow | null;
  checklist: Record<string, SeoChecklistCell>;
  snapshots?: {
    reviews?: Record<string, unknown> | null;
    gbp?: Record<string, unknown> | null;
    ranks?: Record<string, unknown>[];
    ranks_snapshot_date?: string | null;
  };
};

export type SeoHistoryPayload = {
  reviews?: { snapshot_date?: string; review_count?: number; avg_rating?: number | null; source?: string }[];
  ranks?: {
    snapshot_date?: string;
    keyword?: string;
    map_pack_position?: number | null;
    source?: string;
  }[];
  since?: string;
};

export function fetchSeoHub(projectId: string) {
  return adminFetchJson<SeoHubPayload>(`/api/admin/seo/${encodeURIComponent(projectId)}`);
}

export function postSeoSetup(
  projectId: string,
  body: Record<string, unknown>
) {
  return adminFetchJson<{ seo?: SeoProjectRow | null }>(`/api/admin/seo/${encodeURIComponent(projectId)}/setup`, {
    method: 'POST',
    json: body,
  });
}

export function postSeoChecklist(
  projectId: string,
  check_id: string,
  completed: boolean,
  notes?: string | null
) {
  return adminFetchJson<{ checklist_item?: unknown }>(`/api/admin/seo/${encodeURIComponent(projectId)}/checklist`, {
    method: 'POST',
    json: { check_id, completed, notes },
  });
}

export function fetchSeoHistory(projectId: string) {
  return adminFetchJson<SeoHistoryPayload>(`/api/admin/seo/${encodeURIComponent(projectId)}/history`);
}
