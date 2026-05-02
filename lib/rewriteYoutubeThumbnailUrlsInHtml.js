'use strict';

/** Default YouTube "unavailable" mqdefault bytes (observed grey tile). */
const PLACEHOLDER_MQ_BYTES = 12492;

/**
 * Rewrite direct i.ytimg.com thumbnail URLs to same-origin proxy (preview + custom domains).
 * @param {string} html
 * @returns {string}
 */
function rewriteYoutubeThumbnailUrlsInHtml(html) {
  let s = String(html || '');
  const re =
    /\b(https?:)?\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|webp)(\?[^\s"'<>]*)?/gi;
  return s.replace(re, '/api/proxy/yt-thumb?videoId=$2');
}

module.exports = {
  rewriteYoutubeThumbnailUrlsInHtml,
  PLACEHOLDER_MQ_BYTES,
};
