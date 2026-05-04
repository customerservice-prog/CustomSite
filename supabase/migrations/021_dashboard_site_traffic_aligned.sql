-- Align dashboard pageview aggregates with GET /api/admin/projects/:id/analytics (since launched_at cutoff)
-- and expose today's UTC rollup on project cards without N parallel fetches.

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
  pageviews_today bigint,
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
  COALESCE(pv_today.cnt, 0)::bigint,
  COALESCE(pv_live.cnt, 0)::bigint,
  fv.youtube_id
FROM ids i
LEFT JOIN public.projects pr ON pr.id = i.project_id
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
    AND (pr.launched_at IS NULL OR sp.viewed_at >= pr.launched_at)
) pv_total ON TRUE
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
    AND (pr.launched_at IS NULL OR sp.viewed_at >= pr.launched_at)
    AND ((sp.viewed_at AT TIME ZONE 'UTC')::date)
      = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day')::date
) pv_yest ON TRUE
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
    AND (pr.launched_at IS NULL OR sp.viewed_at >= pr.launched_at)
    AND ((sp.viewed_at AT TIME ZONE 'UTC')::date)
      = ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date)
) pv_today ON TRUE
LEFT JOIN LATERAL (
  SELECT count(DISTINCT visitor_id)::bigint AS cnt
  FROM public.site_pageviews sp
  WHERE sp.project_id = i.project_id
    AND sp.viewed_at > now() - interval '5 minutes'
    AND sp.visitor_id IS NOT NULL
    AND sp.visitor_id <> ''
) pv_live ON TRUE;
$$;
