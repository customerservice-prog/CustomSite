'use strict';

const {thumbnailBufferLooksUnavailable} = require('./youtubeThumbnailLogic');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function thumbUrls(id) {
  return [
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/0.jpg`,
  ];
}

/**
 * @param {string} id 11-char video id
 * @returns {Promise<Buffer | null>}
 */
async function fetchYoutubeThumbnailBuffer(id) {
  const headers = {
    Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/*,*/*;q=0.9',
    'User-Agent': CHROME_UA,
  };

  for (const url of thumbUrls(id)) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers });
      if (!r.ok) continue;
      const ab = await r.arrayBuffer();
      const buf = Buffer.from(ab);
      if (!thumbnailBufferLooksUnavailable(buf)) return buf;
    } catch {
      /* try next */
    }
  }
  return null;
}

module.exports = { fetchYoutubeThumbnailBuffer, thumbUrls };
