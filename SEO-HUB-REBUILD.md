# Local SEO Hub — rebuild (Studio Pulse + Supabase)

This document captures the **product spec** for the Local SEO Hub and the **implementation status** in this repo (`CustomSite` / Studio Pulse).

## What changed (implemented)

| Area | Details |
|------|---------|
| **Database** | `supabase/migrations/022_seo_hub_tables.sql` — `seo_projects`, `seo_checklist_progress`, `seo_review_snapshots`, `seo_rank_snapshots`, `seo_gbp_snapshots` (RLS enabled; server uses service role). |
| **Admin API** | `routes/seoHub.js` mounted under `/api/admin`: `GET /seo/:projectId`, `POST /seo/:projectId/setup`, `POST /seo/:projectId/checklist`, `GET /seo/:projectId/history`. |
| **Cron** | `POST /api/cron/seo-collect` in `routes/internalCron.js` — header `X-Cron-Secret` (= `CRON_SECRET`), requires `SEO_CRON_ENABLED=1`. Loops all `seo_projects` and runs collectors. |
| **Collectors** | `lib/seoHub/collectReviews.js` (Google Places Place Details — `rating`, `user_ratings_total`), `lib/seoHub/collectRankings.js` (DataForSEO Maps Live), `lib/seoHub/collectGbpSignals.js` (stub until OAuth wired), `lib/seoHub/applyAutoChecks.js` (auto checklist hints). |
| **Admin UI** | Hash route `#/seo-hub` — `src/pages/seo-hub-page.tsx`; nav item points in-app instead of `theeyeisi.com/local-seo.html`. Polls profile every **60s**. |

## Environment variables (Railway / `.env`)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Place Details for review count + avg rating |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Basic auth for DataForSEO Maps SERP Live |
| `GOOGLE_GMB_CLIENT_ID` / `GOOGLE_GMB_CLIENT_SECRET` | Reserved for future GBP API OAuth |
| `GOOGLE_GMB_ACCESS_TOKEN` | Optional future bearer for `collectGbpSignals` |
| `CRON_SECRET` | Shared secret for cron HTTP endpoints |
| `SEO_CRON_ENABLED` | Set to `1` to allow `/api/cron/seo-collect` |

## Cron scheduling (example)

- **Daily ~08:00 UTC** — hit `/api/cron/seo-collect` (reviews + rankings + stubs; same endpoint today; split schedules can be added later in Railway).
- **Weekly** — same endpoint if you prefer one job; cost is driven mainly by DataForSEO calls.

Request:

```http
POST /api/cron/seo-collect
X-Cron-Secret: <CRON_SECRET>
```

## Original spec — database (reference)

### `seo_projects`

One row per `projects.id`: GBP place id, keywords, city, review goal, review link, etc.

### `seo_checklist_progress`

`UNIQUE(project_id, check_id)` — manual + auto rows; `auto_detected` when set by cron logic.

### Snapshots

- **Reviews** — `UNIQUE(project_id, snapshot_date, source)` (e.g. `google`).
- **Ranks** — `UNIQUE(project_id, keyword, snapshot_date, source)` (e.g. `dataforseo`).
- **GBP** — `UNIQUE(project_id, snapshot_date)`.

## Auto-detectable checklist ids (current code)

| check_id | Source |
|----------|--------|
| `10_reviews` | `user_ratings_total >= 10` (Places) |
| `gbp_photos` | Latest `seo_gbp_snapshots` — `photo_count > 10` |
| `gbp_description` | `has_description` |
| `gbp_hours` | `has_hours` |
| `gbp_posts_recent` | `has_posts_recent` |
| `gbp_services` | `has_services` |
| `website_linked` | `seo_projects.review_link` non-empty |
| `rank_tracking_setup` | Any `seo_rank_snapshots` row exists |

Manual-only examples: `gbp_verified`, `nap_consistency`, `schema_markup`, `citations`, `backlinks`.

## Legacy static page

`theeyeisi.com/local-seo.html` (or other static files) can be **retired** for agency use once you rely on `#/seo-hub`. If you keep a static page for marketing, point its CTA at `https://<your-app>/admin.html#/seo-hub` for signed-in users.

## Quick wins (priority)

1. Run migration **022** in Supabase.
2. Set `GOOGLE_PLACES_API_KEY` and create an SEO profile per project (Place ID + keyword + city).
3. Enable `SEO_CRON_ENABLED=1` and schedule `POST /api/cron/seo-collect`.
4. Add DataForSEO credentials when ready for map-pack rows.

## Related

- File this doc next to any domain runbooks you maintain (e.g. `DOMAIN-MIGRATION.md` if present in your branch).
