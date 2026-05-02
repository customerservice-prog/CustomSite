-- AFFECTS EXISTING DATA: UUID-scoped UPDATE at end of file (Jordan Maxwell demo row only).
-- ROLLBACK: restore that project's columns from a backup snapshot if needed.

-- Dashboard truth fields + batch metrics RPC for agency project list/detail.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'planning';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS live_url text;

COMMENT ON COLUMN public.projects.published_at IS 'Set when production deploy succeeds (go-live anchor for analytics UI).';
COMMENT ON COLUMN public.projects.stage IS 'Coarse pipeline: planning | design | development | review | live | on_hold';
COMMENT ON COLUMN public.projects.thumbnail_url IS 'Project card thumbnail; optional YouTube mqdefault or uploaded asset URL.';
COMMENT ON COLUMN public.projects.live_url IS 'Canonical public URL shown in admin (https://…) — overrides inferred custom_domain URL when set.';

-- Batch metrics used by GET /api/admin/projects (avoid N+1).
CREATE OR REPLACE FUNCTION public.project_dashboard_metrics_batch(p_project_ids uuid[])
RETURNS TABLE (
  project_id uuid,
  last_studio_touch timestamptz,
  site_file_count integer,
  html_page_count integer,
  video_count integer,
  has_index_html boolean,
  has_css boolean,
  has_js boolean,
  pageviews_total bigint,
  pageviews_yesterday bigint,
  live_visitors bigint,
  first_youtube_id text
)
LANGUAGE sql
STABLE
AS $$
WITH ids AS (
  SELECT unnest(COALESCE(p_project_ids, ARRAY[]::uuid[])) AS project_id
)
SELECT
  i.project_id,
  sf.last_touch,
  COALESCE(sf.cnt, 0)::integer,
  COALESCE(sf.html_cnt, 0)::integer,
  COALESCE(pv.cnt, 0)::integer,
  COALESCE(sf.has_index, false),
  COALESCE(sf.has_css, false),
  COALESCE(sf.has_js, false),
  COALESCE(pv_total.cnt, 0)::bigint,
  COALESCE(pv_yest.cnt, 0)::bigint,
  COALESCE(pv_live.cnt, 0)::bigint,
  fv.youtube_id
FROM ids i
LEFT JOIN LATERAL (
  SELECT
    max(updated_at) AS last_touch,
    count(*)::integer AS cnt,
    count(*) FILTER (WHERE lower(path) LIKE '%.html')::integer AS html_cnt,
    bool_or(lower(path) = 'index.html') AS has_index,
    bool_or(lower(path) LIKE '%.css') AS has_css,
    bool_or(lower(path) LIKE '%.js') AS has_js
  FROM public.site_files
  WHERE site_files.project_id = i.project_id
) sf ON TRUE
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS cnt
  FROM public.project_videos
  WHERE project_videos.project_id = i.project_id
) pv ON TRUE
LEFT JOIN LATERAL (
  SELECT youtube_id::text
  FROM public.project_videos
  WHERE project_videos.project_id = i.project_id
  ORDER BY sort_order ASC NULLS LAST, created_at ASC
  LIMIT 1
) fv ON TRUE
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
) pv_total ON TRUE
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
    AND ((sp.viewed_at AT TIME ZONE 'UTC')::date)
      = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')::date
) pv_yest ON TRUE
LEFT JOIN LATERAL (
  SELECT count(DISTINCT visitor_id)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
    AND sp.viewed_at > now() - interval '5 minutes'
    AND sp.visitor_id IS NOT NULL
    AND sp.visitor_id <> ''
) pv_live ON TRUE;
$$;

-- Jordan Maxwell demo row (optional — safe no-op if id missing)
UPDATE public.projects
SET
  published_at = COALESCE(published_at, now()),
  stage = 'live',
  status = 'live',
  live_url = COALESCE(NULLIF(trim(live_url), ''), 'https://jordanmaxwell.org'),
  thumbnail_url = COALESCE(
    NULLIF(trim(thumbnail_url), ''),
    'https://img.youtube.com/vi/ZWDk8vWZ6Lg/mqdefault.jpg'
  ),
  launched_at = COALESCE(launched_at, now())
WHERE id = '96138fd9-2dc5-4f8f-9470-7585381a7068'::uuid;
