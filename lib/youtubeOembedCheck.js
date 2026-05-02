'use strict';

/**
 * Lightweight live check via oEmbed — no API key.
 * @param {string} id 11-char YouTube id
 * @returns {Promise<{ id: string, ok: boolean, status?: number }>}
 */
async function checkYoutubeOembed(id) {
  const qs = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  const url = `https://www.youtube.com/oembed?url=${qs}&format=json`;
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: { Accept: 'application/json', 'User-Agent': 'CustomSite-validation/1.0' },
    });
    return { id, ok: r.ok, status: r.status };
  } catch {
    return { id, ok: false };
  }
}

module.exports = { checkYoutubeOembed };
