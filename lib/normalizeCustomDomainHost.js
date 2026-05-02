'use strict';

/**
 * Strip protocol, path, port; lowercase. Matches API PATCH normalization for `projects.custom_domain`.
 * @param {unknown} v
 * @returns {string | null}
 */
function normalizeCustomDomainHost(v) {
  if (v == null) return null;
  let s = String(v).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0] || '';
  s = s.split(':')[0] || '';
  s = s.replace(/\.$/, '').trim();
  return s || null;
}

module.exports = { normalizeCustomDomainHost };
