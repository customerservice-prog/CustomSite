-- One-time fixes — run manually in Supabase SQL editor (your project ref).
--
-- 1) Demo builder UUID → friendly dashboard / API card name.
UPDATE public.projects
SET name = 'Tables & Chairs Pro'
WHERE id = '00000000-0000-4000-8000-000000000002'::uuid;

-- 2) Optional: attach production domain once DNS points at Railway (no https:// prefix).
--    Replace project id with your Cestui row UUID from GET /api/admin/projects.
-- UPDATE public.projects
-- SET custom_domain = 'cestiquevietrust.com'
-- WHERE id = 'YOUR_PROJECT_UUID_HERE'::uuid;

-- 3) Jordan Maxwell internal title → clearer display name (edit string to taste).
-- UPDATE public.projects
-- SET name = 'Jordan Maxwell — Official Website'
-- WHERE id = '96138fd9-2dc5-4f8f-9470-7585381a7068'::uuid;
