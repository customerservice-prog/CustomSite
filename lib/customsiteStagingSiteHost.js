'use strict';

const { stripPort } = require('./customsitePlatformHosts');
const { normalizeCustomDomainHost } = require('./normalizeCustomDomainHost');

/** @returns {string | null} */
function getStagingSitesParentHost() {
  const n = normalizeCustomDomainHost(process.env.CUSTOMSITE_STAGING_SITES_HOST || '');
  return n || null;
}

/**
 * When Host is `{slug}.{parent}` → returns slug if env parent is configured and shape is valid.
 * @param {string} hostnameRaw
 * @returns {string | null}
 */
function stagingSlugFromHost(hostnameRaw) {
  const parent = getStagingSitesParentHost();
  if (!parent || !hostnameRaw) return null;
  const h = normalizeCustomDomainHost(stripPort(hostnameRaw));
  if (!h || h === parent) return null;
  const suf = '.' + parent;
  if (!h.endsWith(suf)) return null;
  const prefix = h.slice(0, -suf.length);
  if (!prefix || prefix.includes('.')) return null;
  if (prefix.length < 3 || prefix.length > 48) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(prefix)) return null;
  return prefix;
}

module.exports = {
  getStagingSitesParentHost,
  stagingSlugFromHost,
};
