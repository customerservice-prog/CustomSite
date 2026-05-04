-- Link public contact / site-form submissions to owning project for filtering and richer UI.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_project_id_idx ON public.leads (project_id);
CREATE INDEX IF NOT EXISTS leads_project_created_idx ON public.leads (project_id, created_at DESC);

COMMENT ON COLUMN public.leads.project_id IS 'Hosting project when submission came from a client site (/api/contact or /api/forms/:id/submit).';
