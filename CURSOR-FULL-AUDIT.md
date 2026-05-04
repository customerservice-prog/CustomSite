# CURSOR-FULL-AUDIT.md

**TO:** Cursor AI  
**FROM:** Claude (full system audit, May 4 2026)  
**RE:** Every bug, missing feature, broken site, and improvement across CustomSite / Studio Pulse

This is the master audit file. Fix everything in the order listed.

**Priority:** CRITICAL → HIGH → MEDIUM → LOW  

---

## PART 1 — CRITICAL: CLIENT SITES THAT ARE DOWN OR BROKEN

### 1.1 theeyeisi.com — SITE COMPLETELY DOWN (Railway 404)

**Status:** Returns Railway's "The train has not arrived at the station" 404 page  
**Root cause:** Railway's `custom_domain` entry for `theeyeisi.com` either expired, was removed, or Railway hit the 20-domain custom domain limit and this domain fell off. The project "The Eye Is I" has site files saved (10 pages) but nothing is serving them.

**Fix — two-part:**

**Part A:** Cloudflare proxy (bypass Railway domain limit permanently)

1. In Cloudflare DNS for `theeyeisi.com`, add an A record pointing to Railway's IP (or a CNAME pointing at your Railway app's `.railway.app` subdomain)
2. Set the proxy status to ORANGE (proxied through Cloudflare)
3. In Railway project settings, remove `theeyeisi.com` from Custom Domains
4. Add `CUSTOMSITE_DOMAIN_PROJECT_MAP` Railway env var entry:  
   `theeyeisi.com|<THE_EYE_IS_I_PROJECT_UUID>`  
   (get UUID from Supabase `projects` table where name = 'The Eye Is I')

**Part B:** The `clientDomainSiteMiddleware` already handles this correctly — it reads `CUSTOMSITE_DOMAIN_PROJECT_MAP` and routes the host to the right project. No code change needed.

**This affects revenue.** Fix today.

---

### 1.2 thesoulvault.org — SITE DOWN ("Service Unavailable")

**Status:** HTTP 503 Service Unavailable  
**Project:** "The Soul Vault" — listed under client "The Eye Is I" in admin

**Fix:** Same Cloudflare proxy approach as 1.1 above. Add to `CUSTOMSITE_DOMAIN_PROJECT_MAP`:

`thesoulvault.org|<THE_SOUL_VAULT_PROJECT_UUID>`

Also check: this project's `custom_domain` in Supabase may be set to a wrong value.

In Supabase:

`UPDATE projects SET custom_domain = 'thesoulvault.org' WHERE name = 'The Soul Vault'`

---

### 1.3 jordanmaxwell.org — SITE RETURNING ERROR PAGE

**Status:** Browser shows error page (not a standard HTTP 404, likely SSL or DNS misconfiguration)  
**Project:** "Official Website Rebuild" — Jordan Maxwell Official

**Fix:**

1. Check Railway: is `jordanmaxwell.org` in the Railway custom domains list?
2. If not, add to `CUSTOMSITE_DOMAIN_PROJECT_MAP`:  
   `jordanmaxwell.org|<JORDAN_MAXWELL_PROJECT_UUID>`
3. Verify SSL certificate is provisioned in Railway or Cloudflare

---

### 1.4 ustaxcode.com — DOMAIN PARKED (Afternic for sale)

**Status:** Domain redirects to `afternic.com/forsale/ustaxcode.com`  
**Project:** "US Tax Code" — has 9 pages of site files saved

**Root cause:** The domain `ustaxcode.com` was apparently not renewed or was sold. This project's site is completely inaccessible to the public.

**Fix options:**

- **Option A:** Re-purchase `ustaxcode.com` (check GoDaddy/Afternic buyout price)
- **Option B:** Set up the site on a subdomain (e.g., `ustaxcode.customsite.online`) via staging
- **Option C:** Set a new domain and update `custom_domain` in Supabase

**Tell Bryan:** `ustaxcode.com` domain is no longer yours — it is listed for sale on Afternic.

---

### 1.5 cestuiquevietrust.com — JS SYNTAX ERROR IN PRODUCTION

**Status:** Site loads but has `SyntaxError: Illegal return statement` at line ~570  
**Impact:** Any JavaScript functionality on the site (forms, animations, counters) may silently fail

**Fix:**

1. Navigate to: Admin → Projects → The Cestui Files → Studio → script.js
2. Find line ~570 — there is a `return` statement outside a function (bare `return` at top level)
3. Wrap in a function or remove the bare `return`

Likely pattern to find and fix:

```js
// BROKEN — bare return at top level
someSetup();
return; // ← this is the illegal return

// FIX — wrap in an IIFE or remove the return
(function () {
  someSetup();
  return; // now valid inside a function
})();
```

In `routes/siteBuilder.js` or wherever site files are saved, add a lint step:

```js
// In lib/validateSiteJs.js (create this file)
function hasIllegalReturn(jsSource) {
  const lines = jsSource.split('\n');
  let depth = 0;
  for (const line of lines) {
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth === 0 && /^\s*return\b/.test(line)) return true;
  }
  return false;
}
module.exports = { hasIllegalReturn };
```

---

## PART 2 — CRITICAL: AI BUILDER HAS NO ANTHROPIC API KEY SET

**File:** Railway environment variables  

**Status:** `ANTHROPIC_API_KEY` is NOT set on Railway. The AI Builder UI itself says production needs the key so Bryan the Brain generates real pages (Claude); without it, fallback to mock/template preview.

**Historical note:** The codebase uses `lib/aiBuilder/generateWithClaude.js` and `POST .../rbyan/generate` (not necessarily `lib/aiGenerate.js` — verify routes when wiring docs).

**Fix Step 1 — Set the env var on Railway:**

`ANTHROPIC_API_KEY=sk-ant-...`

**Fix Step 2:** Premium starters live in `lib/siteTemplates.js` (see CURSOR-TEMPLATES-FIX.md).

**Fix Step 3 — Verify the route is wired:**

In `routes/siteBuilder.js`, confirm the AI generation endpoint calls the Claude helper (e.g. `generateSiteWithClaude`). Model configurable via `ANTHROPIC_MODEL` env var.

---

## PART 3 — HIGH: LOCAL SEO HUB (`theeyeisi.com/local-seo.html`) IS MANUAL-ONLY

**Status:** Stores data in browser `localStorage` only unless rebuilt per SEO-HUB-REBUILD.md.

**Summary:**

- Supabase tables: `seo_rankings`, `seo_citations`, `seo_reviews`, `seo_competitors`, `seo_reports`
- Cron: rankings, citations, reviews, report generation
- Admin UI: replace localStorage with Supabase, sync buttons, badges

**Env vars (Railway):** `SERPAPI_KEY`, Google Places / GBP OAuth as applicable.

See **SEO-HUB-REBUILD.md** at repo root for full spec.

---

## PART 4 — HIGH: DOMAIN ROUTING LIMIT

All Railway custom domains that hit the limit should move to Cloudflare proxy + `CUSTOMSITE_DOMAIN_PROJECT_MAP`. See **DOMAIN-MIGRATION.md**.

**Quick summary:**

`CUSTOMSITE_DOMAIN_PROJECT_MAP=theeyeisi.com|UUID1,thesoulvault.org|UUID2,...`

Keep on Railway custom domains: `customsite.online`, `www.customsite.online` (per your ops policy).

---

## PART 5 — HIGH: ADMIN DASHBOARD — BUGS AND MISSING FEATURES

### 5.1 Calendar stuck on April 2026

**Location:** `/admin.html#/calendar`  

**Fix:** Initialize month from current date, not `new Date('2026-04-01')` — locate calendar component (`Calendar.jsx` or equivalent) and use `new Date(now.getFullYear(), now.getMonth(), 1)`.

### 5.2 Invoices — Stripe not connected

Wire Settings → Billing → Stripe Connect; env: `STRIPE_SECRET_KEY`, webhooks, etc.

### 5.3 Messages — empty / no welcome flow

On project creation: welcome email + default thread/message (pseudo-code in audit).

### 5.4 Tasks — seed default tasks

Insert `DEFAULT_TASKS` array on project create.

### 5.5 Notifications bell — no panel

Implement `GET /api/dashboard/notifications` (or similar) + UI dropdown/slide-over.

### 5.6 Settings → Integrations — placeholders

Priority: Webhooks → Calendly; defer Workspace/QuickBooks if needed.

### 5.7 Settings → Security — MFA UI only

Wire Supabase MFA / enforcement when `require_mfa` is set.

### 5.8 Settings → Notifications — no email

Persist prefs in `agency_settings`; invoice events via Resend/SendGrid; Slack digest optional.

### 5.9 Dashboard Priority List links

Deep-link actions to `#/projects/<UUID>/site` / overview as specified.

### 5.10 Clients table — placeholder names

Require client name + email on new project; migration/edit UX for legacy rows.

### 5.11 Quick create

Ensure same minimum fields before save.

---

## PART 6 — HIGH: PROJECT STUDIO

### 6.1 Preview iframe / builder debug / multiple iframes

Review preview headers (`X-Frame-Options`, `CSP frame-ancestors`) for `/preview/` paths only.

### 6.2 Publish — domain validation

Block or warn publish if `custom_domain` unset; modal toward Hosting settings.

### 6.3 Copy site / Import site

Verify ZIP and deep-copy behavior; add progress UI.

### 6.4 Site analytics zeros

Set `launched_at` on publish; verify tracking middleware gates.

### 6.5 All projects Planning / $0

Verify `PATCH` status updates propagate to UI and workflow.

---

## PART 7 — MEDIUM: MARKETING SITE

### 7.1 Hardcoded kickoff date on homepage

Dynamic from `agency_settings` or remove specific date copy.

### 7.2 Before/after slider — mobile touch events

Ensure `touchmove` / passive listeners.

### 7.3 Portfolio demo links

Confirm demo URLs exist or remove from portfolio/sitemap.

### 7.4 Contact form — delivery confirmation + fallback

Try/catch email; optionally persist to Supabase when SMTP fails.

---

## PART 8 — MEDIUM: LOCAL SEO DOMAIN PAGES

### 8.1 Cal.com CTAs dead

Point Syracuse/CNY pages to `https://customsite.online/contact.html` (or current contact URL).

### 8.2 Placeholder reviews / 4.9 claim

Either wire GBP reviews or soften unverified numerical claims.

---

## PART 9 — MEDIUM: CLIENT PORTAL

Checklist: deliverables, invoices visible, welcome message, progress/stage accuracy, quote link to contact.

---

## PART 10 — LOW: BACKEND / SERVER

### 10.1 Rate limiting

`express-rate-limit` on `/api/contact`, `/api/auth`, etc.

### 10.2 JSON body limit

Stricter default; 10mb only for site-save routes.

### 10.3 `ADMIN_HTML_AT_ROOT` documentation

Document in README / DOMAIN-MIGRATION.md.

### 10.4 www vs apex DNS guidance

Document to avoid redirect loops.

### 10.5 `/api/broadcast` stub

Remove or implement Supabase realtime relay.

---

## PART 11 — SUMMARY TABLE

| # | Area | Issue | Severity | Status |
|---|------|--------|----------|--------|
| 1.1 | theeyeisi.com | Site DOWN — Railway 404 | CRITICAL | Ops / env |
| 1.2 | thesoulvault.org | Site DOWN — 503 | CRITICAL | Ops / env |
| 1.3 | jordanmaxwell.org | Error page | CRITICAL | Ops / env |
| 1.4 | ustaxcode.com | Domain parked/sold | CRITICAL | Notify Bryan |
| 1.5 | cestuiquevietrust.com | JS SyntaxError ~570 | CRITICAL | Site content |
| 2 | AI Builder | No `ANTHROPIC_API_KEY` on Railway | CRITICAL | Env var |
| 3 | Local SEO Hub | localStorage only | HIGH | See SEO-HUB-REBUILD.md |
| 4 | Domain routing | Railway 20-domain limit | HIGH | DOMAIN-MIGRATION.md |
| 5.1 | Calendar | Stuck April 2026 | HIGH | Code |
| 5.2 | Invoices/Stripe | Not connected | HIGH | Stripe |
| 5.3 | Messages | Empty, no welcome | HIGH | Backend |
| 5.4 | Tasks | No defaults | MEDIUM | Backend |
| 5.5 | Notifications bell | No UI | HIGH | Feature |
| 5.6 | Integrations | Placeholders | MEDIUM | Feature |
| 5.7 | MFA toggle | UI only | MEDIUM | Auth |
| 5.9 | Dashboard priority | Deep-link Studio | MEDIUM | Code |
| 5.10 | Client names | Slugified | HIGH | UX |
| 6.2 | Publish | No domain check | MEDIUM | Code |
| 6.4 | Analytics | `launched_at` | HIGH | Code |
| 7.1 | Homepage | Hardcoded date | LOW | Content |
| 7.4 | Contact | Email fallback | MEDIUM | Backend |
| 8.1 | Local SEO CTAs | Cal.com | MEDIUM | HTML |
| 10.1 | Backend | No rate limit | MEDIUM | server.js |

---

## PART 12 — WHAT IS WORKING WELL (DO NOT BREAK)

- `customsite.online` marketing homepage, pricing, client portal shell, admin SPA load/navigation  
- Studio: editor, preview, save, deploy (core loop)  
- `clientDomainSiteMiddleware` — domain routing, staging, MIME, injections  
- `CUSTOMSITE_DOMAIN_PROJECT_MAP` escape hatch  
- Local SEO static pages structure  
- Project list / clients list / settings tabs (UI shells)  
- AI Builder UI polish — needs Railway key + Claude path enabled  

---

## PART 13 — IMMEDIATE ACTION ORDER FOR CURSOR

1. Set **`ANTHROPIC_API_KEY`** on Railway (ops)  
2. Fix **Cestui** `script.js` illegal top-level `return` (~570) — in deployed site files  
3. Set **`CUSTOMSITE_DOMAIN_PROJECT_MAP`** for down sites (ops)  
4. Fix **Calendar** initial `useState` month → current date  
5. Set **`launched_at` on Publish** for analytics  
6. **Default tasks** on project create  
7. **Notification bell** + alerts API  
8. **Stripe Connect** in Billing  
9. **Auto-welcome message** on project create  
10. **Tell Bryan** `ustaxcode.com` Afternic situation  

---

*Last updated: May 4, 2026*  
*Related docs referenced: DOMAIN-MIGRATION.md, SEO-HUB-REBUILD.md, CURSOR-TEMPLATES-FIX.md, premium templates in lib/siteTemplates.js, AI path in lib/aiBuilder/*

---

## Summary

**Sites down / broken (ops + content):** theeyeisi.com, thesoulvault.org, jordanmaxwell.org; ustaxcode.com domain parked; Cestui `script.js` syntax error near line 570.  

**AI Builder:** Wire `ANTHROPIC_API_KEY` on Railway; code path uses `lib/aiBuilder` — verify routes.  

**Admin gaps:** Stripe, calendar month init, notifications, seeded tasks/messages, priority deep-links, client naming hygiene.  

**Follow listed doc files** for domain migration and SEO hub rebuild scopes.
