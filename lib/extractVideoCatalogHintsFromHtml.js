'use strict';

/** Official Authorized Archive playlist (Jordan Maxwell site podcast grid). */
const PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID = 'PLXFqjauWQf8my9dHqkY9yGpsjT0G9VFcl';

/** data-category tags used by the Best-of channel buckets on Jordan-style sites */
const BEST_OF_JM_CATEGORY = new Set(['religion', 'symbolism', 'history', 'power', 'cosmos']);

/**
 * @param {string | null | undefined} categoryRaw
 * @param {string | null | undefined} explicitSourceAttr
 * @returns {string}
 */
function inferSource(categoryRaw, explicitSourceAttr) {
  const explicit = String(explicitSourceAttr || '').trim().toLowerCase();
  if (explicit === 'best_of_jm' || explicit === 'podcast' || explicit === 'custom') return explicit;
  const cat = String(categoryRaw || '').trim().toLowerCase();
  if (cat === 'podcast') return 'podcast';
  if (BEST_OF_JM_CATEGORY.has(cat)) return 'best_of_jm';
  return 'custom';
}

/**
 * Parses `.video-card` opening tags only (cheap + matches Jordan client HTML conventions).
 *
 * Recommended attributes on each card root:
 *   data-vid="11-char-id"
 *   data-category="podcast" | religion | ...
 *   data-episode="1" (integer; omit for specials like Ep. 8b)
 *   optional: data-playlist-id="...", data-source="best_of_jm"|"podcast"|"custom"
 *
 * @param {string} html
 * @returns {Map<string, { source: string, category: string | null, episode_number?: number|null, playlist_id: string | null }>}
 */
function extractVideoCatalogHintsFromHtml(html) {
  /** @type {Map<string, { source: string, category: string | null, episode_number?: number|null, playlist_id: string | null }>} */
  const map = new Map();
  if (!html || typeof html !== 'string') return map;

  const reDiv = /<div\s+([^>]+)>/gi;
  let m;
  while ((m = reDiv.exec(html)) !== null) {
    const frag = m[1];
    if (!/\bvideo-card\b/.test(frag)) continue;

    const vid =
      /\bdata-vid\s*=\s*["']([a-zA-Z0-9_-]{11})["']/.exec(frag) ||
      /\bdata-video-id\s*=\s*["']([a-zA-Z0-9_-]{11})["']/.exec(frag);
    if (!vid) continue;

    const id = vid[1];
    const catM = /\bdata-category\s*=\s*["']([^"']*)["']/.exec(frag);
    const category = catM?.[1]?.trim();
    /** @type {string | null} */
    let categoryClean = category != null && category !== '' ? category : null;

    const epM = /\bdata-episode\s*=\s*["']([^"']*)["']/.exec(frag);
    let episode_number = null;
    if (epM && epM[1]) {
      const n = parseInt(String(epM[1]).trim(), 10);
      if (!Number.isNaN(n)) episode_number = n;
    }

    const srcM = /\bdata-source\s*=\s*["']([^"']+)["']/.exec(frag);
    const playlistM = /\bdata-playlist-id\s*=\s*["']([^"']+)["']/.exec(frag);

    const source = inferSource(categoryClean, srcM?.[1]);
    /** @type {string | null} */
    let playlist_id = playlistM?.[1]?.trim() || null;
    if (!playlist_id && source === 'podcast') playlist_id = PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID;

    map.set(id, {
      source,
      category: categoryClean,
      ...(episode_number != null ? { episode_number } : {}),
      playlist_id,
    });
  }

  return map;
}

/**
 * Merge hint maps; later wins per field (object spread order).
 * @param {Map<string, Record<string, unknown>>} into
 * @param {Map<string, Record<string, unknown>>} from
 */
function mergeVideoHintsMaps(into, from) {
  for (const [id, hint] of from.entries()) {
    const prev = into.get(id) || {};
    into.set(id, { ...prev, ...hint });
  }
}

module.exports = {
  PODCAST_AUTHORIZED_ARCHIVE_PLAYLIST_ID,
  extractVideoCatalogHintsFromHtml,
  mergeVideoHintsMaps,
  inferSource,
};
