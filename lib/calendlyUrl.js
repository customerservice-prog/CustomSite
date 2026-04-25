'use strict';

/**
 * Returns a safe public Calendly booking URL for /api/config/public and client link hydration.
 * Rejects placeholders, non-HTTPS, non-calendly hosts, and single-segment paths.
 */
function cleanCalendlyUrl(v) {
  const s = (v || '').trim();
  if (!s) return null;
  const sl = s.toLowerCase();
  if (sl.includes('replace-me')) return null;
  if (sl.includes('your-calendly') || sl.includes('yoursite') || sl.includes('example.com')) return null;
  if (!/^https:\/\//i.test(s)) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'calendly.com') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return s;
}

module.exports = { cleanCalendlyUrl };
