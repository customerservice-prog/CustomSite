'use strict';

const express = require('express');
const { getService } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.profile.role === 'admin') {
      return res.json({
        project: null,
        updates: [],
        files: [],
        invoices: [],
        isAdmin: true,
      });
    }

    const supabase = getService();
    const clientId = req.profile.id;

    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pErr) {
      console.error(pErr);
      return res.status(500).json({ error: 'Could not load project' });
    }

    const project = projects && projects[0] ? projects[0] : null;

    if (!project) {
      return res.json({
        project: null,
        updates: [],
        files: [],
        invoices: [],
      });
    }

    const projectId = project.id;

    const [{ data: updates }, { data: files }, { data: invoices }] = await Promise.all([
      supabase
        .from('project_updates')
        .select('id, message, created_at, posted_by')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('files')
        .select('id, file_name, file_url, uploaded_at, uploaded_by')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ]);

    const base = process.env.PUBLIC_SITE_URL || '';
    const previewPath = `/preview/${projectId}`;
    const previewUrl = base ? `${base.replace(/\/$/, '')}${previewPath}` : previewPath;

    return res.json({
      project,
      updates: updates || [],
      files: files || [],
      invoices: invoices || [],
      previewUrl,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Dashboard error' });
  }
});

module.exports = router;
