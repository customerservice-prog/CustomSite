'use strict';

/**
 * Push repo `videos.html` to The Cestui Files project via Supabase service role
 * (same table as PUT /api/admin/projects/:id/site/file — no JWT).
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (e.g. in .env or Railway env pull).
 *
 * Usage:
 *   node scripts/cestui-upload-videos-service.js
 *   node scripts/cestui-upload-videos-service.js /path/to/videos.html optional-project-id
 */

const fs = require('fs');
const path = require('path');

require('../lib/env');
const { getService, isSupabaseConfigured } = require('../lib/supabase');

const DEFAULT_PROJECT_ID = process.env.CESTUI_SITE_PROJECT_ID || '55546683-c4f1-419c-a2d4-b35378679537';

async function persistHtml(supabase, projectId, relPath, text) {
  const now = new Date().toISOString();
  const nbytes = Buffer.byteLength(text, 'utf8');

  let { data: existing } = await supabase
    .from('site_files')
    .select('id')
    .eq('project_id', projectId)
    .eq('path', relPath)
    .maybeSingle();

  const rowPayload = {
    content: text,
    updated_at: now,
    content_encoding: 'utf8',
    size_bytes: nbytes,
  };

  if (existing && existing.id) {
    const { error } = await supabase.from('site_files').update(rowPayload).eq('id', existing.id);
    return { error };
  }
  const { error } = await supabase.from('site_files').insert({ project_id: projectId, path: relPath, ...rowPayload });
  return { error };
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      '[cestui-upload-videos] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n  Add them to .env, or export from Railway, then re-run.'
    );
    process.exitCode = 1;
    return;
  }

  const repoRoot = path.join(__dirname, '..');
  const diskPathArg = process.argv[2];
  const projectIdArg = process.argv[3];

  const diskPath = diskPathArg
    ? path.resolve(diskPathArg)
    : path.join(repoRoot, 'client-site-reference', 'cestui-files', 'videos.html');
  const projectId = projectIdArg || DEFAULT_PROJECT_ID;

  if (!fs.existsSync(diskPath)) {
    console.error('[cestui-upload-videos] File not found:', diskPath);
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(diskPath, 'utf8');
  const supabase = getService();

  const { error } = await persistHtml(supabase, projectId, 'videos.html', content);
  if (error) {
    console.error('[cestui-upload-videos] Supabase error:', error.message || error);
    process.exitCode = 1;
    return;
  }
  console.log('[cestui-upload-videos] OK  project=%s path=videos.html  bytes=%s', projectId, content.length);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
