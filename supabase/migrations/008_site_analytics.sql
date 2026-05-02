-- Anonymous page-level analytics on custom-domain client sites.

CREATE TABLE IF NOT EXISTS public.site_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  custom_domain TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  visitor_id TEXT,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_pageviews IS 'Anonymous page views — visitor_id is a short salted hash only; no IPs or identities stored.';
COMMENT ON COLUMN public.site_pageviews.visitor_id IS 'Non-reversible short hash(ip+ua)—not personally identifiable.';

CREATE INDEX IF NOT EXISTS site_pageviews_project_viewed_desc_idx ON public.site_pageviews(project_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS site_pageviews_domain_viewed_desc_idx ON public.site_pageviews(custom_domain, viewed_at DESC);

CREATE TABLE IF NOT EXISTS public.site_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pageviews INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id, date)
);

COMMENT ON TABLE public.site_analytics_daily IS 'Daily rollups of site_pageviews for fast dashboards.';

CREATE INDEX IF NOT EXISTS site_analytics_daily_project_date_desc_idx ON public.site_analytics_daily(project_id, date DESC);
