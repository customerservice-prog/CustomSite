'use strict';

const { Resend } = require('resend');

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    lead.project_id ? `Site project ID: ${lead.project_id}` : '',
    `Current site / page: ${lead.current_url || '—'}`,
    '',
    'Message:',
    lead.message || '—',
  ].filter(Boolean);

  const html = `<p><strong>Name:</strong> ${escHtml(lead.name)}</p>
<p><strong>Email:</strong> ${escHtml(lead.email)}</p>
<p><strong>Company:</strong> ${escHtml(lead.company || '—')}</p>
${lead.project_id ? `<p><strong>Site project ID:</strong> ${escHtml(String(lead.project_id))}</p>` : ''}
<p><strong>Message:</strong></p><p>${escHtml(lead.message || '—').replace(/\n/g, '<br/>')}</p>`;

  await resend.emails.send({
    from,
    to: admin,
    subject: `New lead: ${lead.name} — ${lead.company || 'no company'}`,
    text: lines.join('\n'),
    html,
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

async function sendWelcomeEmail(email, tempPassword, displayName) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from) return;

  const base = (process.env.PUBLIC_SITE_URL || 'https://customsite.online').replace(/\/$/, '');
  const portal = `${base}/client-portal.html`;
  const name = displayName || email.split('@')[0];

  await resend.emails.send({
    from,
    to: email,
    subject: `Welcome to CustomSite — ${name}`,
    text: `Hi ${name},

Your project portal is being set up. Use the link below to sign in with your email and temporary password.

Sign in: ${portal}
Email: ${email}
Temporary password: ${tempPassword}

Please sign in and change your password when prompted.

— The CustomSite Team`,
    html: `<p>Hi ${escHtml(name)},</p>
<p>Your project portal is being set up. You'll use the link below to sign in.</p>
<p><strong>Portal:</strong> <a href="${escHtml(portal)}">${escHtml(portal)}</a><br/>
<strong>Email:</strong> ${escHtml(email)}<br/>
<strong>Temporary password:</strong> ${escHtml(tempPassword)}</p>
<p>— The CustomSite Team</p>`,
  });
}

/** After invoice is created in admin — notifies client (separate from “Send invoice” PDF flow). */
async function sendInvoiceCreatedNotice({ toEmail, clientName, amount, dueDate, description }) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from || !toEmail) {
    console.warn('[email] sendInvoiceCreatedNotice skipped');
    return { sent: false };
  }
  const base = (process.env.PUBLIC_SITE_URL || 'https://customsite.online').replace(/\/$/, '');
  const amt = Number(amount).toFixed(2);
  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Invoice from CustomSite — $${amt}`,
    text: `Hi ${clientName || 'there'},

A new invoice has been created for your project. Amount: $${amt}. ${dueDate ? `Due: ${dueDate}.` : ''}

View your client portal: ${base}/client-portal.html

— CustomSite`,
    html: `<p>Hi ${escHtml(clientName || 'there')},</p>
<p>A new invoice has been created for your project.</p>
<p><strong>Amount:</strong> $${escHtml(amt)}<br/>
${dueDate ? `<strong>Due:</strong> ${escHtml(dueDate)}<br/>` : ''}
${description ? `<p>${escHtml(description)}</p>` : ''}
<p><a href="${escHtml(base + '/client-portal.html')}">Open your portal →</a></p>
<p>— CustomSite</p>`,
  });
  return { sent: true };
}

/** Admin posted a message — email the client so they see it in context. */
async function sendProjectMessageToClient({ toEmail, clientName, projectName, messageBody }) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from || !toEmail) {
    console.warn('[email] sendProjectMessageToClient skipped');
    return { sent: false };
  }
  const base = (process.env.PUBLIC_SITE_URL || 'https://customsite.online').replace(/\/$/, '');
  await resend.emails.send({
    from,
    to: toEmail,
    subject: `New message on your project — ${projectName || 'CustomSite'}`,
    text: `Hi ${clientName || 'there'},

You have a new message on ${projectName || 'your project'}:

${messageBody}

View in your portal: ${base}/client-portal.html`,
    html: `<p>Hi ${escHtml(clientName || 'there')},</p>
<p>You have a new message on <strong>${escHtml(projectName || 'your project')}</strong>:</p>
<blockquote style="border-left:3px solid #6366f1;padding-left:12px;margin:12px 0">${escHtml(messageBody).replace(/\n/g, '<br/>')}</blockquote>
<p><a href="${escHtml(`${base}/client-portal.html`)}">View in your portal →</a></p>`,
  });
  return { sent: true };
}

async function sendInvoiceEmail({ toEmail, amount, description, dueDate, portalUrl, invoiceId }) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from || !toEmail) {
    console.warn('[email] sendInvoiceEmail skipped — Resend or recipient missing');
    return { sent: false };
  }
  const base = process.env.PUBLIC_SITE_URL || 'https://customsite.online';
  const payUrl = `${base.replace(/\/$/, '')}/client-portal.html`;
  const text = `Hi,

You have a new invoice from CustomSite.

Amount: $${Number(amount).toFixed(2)}
${description ? `Details: ${description}\n` : ''}${dueDate ? `Due: ${dueDate}\n` : ''}
View and pay in your client portal: ${payUrl}
${invoiceId ? `(Invoice #${invoiceId})` : ''}

— CustomSite`;
  await resend.emails.send({
    from,
    to: toEmail,
    subject: 'Invoice from CustomSite',
    text,
  });
  return { sent: true };
}

async function sendContractEmail({ toEmail, title, body, contractId }) {
  const resend = getResend();
  const from = process.env.FROM_EMAIL;
  if (!resend || !from || !toEmail) {
    console.warn('[email] sendContractEmail skipped');
    return { sent: false };
  }
  const text = `Hi,

Your project agreement / proposal from CustomSite is below.

${title ? `Title: ${title}\n` : ''}${contractId ? `Reference: ${contractId}\n` : ''}
${String(body || '').trim() || '(No body text in record)'}

If you have questions, reply to this email or use your client portal.

— CustomSite`;
  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Agreement / proposal: ${title || 'CustomSite'}`,
    text,
  });
  return { sent: true };
}

/**
 * Visitor contact forms on deployed client sites POST to `/api/forms/:projectId/submit`.
 * Emails agency owner (+ client contact when available).
 *
 * @param {{ projectId: string, projectName?: string|null, submissionId: string, fields: Record<string,string>, clientEmail?: string|null }} opts
 */
async function sendFormSubmissionNotification(opts) {
  const resend = getResend();
  const admin = process.env.ADMIN_EMAIL;
  const from = process.env.FROM_EMAIL;
  const { projectId, projectName, submissionId, fields, clientEmail } = opts || {};
  if (!resend || !from || !admin) {
    console.warn('[email] sendFormSubmissionNotification skipped (RESEND/FROM_EMAIL/ADMIN_EMAIL)');
    return { sent: false };
  }

  const pName = projectName?.trim() || 'Client site';
  const lines =
    fields && typeof fields === 'object'
      ? Object.entries(fields).map(([k, v]) => `${k}: ${String(v ?? '').slice(0, 2000)}`)
      : [];

  const text = [
    `New form submission`,
    '',
    `Project: ${pName}`,
    `Project ID: ${projectId}`,
    `Submission: ${submissionId}`,
    '',
    ...lines,
  ].join('\n');

  const html = `
<p><strong>New contact form submission</strong> — ${escHtml(pName)}</p>
<p><small>Submission ID: ${escHtml(submissionId)} · Project ID: ${escHtml(projectId)}</small></p>
<ul>${lines.map((l) => `<li>${escHtml(l)}</li>`).join('')}</ul>`;

  await resend.emails.send({
    from,
    to: admin,
    subject: `New contact form submission — ${pName}`,
    text,
    html,
  });

  if (clientEmail && String(clientEmail).includes('@')) {
    await resend.emails.send({
      from,
      to: String(clientEmail).trim(),
      subject: `Someone submitted your site’s contact form — ${pName}`,
      text: `You received a new message via your CustomSite-hosted contact form (${pName}).\n\n${text}\n\n— CustomSite forwards this to both you and the agency.`,
    }).catch(() => {});
  }

  return { sent: true };
}

module.exports = {
  sendLeadNotification,
  sendLeadConfirmation,
  sendPaymentConfirmation,
  sendWelcomeEmail,
  sendInvoiceEmail,
  sendContractEmail,
  sendInvoiceCreatedNotice,
  sendProjectMessageToClient,
  sendFormSubmissionNotification,
};
