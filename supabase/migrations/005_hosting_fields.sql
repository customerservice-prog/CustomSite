-- Optional hosting + client fields (run in Supabase SQL Editor if you need them in production)
-- Safe to re-run: uses IF NOT EXISTS

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS live_domain text,
  ADD COLUMN IF NOT EXISTS domain_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS hosting_status text DEFAULT 'not_deployed',
  ADD COLUMN IF NOT EXISTS hosting_plan text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hosting_billing_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hosting_since date,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text;
