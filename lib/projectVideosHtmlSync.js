'use strict';

const { extractYoutubeIdsFromHtml } = require('./extractYoutubeIdsFromHtml');
const {
  PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID,
  extractVideoCatalogHintsFromHtml,
  mergeVideoHintsMaps,
} = require('./extractVideoCatalogHintsFromHtml');
const { fetchYoutubeOembed } = require('./youtubeUtils');

/** @typedef {{ source?: string, category?: string | null, episode_number?: number | null, playlist_id?: string | null }} VideoHint */

/**
 * PATCH fields when `.video-card` hints are present again (cron / HTML save).
 * @param {Partial<VideoHint> | Record<string, unknown> | undefined} hint
 */
function metadataPatchFromHint(hint) {
  if (!hint || typeof hint !== 'object') return null;
  /** @type {Record<string, unknown>} */
  const patch = {};

  if (typeof hint.source === 'string' && hint.source.trim()) patch.source = hint.source.trim();

  if (hint.category !== undefined) {
    patch.category =
      hint.category == null || String(hint.category).trim() === '' ? null : String(hint.category).trim();
  }

  if (hint.episode_number != null && Number.isFinite(Number(hint.episode_number))) {
    patch.episode_number = Number(hint.episode_number);
  }

  if (hint.playlist_id !== undefined) {
    patch.playlist_id =
      hint.playlist_id == null || String(hint.playlist_id).trim() === '' ? null : String(hint.playlist_id).trim();
  }

  const src = String(patch.source || hint.source || '').toLowerCase();
  if (src === 'podcast' && (patch.playlist_id === undefined || patch.playlist_id === null)) {
    patch.playlist_id = PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID;
  }

  return Object.keys(patch).length ? patch : null;
}

function migrationMissingCatalogCols(msg) {
  return (
    /\b(?:source|category|episode_number|playlist_id)\b/i.test(String(msg || '')) ||
    /does not exist|column/i.test(String(msg || ''))
  );
}

function stripCatalogCols(obj) {
  const n = { ...obj };
  delete n.source;
  delete n.category;
  delete n.episode_number;
  delete n.playlist_id;
  return n;
}

async function tryUpdateVideoMetadata(supabase, projectId, youtube_id, patch) {
  /** @type {Record<string, unknown>} */
  let p = { ...patch };
  let { error } = await supabase.from('project_videos').update(p).eq('project_id', projectId).eq('youtube_id', youtube_id);
  if (!error) return { error: null };
  if (migrationMissingCatalogCols(error.message)) {
    p = stripCatalogCols(p);
    if (Object.keys(p).length === 0) return { error: null };
    ({ error } = await supabase.from('project_videos').update(p).eq('project_id', projectId).eq('youtube_id', youtube_id));
  }
  return { error };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} projectId
 * @param {Iterable<string>} idsIterable
 * @param {Map<string, Partial<VideoHint>>} [hintsMap]
 */
async function upsertYoutubeIdsIntoProjectVideos(supabase, projectId, idsIterable, hintsMap) {
  /** @type {Map<string, Partial<VideoHint>>} */
  const hints = hintsMap instanceof Map ? hintsMap : new Map();
  const ids = [...new Set(idsIterable)].filter((id) => /^[a-zA-Z0-9_-]{11}$/.test(id));
  if (!ids.length) return { inserted: 0, skipped: 0, metadata_patched: 0 };

  const { data: existingRows, error: exErr } = await supabase
    .from('project_videos')
    .select('youtube_id')
    .eq('project_id', projectId);
  if (exErr) throw exErr;
  const have = new Set((existingRows || []).map((r) => r.youtube_id));

  const { data: maxRow } = await supabase
    .from('project_videos')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let sortBase = typeof maxRow?.sort_order === 'number' ? maxRow.sort_order + 1 : 0;

  let inserted = 0;
  let skipped = 0;
  let metadata_patched = 0;
  const now = new Date().toISOString();

  for (const yt of ids) {
    /** @type {Partial<VideoHint>} */
    const rawHint = hints.get(yt) || {};
    const metaPatch = metadataPatchFromHint(rawHint);

    if (have.has(yt)) {
      skipped += 1;
      if (metaPatch && Object.keys(metaPatch).length) {
        const { error: uErr } = await tryUpdateVideoMetadata(supabase, projectId, yt, metaPatch);
        if (uErr) throw uErr;
        metadata_patched += 1;
      }
      continue;
    }

    let meta = null;
    try {
      meta = await fetchYoutubeOembed(yt);
    } catch {
      meta = null;
    }
    const title = meta?.title?.trim() || `From site HTML · ${yt}`;

    const mp = metaPatch || {};
    /** @type {Record<string, unknown>} */
    const ins = {
      project_id: projectId,
      youtube_id: yt,
      title,
      description: null,
      author_name: meta?.author_name || null,
      thumbnail_url: meta?.thumbnail_url || null,
      status: 'active',
      health_status: 'unchecked',
      sort_order: sortBase,
      last_checked: now,
      source:
        typeof mp.source === 'string'
          ? mp.source
          : typeof rawHint.source === 'string'
            ? rawHint.source
            : 'custom',
      category: mp.category !== undefined ? mp.category : rawHint.category != null ? rawHint.category : null,
      episode_number:
        mp.episode_number !== undefined
          ? mp.episode_number
          : rawHint.episode_number != null && Number.isFinite(Number(rawHint.episode_number))
            ? Number(rawHint.episode_number)
            : null,
      playlist_id:
        mp.playlist_id !== undefined
          ? mp.playlist_id
          : rawHint.playlist_id ||
            (String(rawHint.source || mp.source || 'custom').toLowerCase() === 'podcast'
              ? PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID
              : null),
    };

    sortBase += 1;

    let insErr = (await supabase.from('project_videos').insert(ins)).error;

    /** Strip catalog cols if migration 010 missing */
    if (insErr && migrationMissingCatalogCols(insErr.message)) {
      delete ins.source;
      delete ins.category;
      delete ins.episode_number;
      delete ins.playlist_id;
      insErr = (await supabase.from('project_videos').insert(ins)).error;
    }
    /** Health columns fallback (009) */
    if (insErr && /health_status|health_checked/i.test(String(insErr.message))) {
      delete ins.health_status;
      insErr = (await supabase.from('project_videos').insert(ins)).error;
      if (insErr && migrationMissingCatalogCols(insErr.message)) {
        delete ins.source;
        delete ins.category;
        delete ins.episode_number;
        delete ins.playlist_id;
        insErr = (await supabase.from('project_videos').insert(ins)).error;
      }
    }

    if (insErr) {
      if (/duplicate|unique/i.test(String(insErr.message))) skipped += 1;
      else throw insErr;
    } else {
      inserted += 1;
      have.add(yt);
    }
  }

  return { inserted, skipped, metadata_patched };
}

/**
 * Upsert catalog rows for every YouTube ID found in HTML and merge `.video-card` hints.
 */
async function upsertProjectVideosFromHtmlContent(supabase, projectId, htmlUtf8) {
  const html = htmlUtf8 || '';
  const ids = extractYoutubeIdsFromHtml(html);
  const hints = extractVideoCatalogHintsFromHtml(html);
  return upsertYoutubeIdsIntoProjectVideos(supabase, projectId, ids, hints);
}

/**
 * Scan all HTML site_files for a project; merge hints across pages (later files overlay).
 */
async function upsertEmbeddedYoutubeFromProjectSiteFiles(supabase, projectId) {
  const { data: rows, error } = await supabase
    .from('site_files')
    .select('path, content, content_encoding')
    .eq('project_id', projectId)
    .order('path');
  if (error) throw error;

  /** @type {Set<string>} */
  const all = new Set();
  /** @type {Map<string, Partial<VideoHint>>} */
  const hintsMerged = new Map();
  let scanned_files = 0;

  for (const row of rows || []) {
    if (!/\.html?$/i.test(String(row.path || ''))) continue;
    if ((row.content_encoding || 'utf8') === 'base64') continue;
    const text = typeof row.content === 'string' ? row.content : '';
    scanned_files += 1;
    extractYoutubeIdsFromHtml(text).forEach((id) => all.add(id));
    mergeVideoHintsMaps(hintsMerged, extractVideoCatalogHintsFromHtml(text));
  }

  const r = await upsertYoutubeIdsIntoProjectVideos(supabase, projectId, all, hintsMerged);
  return { ...r, scanned_files };
}

function replaceYoutubeIdInHtml(html, oldId, newId) {
  if (!html || oldId === newId) return html;
  return String(html).split(oldId).join(newId);
}

async function replaceYoutubeIdAcrossSiteHtmlFiles(supabase, projectId, oldYoutubeId, newYoutubeId) {
  const { data: rows, error } = await supabase
    .from('site_files')
    .select('path, content, content_encoding')
    .eq('project_id', projectId);
  if (error) throw error;
  let pathsUpdated = 0;
  for (const row of rows || []) {
    if (!/\.html?$/i.test(row.path || '')) continue;
    const text = typeof row.content === 'string' ? row.content : '';
    if ((row.content_encoding || 'utf8') === 'base64') continue;
    const next = replaceYoutubeIdInHtml(text, oldYoutubeId, newYoutubeId);
    if (next === text) continue;
    const now = new Date().toISOString();
    const patch = { content: next, updated_at: now };
    const { error: uerr } = await supabase.from('site_files').update(patch).eq('project_id', projectId).eq('path', row.path);
    if (uerr) throw uerr;
    pathsUpdated += 1;
  }
  return { pathsUpdated };
}

module.exports = {
  upsertYoutubeIdsIntoProjectVideos,
  upsertProjectVideosFromHtmlContent,
  upsertEmbeddedYoutubeFromProjectSiteFiles,
  replaceYoutubeIdAcrossSiteHtmlFiles,
  extractYoutubeIdsFromHtml,
  replaceYoutubeIdInHtml,
  PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID,
  extractVideoCatalogHintsFromHtml,
  mergeVideoHintsMaps,
};
