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

/**
 * Client-facing hostname behind reverse proxies (Railway edge, Cloudflare, etc.).
 * Order: X-Forwarded-Host, RFC 7239 Forwarded `host=`, Host.
 */
function inboundRequestHost(req) {
const fromCsOrig = stripPort(req.get('x-cs-orig-host') || '');
      if (fromCsOrig) return fromCsOrig;
      const fromXfh = stripPort(req.get('x-forwarded-host') || '');
  if (fromXfh) return fromXfh;
  const fwd = req.get('forwarded');
  if (fwd && typeof fwd === 'string') {
    for (const segment of fwd.split(',')) {
      const m = /(?:^|;\s*)host\s*=\s*"?([^";,\s]+)"?/i.exec(segment.trim());
      if (m) {
        const h = stripPort(m[1]);
        if (h) return h;
      }
    }
  }
  return stripPort(req.get('host') || '');
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

  const { getStagingSitesParentHost } = require('./customsiteStagingSiteHost');
  const stagingParent = getStagingSitesParentHost();
  if (stagingParent && h === stagingParent) {
    return true;
  }

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
  inboundRequestHost,
};
