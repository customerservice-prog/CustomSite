'use strict';

require('../lib/env');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { runArchiveCycle } = require('../lib/videoArchive/runArchiveCycle');

(async () => {
  if (!isSupabaseConfigured()) {
    console.error('[archive-videos] SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.');
    process.exitCode = 1;
    return;
  }
  const summary = await runArchiveCycle(getService(), {
    checkOnly: /^1|true$/i.test(String(process.env.VIDEO_ARCHIVE_CHECK_ONLY || '')),
  });
  if (summary.error) {
    console.error('[archive-videos]', summary.error);
    process.exitCode = 1;
    return;
  }
  console.log('[archive-videos] done:', summary);
  process.exit(0);
})().catch((e) => {
  console.error('[archive-videos]', e);
  process.exitCode = 1;
});
