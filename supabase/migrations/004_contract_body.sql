-- Optional: run after 002. Adds contract body text for in-app drafting.
alter table public.agency_contracts add column if not exists body text;
