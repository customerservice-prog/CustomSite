'use strict';

/**
 * True if HTML already has a viewport meta (common shapes, including unquoted name=viewport).
 * @param {string} html
 */
function htmlAppearsToHaveViewportMeta(html) {
  const h = String(html || '');
  return /<meta\b[^>]*\bname\s*=\s*(["']?)viewport\1[^>]*>/i.test(h);
}

module.exports = { htmlAppearsToHaveViewportMeta };
