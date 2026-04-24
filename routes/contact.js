'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { sendLeadNotification, sendLeadConfirmation } = require('../lib/email');

async function logPublicLead(supabase, leadId, email) {
  try {
    await supabase.from('agency_activity').insert({
      actor_id: null,
      action: 'lead_submitted',
      entity_type: 'lead',
      entity_id: leadId,
      metadata: { email, source: 'public_contact' },
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
    } = req.body || {};

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
      current_url: (current_url && String(current_url).trim()) || null,
      status: 'New',
    };

    const supabase = getService();
    const { data, error } = await supabase.from('leads').insert(row).select('id').single();

    if (error) {
      console.error('leads insert', error);
      return res.status(500).json({ success: false, error: 'Could not save lead' });
    }

    try {
      await logPublicLead(supabase, data.id, row.email);
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
