'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function norm(k) {
  return String(k || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Normalize flexible site-builder JSON field keys → standard lead columns when possible.
 * @param {Record<string, string>} fields raw form body (already string-only from safeFields)
 * @returns {null | { name: string, email: string, phone?: string|null, company?: string|null, service_type?: string|null, budget?: string|null, timeline?: string|null, message: string }}
 */
function extractStructuredLeadFromFormFields(fields) {
  if (!fields || typeof fields !== 'object') return null;
  const byNorm = {};
  for (const [k, v] of Object.entries(fields)) {
    const key = norm(k);
    if (!key) continue;
    if (typeof v === 'string' && v.trim()) {
      byNorm[key] = String(v).trim();
    }
  }

  /** @param {...string} keys normalized keys only */
  const pick = (...keys) => {
    for (const k of keys) {
      if (byNorm[k]) return byNorm[k];
    }
    return '';
  };

  let name =
    pick('name', 'fullname', 'full_name', 'your_name', 'contact_name', 'first_name') || '';
  if (!name.trim()) {
    const first = pick('firstname', 'first');
    const last = pick('lastname', 'last', 'surname');
    if (first || last) name = `${first} ${last}`.trim();
  }
  const email = pick('email', 'e_mail', 'mail');
  let message =
    pick(
      'message',
      'msg',
      'comments',
      'comment',
      'details',
      'inquiry',
      'question',
      'description',
      'notes',
      'note',
      'body'
    ) || '';

  /** Optional structured fields mirrored on `/api/contact`. */
  const phone = pick('phone', 'tel', 'telephone', 'mobile');
  const company = pick('company', 'organization', 'org', 'business');
  const service_type = pick('service_type', 'service', 'topic', 'subject');
  const budget = pick('budget', 'price_range', 'rangeprice');
  const timeline = pick('timeline', 'when', 'timing');

  if (!name || !email || !EMAIL_RE.test(email)) return null;
  if (!message.trim()) {
    /** Allow message-free only when other substantive fields carry content. */
    const filler = [
      phone && `Phone: ${phone}`,
      company && `Company: ${company}`,
      service_type && `Topic: ${service_type}`,
      budget && `Budget: ${budget}`,
      timeline && `Timeline: ${timeline}`,
    ]
      .filter(Boolean)
      .join('\n');
    if (!filler.trim()) return null;
    message = filler.trim();
  }

  const used = new Set(
    ['name', 'fullname', 'full_name', 'your_name', 'contact_name', 'first_name', 'firstname', 'last_name', 'lastname', 'surname'].map(norm)
      .concat(
        ['email', 'e_mail', 'mail'].map(norm),
        ['message', 'comments', 'comment', 'details', 'inquiry', 'question', 'description', 'notes', 'note', 'body', 'msg'].map(norm),
        ['phone', 'tel', 'telephone', 'mobile'].map(norm),
        ['company', 'organization', 'org', 'business'].map(norm),
        ['service_type', 'service', 'topic', 'subject'].map(norm),
        ['budget', 'price_range', 'rangeprice'].map(norm),
        ['timeline', 'when', 'timing'].map(norm)
      )
      .concat(['current_url', 'page_url', '_gotcha'])
  );

  const lines = [];
  for (const [k, v] of Object.entries(byNorm)) {
    if (!v) continue;
    if (used.has(k)) continue;
    const originalKey = Object.keys(fields).find((ok) => norm(ok) === k) || k;
    lines.push(`${originalKey}: ${v}`);
  }
  let fullMessage = message.trim();
  if (lines.length) {
    fullMessage += `\n\n— Additional fields —\n${lines.join('\n')}`;
    if (fullMessage.length > 14000) {
      fullMessage = fullMessage.slice(0, 14000) + '\n…(truncated)';
    }
  }

  return {
    name: name.trim().slice(0, 500),
    email: email.trim().toLowerCase().slice(0, 320),
    phone: phone ? phone.slice(0, 160) : null,
    company: company ? company.slice(0, 500) : null,
    service_type: service_type ? service_type.slice(0, 500) : null,
    budget: budget ? budget.slice(0, 200) : null,
    timeline: timeline ? timeline.slice(0, 200) : null,
    message: fullMessage.trim() || '(no message)',
  };
}

module.exports = { extractStructuredLeadFromFormFields };
