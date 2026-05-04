'use strict';

/**
 * Google Business Profile (My Business) API integration requires OAuth2 per account.
 * Placeholder: returns skipped until tokens + account wiring exist.
 *
 * When implemented, verify: photos, description length, hours, services, posts in last 7 days;
 * upsert into `seo_gbp_snapshots` and drive auto-checklist (gbp_* keys).
 */
async function collectGbpSignalsForProject(_supabase, seoRow) {
  const tok = process.env.GOOGLE_GMB_ACCESS_TOKEN || process.env.GOOGLE_BUSINESS_REFRESH_TOKEN || '';
  if (!String(tok).trim()) {
    return { skipped: true, reason: 'GMB OAuth not configured (set GOOGLE_GMB_ACCESS_TOKEN when ready)' };
  }
  /** Reserved for future OAuth HTTP calls — avoid failing cron if token is bogus. */
  void seoRow;
  return { skipped: true, reason: 'GMB signal parser not wired yet — token detected but importer disabled' };
}

module.exports = { collectGbpSignalsForProject };
