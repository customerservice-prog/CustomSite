'use strict';

/**
 * Add apex (host) and www. variants for each https? origin so CORS does not
 * break when users hit the same deployment via www vs non-www (a fixed
 * `Access-Control-Allow-Origin: https://example.com` mismatches
 * `Origin: https://www.example.com` and the browser reports a CORS error).
 */
function expandWwwVariants(origins) {
  const out = new Set();
  for (const o of origins) {
    if (!o) continue;
    out.add(o);
    try {
      const u = new URL(o);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1') continue;
      if (h.startsWith('www.')) {
        out.add(`${u.protocol}//${h.slice(4)}${u.port ? `:${u.port}` : ''}`);
      } else {
        out.add(`${u.protocol}//www.${h}${u.port ? `:${u.port}` : ''}`);
      }
    } catch {
      /* ignore bad URL */
    }
  }
  return out;
}

/**
 * CORS: prefer CORS_ORIGINS (comma-separated), else PUBLIC_SITE_URL origin(s),
 * else reflect any origin (local dev / unset env).
 * Uses a dynamic `origin` callback so the response can mirror the request Origin
 * when it is in the allowlist (required when credentials: true).
 */
function buildCorsOptions() {
  const multi = process.env.CORS_ORIGINS;
  const site = process.env.PUBLIC_SITE_URL;
  const allow = new Set();

  if (multi && String(multi).trim()) {
    const raw = String(multi)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const o of expandWwwVariants(raw)) {
      allow.add(o);
    }
  } else if (site && String(site).trim()) {
    try {
      for (const o of expandWwwVariants([new URL(site).origin])) {
        allow.add(o);
      }
    } catch {
      /* fall through */
    }
  }

  if (allow.size > 0) {
    return {
      credentials: true,
      origin: (reqOrigin, callback) => {
        if (!reqOrigin) {
          return callback(null, true);
        }
        if (allow.has(reqOrigin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    };
  }
  return { origin: true, credentials: true };
}

module.exports = { buildCorsOptions };
