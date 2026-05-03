'use strict';

/**
 * Set projects.custom_domain for production routing (Host → site_files).
 * Normalizes the same way as the admin API (apex only, no protocol).
 *
 *   node scripts/set-project-custom-domain.js <project-uuid> syracusewebagency.com
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env at repo root via lib/env).
 */
require('../lib/env');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { normalizeCustomDomainHost } = require('../lib/normalizeCustomDomainHost');

async function main() {
  const projId = process.argv[2]?.trim();
  const rawHost = process.argv[3]?.trim();
  const host = normalizeCustomDomainHost(rawHost);
  if (!projId || !host) {
    console.error('Usage: node scripts/set-project-custom-domain.js <project-uuid> example.com');
    process.exitCode = 1;
    return;
  }
  if (!isSupabaseConfigured()) {
    console.error('[set-project-custom-domain] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
    process.exitCode = 1;
    return;
  }
  const supabase = getService();
  const { data, error } = await supabase
    .from('projects')
    .update({ custom_domain: host })
    .eq('id', projId)
    .select('id, name, custom_domain, live_url')
    .maybeSingle();
  if (error) {
    console.error('[set-project-custom-domain]', error.message);
    process.exitCode = 1;
    return;
  }
  if (!data) {
    console.error('[set-project-custom-domain] No row updated — check project UUID.');
    process.exitCode = 1;
    return;
  }
  console.log('[set-project-custom-domain] OK:', data);
  console.log('[set-project-custom-domain] Allow up to ~2 minutes for CustomSite domain cache, or restart the app.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
