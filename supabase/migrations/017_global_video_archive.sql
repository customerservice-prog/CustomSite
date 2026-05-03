-- Global YouTube archive + metadata for client sites (e.g. The Cestui Files).
-- Create Storage bucket manually: name `video-archive`, public read recommended.
-- Paths: videos/{youtube_id}/video.mp4 (or yt-dlp ext), videos/{youtube_id}/thumb.jpg

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id text NOT NULL UNIQUE,
  title text,
  channel text,
  category text DEFAULT 'general',
  category_label text,
  description text,
  thumbnail_url text,
  video_url text,
  youtube_status text NOT NULL DEFAULT 'unknown'
    CHECK (youtube_status IN ('available', 'unavailable', 'unknown')),
  last_checked timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_cat_title_idx ON public.videos (
  category NULLS LAST,
  title NULLS LAST
);

COMMENT ON TABLE public.videos IS 'Site-wide mirrored YouTube library; category = UI slug (cqv,birth,...), category_label = section heading';
COMMENT ON COLUMN public.videos.youtube_status IS 'oEmbed heuristic: available | unavailable | unknown';

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
