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
2. Run **`supabase/schema.sql`** in the SQL Editor.
3. Run **`supabase/migration_project_fields.sql`** (website type + notes on projects).
4. **Storage:** bucket **`project-files`** (public read is simplest for download links).
5. Copy **URL**, **anon key**, **service role key** into Railway env.

**Done when:** Tables exist and bucket is created.

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

1. In Supabase **Authentication → Users**, add a user (email + password) **or** use **Sign up** if enabled.
2. Copy that user’s **UUID** from the users table in Auth.
3. Insert into **`public.users`** (see **`supabase/seed-admin.sql`**): same `id`, `email`, **`role = 'admin'`**.
4. Open **`/client-portal.html`**, sign in — you should land on **`admin.html`** (admins are redirected there).

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
