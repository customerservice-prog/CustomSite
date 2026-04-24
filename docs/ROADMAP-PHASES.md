# CustomSite product roadmap (phased)

Work after **auth + database + static UI** (current baseline). Tackle in order; each phase is shippable.

## Phase A — Foundation (in progress)
- [x] Supabase session from email links; password reset page; public `/api/config/public`.
- [x] SQL migrations in `supabase/migrations/` + admin `GET /api/admin/db-health` warning.
- [x] Brand wordmarks in `images/` (SVG) sitewide.
- [ ] **Optional:** one-click migration runner (server-side, admin-only) — design required for safety.

## Phase B — “Sites” hub (admin)
- [ ] Add **Sites** as the first-class object: list sites (from projects), last edited, draft vs published, open builder.
- [ ] “New site” → template chooser → `site-builder.html` with project pre-selected.
- [ ] Per-site: duplicate, rename, custom domain field (UI only until DNS docs).

## Phase C — Site builder: visual editing
- [ ] Integrate a maintained block editor (e.g. **GrapesJS**, **Puck**, or **Craft.js**) in the **center pane**; generate HTML/CSS under the hood.
- [ ] 30+ blocks with thumbnails; global brand controls (colors, fonts, logo slot).
- [ ] Image drag-and-drop into blocks (and/or Storage upload flow).

## Phase D — Templates
- [ ] 12–20 real industry templates (not empty shells); real preview images (e.g. 1200×800).
- [ ] “Preview before choose” full-screen modal.
- [ ] Hide or gate “raw HTML” path behind **Developer mode**.

## Phase E — Admin UX
- [ ] **CRM mode** toggle: show/hide Time, Contracts, Invoices, etc. for “site builder only” users.
- [ ] Supabase **connected** status strip (green / red with fix link); better empty states with one primary CTA per tab.
- [ ] Search, filters, export CSV on kept tabs.

## Phase F — Deploy & ops
- [ ] Root `README` “Deploy in 5 minutes” with Railway env checklist (expand `README.md`).
- [ ] Railway template button or one-click `railway.toml` + documented vars.
- [ ] Optional **/setup** wizard (env check + link to run migrations).

## Phase G — Polish
- [ ] Sidebar admin layout, dashboard charts, empty-state illustrations, dark mode.
- [ ] Mobile pass on marketing, portal, admin (builder may stay desktop-only).

For **hosting, Supabase, email, and Stripe** order of operations, see [LAUNCH-PHASES.md](./LAUNCH-PHASES.md).
