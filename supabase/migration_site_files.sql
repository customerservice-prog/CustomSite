-- In-project website builder: HTML/CSS/JS stored per project (run after schema.sql)
create table if not exists public.site_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, path)
);

create index if not exists site_files_project_id_idx on public.site_files (project_id);

alter table public.site_files enable row level security;
