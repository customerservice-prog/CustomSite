-- Public asset bucket for Site Builder uploads (logos, media). Service role bypasses RLS for API uploads.
-- Run in Supabase SQL editor. Safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
    allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

DROP POLICY IF EXISTS "project_assets_public_select" ON storage.objects;
CREATE POLICY "project_assets_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-assets');
