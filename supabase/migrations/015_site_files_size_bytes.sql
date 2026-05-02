-- File list metadata without fetching full content; kept in sync by trigger.

ALTER TABLE public.site_files
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

COMMENT ON COLUMN public.site_files.size_bytes IS 'octet_length of text content — admin file list bandwidth';

UPDATE public.site_files
SET size_bytes = octet_length(COALESCE(content, ''))
WHERE size_bytes IS NULL;

CREATE OR REPLACE FUNCTION public.site_files_set_size_bytes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.size_bytes := octet_length(NEW.content::text);
  ELSE
    NEW.size_bytes := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_files_size_bytes ON public.site_files;
CREATE TRIGGER trg_site_files_size_bytes
  BEFORE INSERT OR UPDATE OF content ON public.site_files
  FOR EACH ROW
  EXECUTE PROCEDURE public.site_files_set_size_bytes();
