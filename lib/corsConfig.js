'use strict';

/**
 * CORS: prefer CORS_ORIGINS (comma-separated), else PUBLIC_SITE_URL origin, else reflect any origin (local dev).
 */
function buildCorsOptions() {
  const multi = process.env.CORS_ORIGINS;
  if (multi && String(multi).trim()) {
    const origins = String(multi)
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { origin: origins.length === 1 ? origins[0] : origins, credentials: true };
  }
  const site = process.env.PUBLIC_SITE_URL;
  if (site && String(site).trim()) {
    try {
      const origin = new URL(site).origin;
      return { origin, credentials: true };
    } catch {
      /* fall through */
    }
  }
  return { origin: true, credentials: true };
}

module.exports = { buildCorsOptions };
