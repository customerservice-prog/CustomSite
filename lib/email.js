'use strict';

const { Resend } = require('resend');

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendLeadNotification(lead) {
  const resend = getResend();
  const admin = process.env.ADMIN_EMAIL;
  const from = process.env.FROM_EMAIL;
  if (!resend || !admin || !from) {
    console.warn('[email] RESEND_API_KEY, ADMIN_EMAIL, or FROM_EMAIL not set — skipping owner notification');
    return;
  }

  const lines = [
    `New lead from ${lead.name} <${lead.email}>`,
    '',
    `Phone: ${lead.phone || '—'}`,
    `Company: ${lead.company || '—'}`,
    `Service: ${lead.service_type || '—'}`,
    `Budget: ${lead.budget || '—'}`,
    `Timeline: ${lead.timeline || '—'}`,
    `Current site: ${lead.current_url || '—'}`,
    '',
    'Message:',
    lead.message || '—',
  ];

  await resend.emails.send({
    from,
    to: admin,
    subject: `[CustomSite] New lead: ${lead.name}`,
    text: lines.join('\n'),
  });
}

async function sendLeadConfirmation(clientEmail, name) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from) return;

  await resend.emails.send({
    from,
    to: clientEmail,
    subject: 'We received your project request — CustomSite',
    text: `Hi ${name || 'there'},

Thanks for reaching out. We have received your message and will reply within one business day.

— CustomSite
https://customsite.online`,
  });
}

async function sendPaymentConfirmation(email, amount, description) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from || !email) return;

  await resend.emails.send({
    from,
    to: email,
    subject: 'Payment received — CustomSite',
    text: `Thank you — your payment was received.

Amount: ${amount}
${description ? `Details: ${description}` : ''}

— CustomSite`,
  });
}

async function sendWelcomeEmail(email, tempPassword) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  const admin = process.env.ADMIN_EMAIL;
  if (!resend || !from) return;

  await resend.emails.send({
    from,
    to: email,
    subject: 'Your CustomSite client portal',
    text: `Your account is ready.

Sign in: ${process.env.PUBLIC_SITE_URL || 'https://customsite.online'}/client-portal.html
Email: ${email}
Temporary password: ${tempPassword}

Please sign in and change your password in account settings when available.

— CustomSite`,
  });
}

module.exports = {
  sendLeadNotification,
  sendLeadConfirmation,
  sendPaymentConfirmation,
  sendWelcomeEmail,
};
