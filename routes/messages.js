'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function clientProjectRows(supabase, clientId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

function pickOwnedProject(bodyProjectId, /** @type {string[]} */ allowedIds) {
  if (!allowedIds.length) return null;
  const first = allowedIds[0];
  if (!bodyProjectId || !String(bodyProjectId).trim()) return first || null;
  const pid = String(bodyProjectId).trim();
  return allowedIds.includes(pid) ? pid : first || null;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.profile.role === 'admin') {
      return res.status(400).json({ error: 'Admin should use admin tools' });
    }

    const supabase = getService();
    const projects = await clientProjectRows(supabase, req.profile.id);
    const ids = projects.map((r) => r.id);
    if (!ids.length) {
      return res.json({
        messages: [],
        contactLeads: [],
        projects: [],
      });
    }

    const nameMap = {};
    projects.forEach((p) => {
      nameMap[p.id] = p.name || '';
    });

    const { data: msgs, error: mErr } = await supabase
      .from('messages')
      .select('id, project_id, sender_id, content, created_at, is_read')
      .in('project_id', ids)
      .order('created_at', { ascending: true });

    if (mErr) {
      console.error(mErr);
      return res.status(500).json({ error: 'Could not load messages' });
    }

    const withNames = (msgs || []).map((m) =>
      Object.assign({}, m, { project_name: nameMap[m.project_id] || null })
    );

    let contactLeads = [];
    /** When migration 018 is missing, degrade gracefully instead of failing the whole inbox. */
    const { data: leads, error: lErr } = await supabase
      .from('leads')
      .select('*')
      .in('project_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);

    if (lErr) {
      if (/project_id|column|does not exist/i.test(String(lErr.message || ''))) {
        contactLeads = [];
      } else {
        console.error(lErr);
        return res.status(500).json({ error: 'Could not load visitor messages' });
      }
    } else {
      contactLeads = (leads || []).map((L) =>
        Object.assign({}, L, { project_name: nameMap[L.project_id] || null })
      );
    }

    return res.json({
      messages: withNames,
      contactLeads,
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.profile.role === 'admin') {
      return res.status(400).json({ error: 'Use admin endpoint to post as admin' });
    }

    const { content, project_id: bodyProjectId } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const supabase = getService();
    const projects = await clientProjectRows(supabase, req.profile.id);
    const ids = projects.map((r) => r.id);
    if (!ids.length) {
      return res.status(400).json({ error: 'No projects assigned yet' });
    }

    const projectId = pickOwnedProject(bodyProjectId, ids);
    if (!projectId) {
      return res.status(400).json({ error: 'Pick a valid project thread for your account' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        sender_id: req.profile.id,
        content: String(content).trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not send message' });
    }

    return res.json({ success: true, message: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
