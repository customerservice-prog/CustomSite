-- Allow pipeline labels used by auto-advance hooks (site file + domain).
-- Existing rows may still use development/review; new transitions use in_progress/ready.

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (
    status IN (
      'discovery',
      'design',
      'development',
      'in_progress',
      'review',
      'ready',
      'live'
    )
  );

COMMENT ON COLUMN public.projects.status IS
  'Pipeline: discovery | design | development | in_progress | review | ready | live — in_progress/ready used by file+domain auto-advance.';
