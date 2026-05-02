-- Template: Bryan P platform owner + The Cestui Files reassignment (run manually in Supabase SQL).
-- Apply migration supabase/migrations/014_video_thumbs_bucket_users_is_owner.sql (or newer) before this.

-- -----------------------------------------------------------------------------
-- 1) Create Bryan P as a Supabase Auth user first (Dashboard → Authentication → Users
--    → Add user) OR via supabase auth admin API. Note the UUID (auth.users.id).

-- 2) Ensure `public.users` row exists with role client and is_owner = true:

-- INSERT INTO public.users (id, email, full_name, company, role, is_owner)
-- VALUES (
--   '<BRYAN_AUTH_USER_UUID>',
--   '<bryan@real-email.example>',
--   'Bryan P',
--   'CustomSite — Platform owner',
--   'client',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   company = EXCLUDED.company,
--   is_owner = true;

-- 3) Move The Cestui Files project to Bryan’s owner user (paste real UUIDs):

-- UPDATE public.projects SET client_id = '<BRYAN_AUTH_USER_UUID>' WHERE id = '55546683-c4f1-419c-a2d4-b35378679537';

-- 4) DO NOT DELETE placeholder clients from SQL until you verified the project opens
--    and invoices are sane. Optional cleanup after manual verification:

-- DELETE FROM public.users WHERE id = '317f4b73-16de-4e7b-957a-98912dd2da0e';

-- Jordan Maxwell projects stay on the paying Jordan client — do not reassign those.

-- -----------------------------------------------------------------------------
-- Production hostname → project (fixes “Site not found” when DNS already hits CustomSite):

-- UPDATE public.projects
-- SET custom_domain = 'cestuiquevietrust.com'
-- WHERE id = '55546683-c4f1-419c-a2d4-b35378679537';

-- Prefer apex hostname (no www.) — middleware 301-redirects www → apex before lookup.
