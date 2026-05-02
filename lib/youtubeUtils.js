'use strict';

/**
 * @param {string} raw
 * @returns {string | null}
 */
function extractYoutubeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s, 'https://example.com');
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const seg = u.pathname.replace(/^\//, '').split('/')[0];
      return seg && /^[a-zA-Z0-9_-]{11}$/.test(seg) ? seg : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'www.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
      const shortIdx = parts.indexOf('shorts');
      if (shortIdx >= 0 && parts[shortIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortIdx + 1])) {
        return parts[shortIdx + 1];
      }
    }
  } catch {
    /* */
  }
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * @param {string} youtubeId
 * @returns {Promise<{ title?: string, author_name?: string, thumbnail_url?: string, html?: string } | null>}
 */
async function fetchYoutubeOembed(youtubeId) {
  const id = extractYoutubeId(youtubeId);
  if (!id) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined;
  const r = await fetch(oembedUrl, { redirect: 'follow', signal: ctrl });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  if (!j || typeof j !== 'object') return null;
  return {
    title: typeof j.title === 'string' ? j.title : undefined,
    author_name: typeof j.author_name === 'string' ? j.author_name : undefined,
    thumbnail_url: typeof j.thumbnail_url === 'string' ? j.thumbnail_url : undefined,
    html: typeof j.html === 'string' ? j.html : undefined,
  };
}

/**
 * Probe whether YouTube still serves oEmbed for this id.
 * @param {string} youtubeId
 * @returns {Promise<{ ok: boolean, meta?: Record<string, unknown> }>}
 */
async function probeYoutubeAvailability(youtubeId) {
  const id = extractYoutubeId(youtubeId);
  if (!id) return { ok: false };
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined;
  try {
    const r = await fetch(oembedUrl, { redirect: 'follow', signal: ctrl });
    if (!r.ok) return { ok: false };
    const j = await r.json().catch(() => null);
    return { ok: true, meta: j && typeof j === 'object' ? j : {} };
  } catch {
    return { ok: false };
  }
}

module.exports = { extractYoutubeId, fetchYoutubeOembed, probeYoutubeAvailability };
