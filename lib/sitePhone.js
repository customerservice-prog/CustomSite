'use strict';

const FALLBACK = '13155550100';

/**
 * E.164 + US display + schema.org telephone from SITE_PHONE (default Syracuse placeholder).
 * @returns {{ e164: string, display: string, schema: string, dial: string }}
 */
function getSitePhone() {
  const env = String(process.env.SITE_PHONE || `+1${FALLBACK}`).trim();
  let digits = env.replace(/\D/g, '');

  if (digits.length === 10) digits = `1${digits}`;
  if (digits.length !== 11 || digits[0] !== '1') {
    digits = `1${FALLBACK}`;
  }
  const us10 = digits.slice(1);
  const e164 = `+1${us10}`;

  const displayOverride = process.env.SITE_PHONE_DISPLAY && String(process.env.SITE_PHONE_DISPLAY).trim();
  const display =
    displayOverride || `(${us10.slice(0, 3)}) ${us10.slice(3, 6)}-${us10.slice(6)}`;

  const schema = `+1-${us10.slice(0, 3)}-${us10.slice(3, 6)}-${us10.slice(6)}`;

  return { e164, display, schema, dial: e164 };
}

function applySitePhoneToHtml(html) {
  const p = getSitePhone();
  return String(html)
    .replace(/\{\{PHONE_E164\}\}/g, p.e164)
    .replace(/\{\{PHONE_DISPLAY\}\}/g, p.display)
    .replace(/\{\{PHONE_SCHEMA\}\}/g, p.schema)
    .replace(/\{\{PHONE_DIAL\}\}/g, p.dial);
}

module.exports = { getSitePhone, applySitePhoneToHtml };
