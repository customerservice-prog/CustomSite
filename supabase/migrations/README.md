# CustomSite database setup

Run these in the **Supabase** project → **SQL** → **New query**, in order:

1. `001_core.sql` — `users`, `leads`, `projects`, `site_files`, `messages`, etc.
2. `002_admin_overhaul.sql` — activity log, time entries, contracts, extra user/invoice fields.
3. `003_site_builder_railway.sql` — site builder + Railway fields on `projects` and `site_files`.
4. `004_contract_body.sql` — optional `body` text column on `agency_contracts` for in-app proposal drafting.

After SQL succeeds:

- Create a Storage bucket named `project-files` (optional; used for file uploads) with appropriate policies if you want public file URLs.
- In **Authentication → Users**, add your user, then in **Table Editor → `public.users`**, add a row with the same `id` as the auth user and `role = 'admin'`, or use the example in `../seed-admin.sql`.

The site also links to **docs/LAUNCH-PHASES.md** for environment variables and Railway. Environment variables in Railway should match this Supabase project `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
