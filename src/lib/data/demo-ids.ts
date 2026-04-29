/**
 * Stable demo UUIDs for seeded client + project.
 * Postgres `site_files.project_id` is uuid — short ids like `pef1` break template init.
 * For Site builder against Supabase, ensure a `projects` row exists with `DEMO_PROJECT_ID`
 * (create via Admin → Projects, or insert matching your schema).
 */
export const DEMO_CLIENT_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_PROJECT_ID = '00000000-0000-4000-8000-000000000002';
