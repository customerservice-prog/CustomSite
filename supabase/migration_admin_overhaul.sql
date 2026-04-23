-- Run in Supabase SQL Editor after previous migrations.
-- Extends users, invoices, and adds activity / time / contracts.

alter table public.users add column if not exists phone text;
alter table public.users add column if not exists website text;
alter table public.users add column if not exists timezone text;

alter table public.invoices add column if not exists project_id uuid references public.projects (id) on delete set null;
alter table public.invoices add column if not exists line_items jsonb;

create index if not exists invoices_project_id_idx on public.invoices (project_id);

create table if not exists public.agency_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists agency_activity_created_idx on public.agency_activity (created_at desc);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  hours numeric not null,
  description text,
  worked_date date not null default (current_date),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_project_idx on public.time_entries (project_id);

create table if not exists public.agency_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  status text not null default 'draft',
  file_url text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agency_contracts_status check (status in ('draft', 'sent', 'signed', 'void'))
);
create index if not exists agency_contracts_client_idx on public.agency_contracts (client_id);

alter table public.agency_activity enable row level security;
alter table public.time_entries enable row level security;
alter table public.agency_contracts enable row level security;
