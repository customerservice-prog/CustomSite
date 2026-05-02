-- Project-scoped YouTube catalog + backup thumbnails for client sites.

CREATE TABLE IF NOT EXISTS public.project_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  author_name TEXT,
  thumbnail_url TEXT,
  cached_thumbnail TEXT,
  duration TEXT,
  view_count TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_checked TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, youtube_id)
);

CREATE INDEX IF NOT EXISTS project_videos_project_id_idx ON public.project_videos(project_id);
CREATE INDEX IF NOT EXISTS project_videos_project_sort_idx ON public.project_videos(project_id, sort_order);

ALTER TABLE public.project_videos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.project_videos IS 'YouTube library per project — public read via Express /api/public/...';
