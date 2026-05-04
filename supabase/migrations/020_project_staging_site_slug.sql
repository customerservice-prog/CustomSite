-- Subdomain bucket for client sites before a real custom domain (see CUSTOMSITE_STAGING_SITES_HOST).
-- Example: acme.sites.yourplatform.com → projects.staging_site_slug = 'acme'

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS staging_site_slug text;

COMMENT ON COLUMN public.projects.staging_site_slug IS
  'Single DNS label; full host is {slug}.{CUSTOMSITE_STAGING_SITES_HOST}. Unique when set.';

CREATE UNIQUE INDEX IF NOT EXISTS projects_staging_site_slug_lower_uq
  ON public.projects (lower(btrim(staging_site_slug)))
  WHERE staging_site_slug IS NOT NULL AND btrim(staging_site_slug) <> '';
