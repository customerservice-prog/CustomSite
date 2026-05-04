'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { sendLeadNotification, sendLeadConfirmation } = require('../lib/email');

function normalizeLeadUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const urls = s.match(/https?:\/\/[^\s'"<>]+/gi);
  if (urls && urls.length) {
    return urls[0].replace(/[.,;]+$/, '');
  }
  return s.length <= 2000 ? s : s.slice(0, 2000);
}

async function logPublicLead(supabase, leadId, email, name, projectId) {
  try {
    await supabase.from('agency_activity').insert({
      actor_id: null,
      action: 'lead_submitted',
      entity_type: 'lead',
      entity_id: leadId,
      metadata: {
        email,
        source: 'public_contact',
        name: name || null,
        project_id: projectId || null,
      },
    });
  } catch (e) {
    console.warn('agency_activity (lead)', e.message);
  }
}
const contactRateLimit = require('../lib/createContactRateLimiter');

const router = express.Router();

router.post('/', contactRateLimit, async (req, res) => {
  try {
    const hp = (req.body && req.body.cs_hp_website != null && String(req.body.cs_hp_website).trim()) || '';
    if (hp) {
      return res.json({ success: true, id: 'filtered' });
    }

    const {
      name,
      email,
      phone,
      company,
      service_type,
      budget,
      timeline,
      message,
      current_url,
      project_id: projectRaw,
    } = req.body || {};

    /** Optional – ties this lead to a hosted Site builder project (`public.leads.project_id`). */
    let projectId = null;
    if (projectRaw != null && String(projectRaw).trim()) {
      const pid = String(projectRaw).trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pid)) {
        projectId = pid;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid project reference' });
      }
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const row = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone && String(phone).trim()) || null,
      company: (company && String(company).trim()) || null,
      service_type: (service_type && String(service_type).trim()) || null,
      budget: (budget && String(budget).trim()) || null,
      timeline: (timeline && String(timeline).trim()) || null,
      message: message.trim(),
      current_url: normalizeLeadUrl(current_url),
      status: 'New',
    };
    if (projectId) {
      /** @type {any} */
      row.project_id = projectId;
    }

    const supabase = getService();
    if (projectId) {
      const { data: pr, error: pe } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
      if (pe) {
        console.error('lead project lookup', pe);
        return res.status(500).json({ success: false, error: 'Could not validate project' });
      }
      if (!pr) {
        return res.status(400).json({ success: false, error: 'Unknown project — check Site builder ID' });
      }
    }

    const { data, error } = await supabase.from('leads').insert(row).select('id').single();

    if (error) {
      console.error('leads insert', error);
      const hint = String(error.message || '');
      if (/project_id|column|schema|migration/i.test(hint)) {
        return res.status(503).json({
          success: false,
          error: 'Lead storage pending database update. Ask your administrator to apply migration 018_leads_project_id.sql.',
        });
      }
      return res.status(500).json({ success: false, error: 'Could not save lead' });
    }

    try {
      await logPublicLead(supabase, data.id, row.email, row.name, projectId || null);
    } catch (e) {
      /* non-fatal */
    }

    try {
      await sendLeadNotification(row);
    } catch (e) {
      console.error('sendLeadNotification', e);
    }
    try {
      await sendLeadConfirmation(row.email, row.name);
    } catch (e) {
      console.error('sendLeadConfirmation', e);
    }

    return res.json({ success: true, id: data.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
