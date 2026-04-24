'use strict';

/**
 * Public contact: real phone (SITE_PHONE) or email (default — never uses fictional 555 numbers).
 * NXX 555 in the stored number falls back to email.
 */
const DEFAULT_EMAIL = 'hello@customsite.online';

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

function isFictional555(us10) {
  if (us10.length !== 10) return true;
  return us10.slice(3, 6) === '555';
}

/**
 * @returns {{ usePhone: boolean, e164: string, display: string, schema: string, dial: string, email: string, navLine: string, jsonCommunication: string }}
 */
function getSiteContact() {
  const email = (process.env.SITE_CONTACT_EMAIL || DEFAULT_EMAIL).trim() || DEFAULT_EMAIL;
  const raw = process.env.SITE_PHONE;
  const rawStr = raw == null ? '' : String(raw).trim();
  const forceEmail = /^email|none|mailto$/i.test(rawStr) || rawStr === '';

  let usePhone = !forceEmail;
  let digits = digitsOnly(rawStr);
  if (digits.length === 10) digits = `1${digits}`;
  if (digits.length !== 11 || digits[0] !== '1') {
    usePhone = false;
  } else {
    const us10 = digits.slice(1);
    if (isFictional555(us10)) {
      usePhone = false;
    }
  }

  if (!usePhone) {
    const navLine = `Email: <a href="mailto:${email}">${email}</a>`;
    const jsonCommunication = `"email": "${email}",`;
    return {
      usePhone: false,
      e164: '',
      display: email,
      schema: '',
      dial: `mailto:${email}`,
      email,
      navLine,
      jsonCommunication,
    };
  }

  const us10 = digits.slice(1);
  const e164 = `+1${us10}`;
  const displayOverride = process.env.SITE_PHONE_DISPLAY && String(process.env.SITE_PHONE_DISPLAY).trim();
  const display =
    displayOverride || `(${us10.slice(0, 3)}) ${us10.slice(3, 6)}-${us10.slice(6)}`;
  const schema = `+1-${us10.slice(0, 3)}-${us10.slice(3, 6)}-${us10.slice(6)}`;
  const navLine = `Call: <a href="tel:${e164}">${display}</a>`;
  const jsonCommunication = `"telephone": "${schema}",`;
  return {
    usePhone: true,
    e164,
    display,
    schema,
    dial: e164,
    email: '',
    navLine,
    jsonCommunication,
  };
}

/** @deprecated use getSiteContact */
function getSitePhone() {
  const c = getSiteContact();
  return { e164: c.e164, display: c.display, schema: c.schema, dial: c.dial };
}

function applySitePhoneToHtml(html) {
  const c = getSiteContact();
  return String(html)
    .replace(/\{\{NAV_CONTACT_LINE\}\}/g, c.navLine)
    .replace(/\{\{JSONLD_COMMUNICATION\}\}/g, c.jsonCommunication)
    .replace(/\{\{PHONE_E164\}\}/g, c.e164)
    .replace(/\{\{PHONE_DISPLAY\}\}/g, c.display)
    .replace(/\{\{PHONE_SCHEMA\}\}/g, c.schema)
    .replace(/\{\{PHONE_DIAL\}\}/g, c.dial);
}

module.exports = { getSitePhone, getSiteContact, applySitePhoneToHtml };
