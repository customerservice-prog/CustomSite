'use strict';

/**
 * One-off: set production custom_domain for The Cestui Files.
 * Loads .env from repo root (same as server).
 *
 *   node scripts/apply-cestui-custom-domain.js
 */
require('../lib/env');
const { getService, isSupabaseConfigured } = require('../lib/supabase');

const PROJECT_ID = '55546683-c4f1-419c-a2d4-b35378679537';
const CUSTOM_DOMAIN = 'cestuiquevietrust.com';

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('[apply-cestui-custom-domain] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
    process.exitCode = 1;
    return;
  }
  const supabase = getService();
  const { data, error } = await supabase
    .from('projects')
    .update({ custom_domain: CUSTOM_DOMAIN })
    .eq('id', PROJECT_ID)
    .select('id, name, custom_domain')
    .maybeSingle();
  if (error) {
    console.error('[apply-cestui-custom-domain]', error.message);
    process.exitCode = 1;
    return;
  }
  if (!data) {
    console.error('[apply-cestui-custom-domain] No row updated — wrong PROJECT_ID or migration not applied.');
    process.exitCode = 1;
    return;
  }
  console.log('[apply-cestui-custom-domain] OK:', data);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
