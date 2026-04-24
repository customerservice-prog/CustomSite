# CustomSite — Launch & delivery (phased)

Follow in order. Each phase unlocks the next.

---

## Phase 1 — Hosting & runtime (Railway)

1. Repo connected; **Start command**: `npm start` (see `railway.toml`).
2. **Environment variables** set from `.env.example` (no secrets in git).
3. Deploy succeeds; public URL loads the marketing site.

**Done when:** `https://your-domain` shows the homepage without errors.

---

## Phase 2 — Database & storage (Supabase)

1. Create a Supabase project.
2. Run the migrations in order in the SQL editor: **`supabase/migrations/001_core.sql`**, then **`002_admin_overhaul.sql`**, then **`003_site_builder_railway.sql`** (see that folder’s `README.md`).  
   (Older docs referenced **`supabase/schema.sql`** — it matches `001_core.sql` for a fresh project.)
3. If you have an old database, also run legacy **`supabase/migration_project_fields.sql`** as needed.
4. **Storage:** bucket **`project-files`** (public read is simplest for download links).
5. Copy **URL**, **anon key**, **service role key** into Railway env.

**Done when:** Tables exist and bucket is created.

Also run **`supabase/migration_site_files.sql`** if you created the DB before the site builder existed (adds `site_files` if missing).

---

## Phase 2b — In-project site builder (HTML/CSS/JS)

1. After `site_files` exists, open **`/site-builder.html`** (admin only).
2. Pick a **project**, click **Init starter**, edit **`index.html` / `styles.css` / `app.js`**, **Save**.
3. **Staging preview:** `https://your-domain/preview/<project-uuid>/` (share with client from their dashboard **Open staging preview**).

This stores source in Postgres — not WordPress. For images, use external URLs or upload assets via **Admin → Quick actions → Upload file** and link them in HTML.

---

## Phase 3 — Email (Resend)

1. Verify sending domain in Resend.
2. Set **`RESEND_API_KEY`**, **`FROM_EMAIL`**, **`ADMIN_EMAIL`**.

**Done when:** contact form creates a lead and you receive the owner notification email.

---

## Phase 4 — Payments (Stripe)

1. Create **Products/Prices** for build packages; set **`STRIPE_PRICE_BUILD_*`** in Railway.
2. Set **`STRIPE_SECRET_KEY`** and webhook endpoint:  
   `https://your-domain/api/payments/webhook`  
   with **`STRIPE_WEBHOOK_SECRET`**.
3. Set **`PUBLIC_SITE_URL`** to your live URL.

**Done when:** test checkout completes (use Stripe test mode first).

---

## Phase 5 — First admin login

1. In Supabase **Authentication → URL configuration**, add redirect URLs: site root `https://your-domain/`, `https://your-domain/client-portal.html`, and `https://your-domain/reset-password.html` (password reset emails use the last one).
2. In Supabase **Authentication → Users**, add a user (email + password) **or** use **Sign up** if enabled.
3. **Profile row (optional manual step):** After first API request with a valid JWT, the app can **auto-create** a row in `public.users` for that account. Set **`BOOTSTRAP_ADMIN_EMAILS=you@domain.com`** (or **`INITIAL_ADMIN_EMAIL`**) in Railway / `.env` so the first sign-in gets **`role = admin`**. Otherwise the row defaults to `client` — then insert admin manually (see **`supabase/seed-admin.sql`**) or update the row in SQL.
4. Open **`/client-portal.html?agency=1`**, sign in — you should land on **`admin.html`** if the user is an admin.

**Done when:** you see the Admin panel (leads, clients, projects).

---

## Phase 6 — Deliver a client website (operations)

This app does **not** auto-generate HTML/CSS for arbitrary sites. You build the site in your stack (code, Webflow, WordPress, etc.). Use the backend to **run the engagement**:

| Step | Action |
|------|--------|
| 1 | **Lead** comes in from `/contact` or sales. |
| 2 | **Create client** (Admin → Create client) *or* **Convert lead** on a lead row. |
| 3 | **Create project** (type, phase, notes) for that client. |
| 4 | Move **phase** (Discovery → … → Live) as you work. |
| 5 | **Post updates** and **upload files** (mockups, exports, docs). |
| 6 | **Create invoice**; client pays via Stripe when you send them the flow you use. |
| 7 | Client uses **dashboard** for status, files, messages, invoices. |

**Done when:** one full client has portal access, a project, at least one update, and optional invoice.

---

## Phase 7 — Go-live checklist (client’s public site)

- DNS / SSL for **their** domain (often separate from `customsite.online`).
- Hosting for their static or CMS site (Netlify, Vercel, WP host, etc.).
- Set project phase to **live** and note launch in **updates**.

---

## Quick reference

| Page | Purpose |
|------|---------|
| `client-portal.html` | Login (clients + admins) |
| `admin.html` | Leads, clients, projects, invoices, files, messages |
| `dashboard.html` | Client view |
