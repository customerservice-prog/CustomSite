-- One-off cleanup: duplicate Jordan Maxwell project + Nikki Cafe client/project.
-- Run in Supabase SQL Editor as postgres / service role session.
--
-- Targets:
--   DELETE (keep client 00fe1297-4b7b-4f18-9618-acc24e33a3f9): project 27960f6e-b08f-45da-a095-2ef02a67ad64
--   DELETE fully: Nikki project 2240ff51-604f-4e72-8f2c-0255e8f13569, client/auth 641d5b83-a73a-44af-ba74-4c571603c61f
-- Do NOT delete project 96138fd9-2dc5-4f8f-9470-7585381a7068.

BEGIN;

-- Optional: uncomment to fail fast if unexpected rows exist
-- DO $$ BEGIN
--   IF (SELECT count(*) FROM public.projects) != 5 THEN RAISE EXCEPTION 'Adjust pre-check: expected 5 projects'; END IF;
-- END $$;

-- ---------------------------------------------------------------------------
-- STORAGE (orphan avoidance)
-- project-assets: uploads at "{project_id}/...", YouTube thumbs at "thumbnails/{project_id}/..."
-- project-files: admin uploads "{client_id}/{project_id}/..."
-- ---------------------------------------------------------------------------

DELETE FROM storage.objects
WHERE bucket_id = 'project-assets'
  AND (
    name LIKE '27960f6e-b08f-45da-a095-2ef02a67ad64/%'
    OR name LIKE 'thumbnails/27960f6e-b08f-45da-a095-2ef02a67ad64/%'
    OR name LIKE '2240ff51-604f-4e72-8f2c-0255e8f13569/%'
    OR name LIKE 'thumbnails/2240ff51-604f-4e72-8f2c-0255e8f13569/%'
  );

DELETE FROM storage.objects
WHERE bucket_id = 'project-files'
  AND name LIKE '641d5b83-a73a-44af-ba74-4c571603c61f/2240ff51-604f-4e72-8f2c-0255e8f13569/%';

-- Proxied caches: routes/youtubeThumbProxy stores video-thumbs as "{youtube_id}.jpg" (shared globally).
-- Only remove objects keyed to YouTube IDs that belong exclusively to projects we are deleting.
DELETE FROM storage.objects o
WHERE o.bucket_id = 'video-thumbs'
  AND EXISTS (
    SELECT 1
    FROM public.project_videos v
    WHERE v.project_id IN (
      '27960f6e-b08f-45da-a095-2ef02a67ad64'::uuid,
      '2240ff51-604f-4e72-8f2c-0255e8f13569'::uuid
    )
      AND o.name = concat(v.youtube_id::text, '.jpg')
      AND NOT EXISTS (
        SELECT 1
        FROM public.project_videos v2
        WHERE v2.youtube_id = v.youtube_id
          AND v2.project_id NOT IN (
            '27960f6e-b08f-45da-a095-2ef02a67ad64'::uuid,
            '2240ff51-604f-4e72-8f2c-0255e8f13569'::uuid
          )
      )
  );

-- ---------------------------------------------------------------------------
-- Jordan duplicate project only (FK children CASCADE from projects)
-- ---------------------------------------------------------------------------

DELETE FROM public.projects
WHERE id = '27960f6e-b08f-45da-a095-2ef02a67ad64';

-- ---------------------------------------------------------------------------
-- Nikki Cafe: unblock DELETE from auth.users (messages.sender_id is NOT NULL, no ON DELETE action)
-- ---------------------------------------------------------------------------

DELETE FROM public.messages
WHERE sender_id = '641d5b83-a73a-44af-ba74-4c571603c61f';

UPDATE public.project_updates
SET posted_by = NULL
WHERE posted_by = '641d5b83-a73a-44af-ba74-4c571603c61f';

UPDATE public.files
SET uploaded_by = NULL
WHERE uploaded_by = '641d5b83-a73a-44af-ba74-4c571603c61f';

DELETE FROM public.projects
WHERE id = '2240ff51-604f-4e72-8f2c-0255e8f13569';

DELETE FROM auth.users
WHERE id = '641d5b83-a73a-44af-ba74-4c571603c61f';

COMMIT;

-- Post-check (run after commit):
-- SELECT id, name, client_id FROM public.projects ORDER BY created_at;
-- SELECT id, email, role FROM public.users ORDER BY email;
-- Expected: 3 projects (55546683-..., 96138fd9-..., 00000000-0000-4000-8000-000000000002); 2 non-admin clients Jordan + Cestui placeholder.
