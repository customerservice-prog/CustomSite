'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function getClientProjectId(supabase, clientId) {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.profile.role === 'admin') {
      return res.status(400).json({ error: 'Admin should use admin tools' });
    }

    const supabase = getService();
    const projectId = await getClientProjectId(supabase, req.profile.id);
    if (!projectId) {
      return res.json({ messages: [] });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, project_id, sender_id, content, created_at, is_read')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load messages' });
    }

    return res.json({ messages: messages || [] });
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

    const { content } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const supabase = getService();
    const projectId = await getClientProjectId(supabase, req.profile.id);
    if (!projectId) {
      return res.status(400).json({ error: 'No project assigned yet' });
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
