-- Community board for client sites (e.g. cestuiquevietrust.com/debate.html)
-- Apply to project awpmraducedwbabeunxl via Supabase SQL Editor or migrate.

CREATE TABLE IF NOT EXISTS public.debate_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT 'Anonymous',
  author_initial text NOT NULL DEFAULT 'A',
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debate_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.debate_posts(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  author_initial text NOT NULL DEFAULT 'A',
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debate_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_posts" ON public.debate_posts;
DROP POLICY IF EXISTS "public_insert_posts" ON public.debate_posts;
DROP POLICY IF EXISTS "public_update_posts" ON public.debate_posts;
DROP POLICY IF EXISTS "public_read_comments" ON public.debate_comments;
DROP POLICY IF EXISTS "public_insert_comments" ON public.debate_comments;
DROP POLICY IF EXISTS "public_update_comments" ON public.debate_comments;

CREATE POLICY "public_read_posts" ON public.debate_posts FOR SELECT USING (true);
CREATE POLICY "public_insert_posts" ON public.debate_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_posts" ON public.debate_posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_read_comments" ON public.debate_comments FOR SELECT USING (true);
CREATE POLICY "public_insert_comments" ON public.debate_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_comments" ON public.debate_comments FOR UPDATE USING (true) WITH CHECK (true);

-- Optional: enable Realtime in Dashboard → Database → Publications → supabase_realtime
-- and add public.debate_posts and public.debate_comments, or run once (ignore if already member):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_posts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.debate_comments;
