'use strict';

/**
 * Extract plausible YouTube video IDs from HTML or JS text blobs.
 * @param {string} text
 * @returns {string[]}
 */
function extractYoutubeIdsFromText(text) {
  const s = String(text || '');
  const set = new Set();
  let m;
  const reWatch =
    /youtube\.com\/(?:watch\?[^\s"'<>]*?v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11})/gi;
  while ((m = reWatch.exec(s))) {
    set.add(String(m[1] || m[2]));
  }
  const reAttr =
    /\b(?:data-video-id|data-youtube-id|data-youtube_id|data-videoid)\s*=\s*["']([A-Za-z0-9_-]{11})["']/gi;
  while ((m = reAttr.exec(s))) {
    set.add(m[1]);
  }
  /** vi/xxxxxxxxxxx/ in thumbnails or embed URLs */
  const reVi = /\/vi\/([A-Za-z0-9_-]{11})\//gi;
  while ((m = reVi.exec(s))) {
    set.add(m[1]);
  }
  return [...set];
}

module.exports = { extractYoutubeIdsFromText };
