-- Local SEO Hub — profiles, checklist progress, automated snapshots (Studio Pulse backend).

CREATE TABLE IF NOT EXISTS public.seo_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gbp_place_id TEXT,
  gbp_name TEXT,
  gbp_category TEXT,
  primary_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',
  near_me_keywords TEXT[] DEFAULT '{}',
  target_city TEXT,
  review_goal INTEGER NOT NULL DEFAULT 50,
  review_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

COMMENT ON TABLE public.seo_projects IS 'One local-SEO profile per agency project — GBP linkage, keywords, goals.';

CREATE TABLE IF NOT EXISTS public.seo_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  auto_detected BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, check_id)
);

CREATE INDEX IF NOT EXISTS seo_checklist_progress_project_idx
  ON public.seo_checklist_progress(project_id);

CREATE TABLE IF NOT EXISTS public.seo_review_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  review_count INTEGER,
  avg_rating NUMERIC(3, 2),
  snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  source TEXT NOT NULL DEFAULT 'google',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS seo_review_snapshots_project_date_desc_idx
  ON public.seo_review_snapshots(project_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS public.seo_rank_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  map_pack_position INTEGER,
  local_pack_url TEXT,
  snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  source TEXT NOT NULL DEFAULT 'dataforseo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, keyword, snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS seo_rank_snapshots_project_date_desc_idx
  ON public.seo_rank_snapshots(project_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS public.seo_gbp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  has_photos BOOLEAN,
  photo_count INTEGER,
  has_description BOOLEAN,
  has_hours BOOLEAN,
  has_services BOOLEAN,
  has_posts_recent BOOLEAN,
  post_count_30d INTEGER,
  snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS seo_gbp_snapshots_project_date_desc_idx
  ON public.seo_gbp_snapshots(project_id, snapshot_date DESC);

ALTER TABLE public.seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_review_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_rank_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_gbp_snapshots ENABLE ROW LEVEL SECURITY;

-- No JWT policies: server uses service_role only for these writes/reads.
