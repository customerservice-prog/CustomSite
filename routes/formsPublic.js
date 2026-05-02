'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { sendFormSubmissionNotification } = require('../lib/email');

const router = express.Router();

const formSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.min(Number(process.env.CUSTOMSITE_FORM_RATELIMIT_MAX) || 30, 200),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: 'Too many submissions. Try again later.' });
  },
});

function safeFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k0, v0] of Object.entries(body)) {
    const k = String(k0 || '').slice(0, 80).replace(/[^\w\-_.[\]]+/g, '_');
    if (!k) continue;
    const v =
      typeof v0 === 'string'
        ? v0.slice(0, 12000)
        : v0 === null || v0 === undefined
          ? ''
          : JSON.stringify(v0).slice(0, 2000);
    out[k] = v;
  }
  return out;
}

router.post('/:projectId/submit', formSubmitLimiter, express.json({ limit: '256kb' }), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ ok: false, error: 'Forms are not configured on this server.' });
    }
    const projectId = String(req.params.projectId || '').trim();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)
    ) {
      return res.status(400).json({ ok: false, error: 'Invalid project' });
    }
    const supabase = getService();
    const { data: proj, error: pe } = await supabase
      .from('projects')
      .select('id, name, client_id')
      .eq('id', projectId)
      .maybeSingle();
    if (pe) return res.status(500).json({ ok: false, error: pe.message });
    if (!proj) return res.status(404).json({ ok: false, error: 'Project not found' });

    let clientEmail = null;
    if (proj.client_id) {
      const { data: u } = await supabase.from('users').select('email, full_name').eq('id', proj.client_id).maybeSingle();
      if (u && u.email) clientEmail = String(u.email).trim();
    }

    const fields = safeFields(req.body);
    const { data: row, error: insErr } = await supabase
      .from('form_submissions')
      .insert({ project_id: projectId, fields })
      .select('id')
      .single();

    if (insErr) {
      if (/form_submissions|relation|does not exist/i.test(insErr.message)) {
        return res.status(503).json({
          ok: false,
          error: 'Form storage is not set up yet. Run supabase/migrations/006_agency_extensions.sql in the SQL Editor.',
        });
      }
      return res.status(500).json({ ok: false, error: insErr.message });
    }

    void sendFormSubmissionNotification({
      projectId,
      projectName: proj.name,
      submissionId: row.id,
      fields,
      clientEmail,
    }).catch(() => {});

    return res.status(200).json({ ok: true, thanks: true, id: row.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
