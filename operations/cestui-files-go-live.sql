-- The Cestui Files — production domain & status (customsite platform)
-- Project ID: 55546683-c4f1-419c-a2d4-b35378679537
-- Safe to tweak and run in Supabase SQL Editor once per environment.
-- If migration 012 (`stage`, `published_at`) is missing on your DB, omit those columns from UPDATE.
--
-- BEFORE: verify row exists and note current domain
--   SELECT id, name, status, custom_domain, live_url, launched_at, published_at, stage
--   FROM public.projects
--   WHERE id = '55546683-c4f1-419c-a2d4-b35378679537';
--
-- TRAFFIC: CustomSite matches Host to custom_domain (+ optional live_url fallback).
-- Middleware 301s www.<apex> -> apex unless CUSTOMSITE_SKIP_CLIENT_WWW_REDIRECT=1.
-- Paths index.html, videos.html, debate.html, etc. are served from site_files (see resolveSiteFilePath).
--
-- RAILWAY: After this UPDATE, register the hostname on the production Railway service:
--   - Site builder → Publish → "Register custom domain on Railway" (with www checkbox), OR
--   - operations/railway-attach-cestui-domain.ps1 with your admin JWT (server must have RAILWAY_API_TOKEN + railway_service_id_production on the project).

BEGIN;

UPDATE public.projects
SET
  custom_domain = 'cestiquevietrust.com',
  live_url = 'https://cestiquevietrust.com',
  status = 'live',
  launched_at = COALESCE(launched_at, NOW()),
  published_at = COALESCE(published_at, NOW()),
  stage = 'live'
WHERE id = '55546683-c4f1-419c-a2d4-b35378679537';

COMMIT;

-- AFTER: confirm
--   SELECT id, custom_domain, live_url, status, launched_at, published_at, stage
--   FROM public.projects
--   WHERE id = '55546683-c4f1-419c-a2d4-b35378679537';
