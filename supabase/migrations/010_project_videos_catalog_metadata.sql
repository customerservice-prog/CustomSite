-- Multi-source catalogs (channel vs podcast playlists) + HTML sync metadata.

ALTER TABLE public.project_videos
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'best_of_jm',
  ADD COLUMN IF NOT EXISTS episode_number INT,
  ADD COLUMN IF NOT EXISTS playlist_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_videos_source_check'
  ) THEN
    ALTER TABLE public.project_videos
      ADD CONSTRAINT project_videos_source_check
      CHECK (source IN ('best_of_jm', 'podcast', 'custom'));
  END IF;
END $$;

COMMENT ON COLUMN public.project_videos.category IS 'Site filter key from HTML data-category (e.g. podcast, religion, power)';
COMMENT ON COLUMN public.project_videos.source IS 'Provenance for analytics: best_of_jm | podcast | custom';
COMMENT ON COLUMN public.project_videos.episode_number IS 'Optional numeric episode index from HTML data-episode';
COMMENT ON COLUMN public.project_videos.playlist_id IS 'YouTube playlist id when the clip belongs to a known series';

CREATE INDEX IF NOT EXISTS project_videos_project_source_idx
  ON public.project_videos (project_id, source);
