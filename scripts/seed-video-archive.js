'use strict';

/**
 * Upsert seeds from JSON (default data/cestui-videos.seed.json).
 * Override: VIDEO_ARCHIVE_SEED_PATH=/path/to/seed.json node scripts/seed-video-archive.js
 */
require('../lib/env');

const fs = require('fs');
const path = require('path');

const { getService, isSupabaseConfigured } = require('../lib/supabase');

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('[seed-video-archive] SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.');
    process.exitCode = 1;
    return;
  }
  const seedPath = path.resolve(
    process.cwd(),
    String(process.env.VIDEO_ARCHIVE_SEED_PATH || 'data/cestui-videos.seed.json').trim()
  );
  let raw = [];
  try {
    raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (e) {
    console.error('[seed-video-archive] Missing or invalid JSON:', seedPath, e.message);
    process.exitCode = 1;
    return;
  }
  const supabase = getService();
  let ok = 0;
  let fail = 0;
  for (const row of raw) {
    if (!row || !row.youtube_id) continue;
    const payload = {
      youtube_id: String(row.youtube_id).trim(),
      title: row.title != null ? String(row.title).trim() : null,
      channel: row.channel != null ? String(row.channel).trim() : null,
      category: row.category != null ? String(row.category).trim() : 'general',
      category_label: row.category_label != null ? String(row.category_label).trim() : null,
      youtube_status: 'unknown',
      last_checked: null,
      archived_at: null,
      thumbnail_url: null,
      video_url: null,
    };
    /** Prefer upsert (Supabase expects unique on youtube_id). */
    const { error } = await supabase.from('videos').upsert(payload, { onConflict: 'youtube_id' });
    if (error) {
      console.warn('[seed-video-archive]', payload.youtube_id, error.message);
      fail += 1;
    } else {
      ok += 1;
    }
  }
  console.log('[seed-video-archive] upsert ok:', ok, 'fail:', fail, 'seed:', seedPath);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
