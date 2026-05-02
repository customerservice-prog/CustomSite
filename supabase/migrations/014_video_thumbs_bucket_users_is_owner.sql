-- Cached YouTube thumbnails (public read) + platform owner flag on client users row.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_owner IS 'House / platform-owner account — exclude from invoice revenue KPIs when true (role stays client unless admin).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbs',
  'video-thumbs',
  true,
  2097152,
  ARRAY['image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
    allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

DROP POLICY IF EXISTS "video_thumbs_public_select" ON storage.objects;
CREATE POLICY "video_thumbs_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'video-thumbs');
