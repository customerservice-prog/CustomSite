'use strict';

/**
 * Pull YouTube video IDs referenced in HTML (embed URLs, thumbnails, onclick handlers).
 * @param {string} html
 * @returns {string[]} unique stable 11-char ids
 */
function extractYoutubeIdsFromHtml(html) {
  if (!html || typeof html !== 'string') return [];
  /** @see project spec — variants used on client builds */
  const re =
    /(?:youtube\.com\/embed\/|youtu\.be\/|\/vi\/|watch\?v=|youtube\.com\/watch\?[a-zA-Z0-9_=&]*v=|openVideoModal\(\s*['"]|youtube\.com\/shorts\/|img\.youtube\.com\/vi\/)([a-zA-Z0-9_-]{11})/gi;
  /** @type {Set<string>} */
  const ids = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] && /^[a-zA-Z0-9_-]{11}$/.test(m[1])) ids.add(m[1]);
  }
  return Array.from(ids);
}

module.exports = { extractYoutubeIdsFromHtml };
