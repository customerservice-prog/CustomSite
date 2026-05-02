-- Phase 2–4 extensions: visitor forms, snapshots, richer client profiles.
-- Safe to re-run where noted.

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  read_flag boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS form_submissions_project_idx ON public.form_submissions (project_id, submitted_at DESC);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.project_site_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  label text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_site_snapshots_project_idx ON public.project_site_snapshots (project_id, created_at DESC);

ALTER TABLE public.project_site_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text,
  ADD COLUMN IF NOT EXISTS brand_secondary_color text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS monthly_retainer_amount numeric;

COMMENT ON COLUMN public.projects.site_settings IS 'JSON: ga4_measurement_id, page_seo {...}, favicon_url, inject_head, etc.';
