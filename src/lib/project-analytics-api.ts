import { adminFetchJson } from '@/lib/admin-api';

export type AnalyticsDayRow = { date: string; pageviews: number; unique_visitors: number };

export type PeakDayPayload = { date: string; pageviews: number } | null;

export type TopReferrerRow = { referrer: string; count: number };

export type ProjectAnalyticsPayload = {
  total_views: number;
  yesterday_views: number;
  yesterday_unique_visitors?: number;
  today_views: number;
  last_30_days: AnalyticsDayRow[];
  launched_at?: string | null;
  peak_day?: PeakDayPayload;
  top_referrers?: TopReferrerRow[];
};

export type LiveByProjectRow = {
  project_id: string;
  name: string;
  live_visitors: number;
};

export type LiveAnalyticsPayload = {
  total_live: number;
  by_project: LiveByProjectRow[];
};

export async function fetchProjectAnalytics(projectId: string) {
  return adminFetchJson<ProjectAnalyticsPayload>(
    `/api/admin/projects/${encodeURIComponent(projectId)}/analytics`,
  );
}

export async function fetchLiveAnalytics() {
  return adminFetchJson<LiveAnalyticsPayload>('/api/admin/analytics/live');
}
