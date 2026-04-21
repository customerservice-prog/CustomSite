-- Run after schema.sql (existing databases). New installs: also merged into schema.sql.
alter table public.projects add column if not exists website_type text;
alter table public.projects add column if not exists internal_notes text;

comment on column public.projects.website_type is 'e.g. business, ecommerce, landing, portfolio';
comment on column public.projects.internal_notes is 'Admin-only notes (stack, host, repo link)';
