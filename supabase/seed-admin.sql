-- After creating an Auth user in Supabase Dashboard (Authentication → Users),
-- copy their UUID and email into the INSERT below, then run in SQL Editor.

-- Example (replace UUID and email):
-- insert into public.users (id, email, full_name, company, role)
-- values (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'you@yourdomain.com',
--   'Your Name',
--   'CustomSite',
--   'admin'
-- )
-- on conflict (id) do update set role = 'admin', email = excluded.email;

-- If the row already exists as client, promote to admin:
-- update public.users set role = 'admin' where email = 'you@yourdomain.com';
