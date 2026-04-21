'use strict';

const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const { getService } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../lib/email');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

router.use(requireAuth, requireAdmin);

router.get('/leads', async (_req, res) => {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ leads: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['New', 'Contacted', 'Proposal Sent', 'Closed Won', 'Closed Lost'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', allowed });
    }
    const supabase = getService();
    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ lead: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getService();
    const { data: lead, error: lErr } = await supabase.from('leads').select('*').eq('id', id).single();
    if (lErr || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const email = String(lead.email).trim().toLowerCase();
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) {
      return res.status(400).json({ error: 'A portal user with this email already exists' });
    }

    const tempPassword = crypto.randomBytes(10).toString('base64url').slice(0, 14);
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: lead.name },
    });
    if (cErr) {
      return res.status(400).json({ error: cErr.message });
    }

    const uid = created.user.id;
    const { error: uErr } = await supabase.from('users').insert({
      id: uid,
      email,
      full_name: lead.name,
      company: lead.company || null,
      role: 'client',
    });
    if (uErr) {
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: uErr.message });
    }

    const projectName = (lead.company && String(lead.company).trim())
      ? `${String(lead.company).trim()} — website`
      : `${lead.name} — website`;

    const { data: proj, error: pErr } = await supabase.from('projects').insert({
      client_id: uid,
      name: projectName,
      status: 'discovery',
      website_type: lead.service_type || null,
      internal_notes: lead.message ? `Original lead:\n${lead.message}` : null,
    }).select().single();

    if (pErr) {
      console.error('project insert after convert', pErr);
    }

    await supabase.from('leads').update({ status: 'Closed Won' }).eq('id', id);

    try {
      await sendWelcomeEmail(email, tempPassword);
    } catch (mailErr) {
      console.error(mailErr);
    }

    return res.json({
      success: true,
      client_id: uid,
      project_id: proj?.id || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects', async (_req, res) => {
  try {
    const supabase = getService();
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name, company')
      .eq('role', 'client');
    const umap = Object.fromEntries((users || []).map((u) => [u.id, u]));
    const enriched = (projects || []).map((p) => ({
      ...p,
      client: umap[p.client_id] || null,
    }));
    return res.json({ projects: enriched });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const { client_id, name, status, website_type, internal_notes } = req.body || {};
    if (!client_id || !name || !String(name).trim()) {
      return res.status(400).json({ error: 'client_id and name are required' });
    }
    const allowed = ['discovery', 'design', 'development', 'review', 'live'];
    const st = status && allowed.includes(status) ? status : 'discovery';
    const supabase = getService();
    const insert = {
      client_id,
      name: String(name).trim(),
      status: st,
      website_type: (website_type && String(website_type).trim()) || null,
      internal_notes: (internal_notes && String(internal_notes).trim()) || null,
    };
    if (st === 'live') {
      insert.launched_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from('projects').insert(insert).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, project: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/clients', async (_req, res) => {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, company, role, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ clients: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/clients/:id', async (req, res) => {
  try {
    const supabase = getService();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, company, role, created_at')
      .eq('id', req.params.id)
      .single();
    if (error || !user) return res.status(404).json({ error: 'Not found' });

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', user.id);

    return res.json({ client: user, projects: projects || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const { email, full_name, company } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const tempPassword = crypto.randomBytes(10).toString('base64url').slice(0, 14);
    const supabase = getService();

    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });

    if (cErr) {
      return res.status(400).json({ error: cErr.message });
    }

    const uid = created.user.id;

    const { error: uErr } = await supabase.from('users').insert({
      id: uid,
      email: String(email).trim().toLowerCase(),
      full_name: (full_name && String(full_name).trim()) || null,
      company: (company && String(company).trim()) || null,
      role: 'client',
    });

    if (uErr) {
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: uErr.message });
    }

    try {
      await sendWelcomeEmail(String(email).trim().toLowerCase(), tempPassword);
    } catch (mailErr) {
      console.error(mailErr);
    }

    return res.json({
      success: true,
      client: {
        id: uid,
        email: String(email).trim().toLowerCase(),
        full_name: full_name || null,
        company: company || null,
        role: 'client',
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function getProjectIdForClient(supabase, clientId) {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

router.post('/projects/:clientId/update', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const supabase = getService();
    let projectId = await getProjectIdForClient(supabase, clientId);
    if (!projectId) {
      const { data: proj, error: pErr } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: 'Website project',
          status: 'discovery',
        })
        .select()
        .single();
      if (pErr) return res.status(500).json({ error: pErr.message });
      projectId = proj.id;
    }

    const { data, error } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        message: String(message).trim(),
        posted_by: req.profile.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, update: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/projects/:clientId/status', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.body || {};
    const allowed = ['discovery', 'design', 'development', 'review', 'live'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', allowed });
    }

    const supabase = getService();
    let projectId = await getProjectIdForClient(supabase, clientId);
    if (!projectId) {
      const { data: proj, error: pErr } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: 'Website project',
          status,
        })
        .select()
        .single();
      if (pErr) return res.status(500).json({ error: pErr.message });
      return res.json({ success: true, project: proj });
    }

    const updates = { status };
    if (status === 'live') {
      updates.launched_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, project: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:clientId/files', async (req, res) => {
  try {
    const supabase = getService();
    const projectId = await getProjectIdForClient(supabase, req.params.clientId);
    if (!projectId) return res.json({ files: [] });

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ files: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:clientId/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file field required (multipart/form-data)' });
    }

    const { clientId } = req.params;
    const supabase = getService();
    let projectId = await getProjectIdForClient(supabase, clientId);
    if (!projectId) {
      const { data: proj, error: pErr } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: 'Website project',
          status: 'discovery',
        })
        .select()
        .single();
      if (pErr) return res.status(500).json({ error: pErr.message });
      projectId = proj.id;
    }

    const safeName = req.file.originalname.replace(/[^\w.\-]+/g, '_');
    const path = `${clientId}/${projectId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from('project-files')
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    if (upErr) {
      console.error(upErr);
      return res.status(500).json({ error: 'Upload failed: ' + upErr.message });
    }

    const { data: pub } = supabase.storage.from('project-files').getPublicUrl(path);
    const fileUrl = pub?.publicUrl || path;

    const { data: row, error: insErr } = await supabase
      .from('files')
      .insert({
        project_id: projectId,
        file_name: req.file.originalname,
        file_url: fileUrl,
        uploaded_by: req.profile.id,
      })
      .select()
      .single();

    if (insErr) return res.status(500).json({ error: insErr.message });
    return res.json({ success: true, file: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const { client_id, amount, description, due_date } = req.body || {};
    if (!client_id || amount == null) {
      return res.status(400).json({ error: 'client_id and amount are required' });
    }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const supabase = getService();
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id,
        amount: amt,
        description: (description && String(description)) || null,
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, invoice: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invoices', async (_req, res) => {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ invoices: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { project_id, content } = req.body || {};
    if (!project_id || !content || !String(content).trim()) {
      return res.status(400).json({ error: 'project_id and content required' });
    }

    const supabase = getService();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id,
        sender_id: req.profile.id,
        content: String(content).trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
