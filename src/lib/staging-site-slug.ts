const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'cdn',
  'mail',
  'ftp',
  'root',
  'localhost',
  'staging',
  'app',
  'static',
  'assets',
]);

/** Client-side mirror of `lib/normalizeStagingSiteSlug.js` — keep rules aligned. */
export function normalizeStagingSiteSlugInput(input: unknown): string | null {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[^a-z0-9-]+/g, '');
  s = s.replace(/^-+|-+$/g, '');
  if (!s || RESERVED.has(s)) return null;
  if (s.length < 3 || s.length > 48) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s)) return null;
  return s;
}
