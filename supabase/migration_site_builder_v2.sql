-- Site builder: Railway deploy metadata, per-project site settings, binary-friendly files
-- Run in Supabase SQL editor after previous migrations.

alter table public.projects
  add column if not exists railway_url_staging text,
  add column if not exists railway_url_production text,
  add column if not exists railway_project_id_staging text,
  add column if not exists railway_project_id_production text,
  add column if not exists railway_service_id_staging text,
  add column if not exists railway_service_id_production text,
  add column if not exists custom_domain text,
  add column if not exists site_settings jsonb default '{}'::jsonb;

comment on column public.projects.site_settings is 'Per-site SEO, analytics, favicon, etc. (JSON)';

alter table public.site_files
  add column if not exists content_encoding text not null default 'utf8';

comment on column public.site_files.content_encoding is 'utf8 (plain text) or base64 (binary images)';

-- Application validates encoding; no strict DB check for easier migrations.
