'use strict';

const { utcDateString } = require('./utcToday');

const DFS_URL = 'https://api.dataforseo.com/v3/serp/google/maps/live/regular';

/**
 * Best-effort: find map-pack style rank (1–20) from DataForSEO Maps SERP items.
 * @param {unknown[]} items
 * @param {string} [placeId]
 * @param {string} [businessName]
 */
function pickMapPackRank(items, placeId, businessName) {
  if (!Array.isArray(items) || items.length === 0) return { position: null, url: null };

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  const pid = String(placeId || '').trim();
  const bname = norm(businessName);

  let best = null;
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const row = /** @type {Record<string, unknown>} */ (it);
    const type = String(row.type || '');
    const rankAbs = typeof row.rank_absolute === 'number' ? row.rank_absolute : null;
    if (rankAbs == null || rankAbs > 20) continue;

    const rawUrl = String(row.url || row.original_url || row.link || '');
    const title = norm(row.title || row.name);

    let score = 0;
    if (pid && (rawUrl.includes(pid) || rawUrl.includes(encodeURIComponent(pid)))) score += 10;
    if (bname && title && title.includes(bname.slice(0, Math.min(12, bname.length)))) score += 5;
    if (type.includes('maps') || type.includes('local')) score += 1;

    if (score > 0 && (best == null || rankAbs < best.rank || (rankAbs === best.rank && score > best.score))) {
      best = { rank: rankAbs, url: rawUrl || null, score };
    }
  }

  if (best) return { position: best.rank, url: best.url };

  /** Fallback: first item with rank_absolute in 1–10 (visibility proxy). */
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const row = /** @type {Record<string, unknown>} */ (it);
    const rankAbs = typeof row.rank_absolute === 'number' ? row.rank_absolute : null;
    if (rankAbs != null && rankAbs <= 10) {
      return {
        position: rankAbs,
        url: String(row.url || row.original_url || row.link || '') || null,
      };
    }
  }

  return { position: null, url: null };
}

/**
 * Runs one Maps live SERP task for `{primary_keyword} {target_city}`.
 */
async function collectRankingsForProject(supabase, seoRow) {
  const login = String(process.env.DATAFORSEO_LOGIN || '').trim();
  const password = String(process.env.DATAFORSEO_PASSWORD || '').trim();
  if (!login || !password) {
    return { skipped: true, reason: 'DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD unset' };
  }

  const kwPart = String(seoRow.primary_keyword || '').trim();
  const cityPart = String(seoRow.target_city || '').trim();
  if (!kwPart || !cityPart) {
    return { skipped: true, reason: 'primary_keyword and target_city required for rank tracking' };
  }

  const keyword = `${kwPart} ${cityPart}`.replace(/\s+/g, ' ').trim();

  const body = [{ keyword, location_name: 'United States', language_code: 'en' }];
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const res = await fetch(DFS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = /** @type {Record<string, unknown>} */ (await res.json());
  const topCode = Number(raw.status_code);
  if (Number.isFinite(topCode) && topCode !== 20000 && topCode !== 0) {
    const msg =
      typeof raw.status_message === 'string' ? raw.status_message : `status_code=${topCode}`;
    throw new Error(`DataForSEO: ${msg}`);
  }
  const tasks = raw.tasks;
  const task0 = Array.isArray(tasks) && tasks[0] && typeof tasks[0] === 'object' ? tasks[0] : null;
  const tCode = task0?.status_code;
  if (!task0 || (Number.isFinite(Number(tCode)) && Number(tCode) !== 20000)) {
    const msg =
      task0 && typeof task0.status_message === 'string' ? task0.status_message : res.statusText;
    throw new Error(`DataForSEO: ${msg}`);
  }

  const resultArr = Array.isArray(task0.result) ? task0.result : [];
  /** @type {unknown[]} */
  const items =
    resultArr.length > 0 &&
    typeof resultArr[0] === 'object' &&
    resultArr[0] !== null &&
    'items' in resultArr[0] &&
    Array.isArray(resultArr[0].items)
      ? resultArr[0].items
      : [];

  const { position, url } = pickMapPackRank(items, seoRow.gbp_place_id, seoRow.gbp_name);
  const snapshotDate = utcDateString();

  const { error } = await supabase.from('seo_rank_snapshots').upsert(
    {
      project_id: seoRow.project_id,
      keyword,
      map_pack_position: position,
      local_pack_url: url,
      snapshot_date: snapshotDate,
      source: 'dataforseo',
    },
    { onConflict: 'project_id,keyword,snapshot_date,source' }
  );
  if (error) throw new Error(error.message);

  return { ok: true, keyword, map_pack_position: position, snapshot_date: snapshotDate };
}

module.exports = { collectRankingsForProject, pickMapPackRank };
