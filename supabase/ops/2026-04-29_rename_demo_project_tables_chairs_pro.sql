-- One-off: align demo builder project display name with public brand (optional).
-- Run in Supabase SQL Editor if the row still shows the old internal label.

UPDATE public.projects
SET name = 'Tables & Chairs Pro'
WHERE id = '00000000-0000-4000-8000-000000000002';
