'use strict';

/**
 * Hostname helpers so client custom domains are not treated as the marketing/admin platform.
 */

function stripPort(host) {
  return String(host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()
    .trim();
}

function stripWww(h) {
  return h.startsWith('www.') ? h.slice(4) : h;
}

/**
 * True when this hostname should receive the CustomSite marketing site, admin, /api, etc.
 * Custom client domains (anything else with a DB match) get static site routing instead.
 */
function isPlatformHostname(hostname) {
  const h = stripPort(hostname);
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.endsWith('.railway.app') || h.endsWith('.onrender.com') || h.endsWith('.vercel.app')) {
    return true;
  }

  const extra = String(process.env.CUSTOMSITE_PLATFORM_HOSTS || '')
    .split(',')
    .map((s) => stripPort(s))
    .filter(Boolean);
  for (const x of extra) {
    if (h === x || stripWww(h) === stripWww(x)) return true;
  }

  const raw = String(process.env.PUBLIC_SITE_URL || '').trim();
  if (raw) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      const ch = u.hostname.toLowerCase();
      if (h === ch || stripWww(h) === stripWww(ch)) return true;
    } catch {
      /* */
    }
  }

  if (h === 'customsite.online' || h === 'www.customsite.online') return true;
  return false;
}

/** Values to OR-match against `projects.custom_domain`. */
function customDomainLookupVariants(hostname) {
  const h = stripPort(hostname);
  const out = new Set([h]);
  if (h.startsWith('www.')) out.add(h.slice(4));
  else out.add(`www.${h}`);
  return [...out];
}

module.exports = {
  stripPort,
  stripWww,
  isPlatformHostname,
  customDomainLookupVariants,
};
