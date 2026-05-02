'use strict';

const {jpegDimensions} = require('./jpegImageMeta');
const {PLACEHOLDER_MQ_BYTES} = require('./rewriteYoutubeThumbnailUrlsInHtml');

const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">' +
  '<rect width="320" height="180" fill="#141414"/><rect x="24" y="24" width="272" height="132" rx="10" fill="#1f1f1f" stroke="#303030"/>' +
  '<polygon fill="#eaeaea" points="134,61 134,119 198,90"/>' +
  '<text x="160" y="158" fill="#777" font-family="system-ui,sans-serif" font-size="11" text-anchor="middle">' +
  'Thumbnail unavailable</text></svg>';

/**
 * YouTube thumbnails are JPEG starting with FF D8 FF — trust magic bytes rather than raw byte counts.
 * Some edge responses are small-but-valid JPEGs from CDNs after redirects (fixed ≤120×90 placeholders are still rejected via dimensions).
 */
function thumbnailBufferLooksUnavailable(buf) {
  if (!buf || buf.length < 48) return true;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg) return true;
  if (buf.length === PLACEHOLDER_MQ_BYTES) return true;
  const dims = jpegDimensions(buf);
  if (!dims) return false;
  if (dims.width <= 120 && dims.height <= 90) return true;
  return false;
}

module.exports = {
  FALLBACK_SVG,
  thumbnailBufferLooksUnavailable,
};
