-- Run in Supabase SQL Editor (once per project).
-- After: create Storage bucket "project-files" (public read recommended for file_url).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  service_type text,
  budget text,
  timeline text,
  message text not null,
  current_url text,
  status text not null default 'New',
  created_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('New', 'Contacted', 'Proposal Sent', 'Closed Won', 'Closed Lost'))
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  company text,
  role text not null default 'client',
  created_at timestamptz not null default now(),
  constraint users_role_check check (role in ('client', 'admin'))
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  status text not null default 'discovery',
  created_at timestamptz not null default now(),
  launched_at timestamptz,
  constraint projects_status_check check (status in ('discovery', 'design', 'development', 'review', 'live'))
);

create index if not exists projects_client_id_idx on public.projects (client_id);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  posted_by uuid references public.users (id)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.users (id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.users (id) on delete set null,
  customer_email text,
  amount numeric not null,
  description text,
  status text not null default 'pending',
  due_date date,
  stripe_payment_id text,
  created_at timestamptz not null default now(),
  constraint invoices_status_check check (status in ('pending', 'paid', 'overdue'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id uuid not null references public.users (id),
  content text not null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);

create index if not exists messages_project_id_idx on public.messages (project_id);

alter table public.leads enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.files enable row level security;
alter table public.invoices enable row level security;
alter table public.messages enable row level security;

-- Service role bypasses RLS; anon key should not access these tables from the browser without policies.
-- Optional: add policies for direct client access later.
