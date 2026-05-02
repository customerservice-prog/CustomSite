-- Optional publish/SEO columns for per-domain injection (dashboard + domain router).
-- Safe to re-run.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS seo_title text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS seo_description text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS og_image_url text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS google_verify_code text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS noindex boolean DEFAULT false;

COMMENT ON COLUMN public.projects.seo_title IS 'Default OG/title fragment for custom-domain HTML injection.';
COMMENT ON COLUMN public.projects.seo_description IS 'Default meta description for custom-domain injection.';
COMMENT ON COLUMN public.projects.og_image_url IS 'Default OG image absolute URL.';
COMMENT ON COLUMN public.projects.google_verify_code IS 'Search Console verification content value.';
COMMENT ON COLUMN public.projects.noindex IS 'When true, serve noindex robots + meta on custom domains.';
