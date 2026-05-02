-- The Cestui Files — attach production apex so traffic matches Host header in clientDomainSite middleware.
-- Run in Supabase SQL Editor after DNS targets Railway.

UPDATE public.projects
SET custom_domain = 'cestuiquevietrust.com'
WHERE id = '55546683-c4f1-419c-a2d4-b35378679537'::uuid;

-- Optional: verify
-- SELECT id, name, custom_domain FROM public.projects WHERE id = '55546683-c4f1-419c-a2d4-b35378679537'::uuid;
