-- Video health probe (thumbnail dimensions) distinct from legacy `status` / oEmbed checks.

ALTER TABLE public.project_videos
  ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'unchecked';

ALTER TABLE public.project_videos
  ADD COLUMN IF NOT EXISTS health_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN public.project_videos.health_status IS 'Thumbnail probe via mqdefault.jpg: unchecked | ok | unavailable';
COMMENT ON COLUMN public.project_videos.health_checked_at IS 'When mqdefault thumbnail was last classified';
