'use strict';

const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const { getService } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendInvoiceEmail } = require('../lib/email');

const router = express.Router();

async function logActivity(supabase, actorId, action, entityType, entityId, metadata) {
  try {
    await supabase.from('agency_activity').insert({
      actor_id: actorId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
    });
  } catch (e) {
    console.warn('activity log', e.message);
  }
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

router.use(requireAuth, requireAdmin);

/**
 * True if the service role can read the projects table (schema applied).
 */
router.get('/db-health', async (req, res) => {
  try {
    const supabase = getService();
    const { error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    if (error) {
      return res.json({
        ok: false,
        code: 'DB_QUERY_FAILED',
        message: error.message,
        hint:
          'Run the SQL in supabase/migrations (001, 002, 003) in the Supabase SQL Editor. See docs/LAUNCH-PHASES.md.',
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.json({
      ok: false,
      code: 'EXCEPTION',
      message: e && e.message ? e.message : String(e),
    });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const { name, email, company, source, message } = req.body || {};
    if (!name || !String(name).trim() || !email || !String(email).includes('@')) {
      return res.status(400).json({ error: 'name and valid email are required' });
    }
    const supabase = getService();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        company: (company && String(company).trim()) || null,
        message: (message && String(message).trim()) || 'Added manually from admin',
        service_type: (source && String(source).trim()) || 'Manual',
        status: 'New',
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'lead.create', 'lead', data.id, { email: data.email });
    return res.json({ success: true, lead: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, message, status, phone, service_type, budget, timeline } = req.body || {};
    const supabase = getService();
    const patch = {};
    if (name != null) patch.name = String(name).trim();
    if (email != null) patch.email = String(email).trim().toLowerCase();
    if (company !== undefined) patch.company = company;
    if (message !== undefined) patch.message = message;
    if (phone !== undefined) patch.phone = phone;
    if (service_type !== undefined) patch.service_type = service_type;
    if (budget !== undefined) patch.budget = budget;
    if (timeline !== undefined) patch.timeline = timeline;
    if (status != null) {
      const allowed = ['New', 'Contacted', 'Proposal Sent', 'Closed Won', 'Closed Lost'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status', allowed });
      }
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { data, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'lead.update', 'lead', id, patch);
    return res.json({ lead: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getService();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'lead.delete', 'lead', id, {});
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

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

router.post('/project-updates', async (req, res) => {
  try {
    const { project_id, message } = req.body || {};
    if (!project_id || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'project_id and message are required' });
    }
    const supabase = getService();
    const { data: proj, error: pe } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .maybeSingle();
    if (pe || !proj) return res.status(404).json({ error: 'Project not found' });
    const { data, error } = await supabase
      .from('project_updates')
      .insert({
        project_id,
        message: String(message).trim(),
        posted_by: req.profile.id,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'project.update_posted', 'project', project_id, null);
    return res.json({ success: true, update: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/entity/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, status, website_type, internal_notes } = req.body || {};
    const allowed = ['discovery', 'design', 'development', 'review', 'live'];
    const supabase = getService();
    const updates = {};
    if (name != null) updates.name = String(name).trim();
    if (status != null) {
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status', allowed });
      }
      updates.status = status;
      if (status === 'live') {
        updates.launched_at = new Date().toISOString();
      }
    }
    if (website_type !== undefined) {
      updates.website_type = (website_type && String(website_type).trim()) || null;
    }
    if (internal_notes !== undefined) {
      updates.internal_notes = (internal_notes && String(internal_notes).trim()) || null;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'project.update', 'project', projectId, updates);
    return res.json({ success: true, project: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/entity/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'project.delete', 'project', projectId, null);
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/by-project/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
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

router.delete('/files/:id', async (req, res) => {
  try {
    const supabase = getService();
    const { data: row, error: fe } = await supabase
      .from('files')
      .select('id, file_url, project_id')
      .eq('id', req.params.id)
      .single();
    if (fe || !row) return res.status(404).json({ error: 'File not found' });
    const { error } = await supabase.from('files').delete().eq('id', row.id);
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'file.delete', 'file', row.id, { project_id: row.project_id });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/activity', async (_req, res) => {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from('agency_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      if (String(error.message || '').includes('does not exist')) {
        return res.json({ events: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ events: data || [] });
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
      .select('id, email, full_name, company, phone, website, timezone, role, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false });
    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('users')
        .select('id, email, full_name, company, role, created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: false });
      if (e2) return res.status(500).json({ error: e2.message });
      return res.json({ clients: d2 || [] });
    }
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

router.patch('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, company, phone, website, timezone } = req.body || {};
    const supabase = getService();
    const patch = {};
    if (full_name !== undefined) patch.full_name = (full_name && String(full_name).trim()) || null;
    if (company !== undefined) patch.company = (company && String(company).trim()) || null;
    if (phone !== undefined) patch.phone = (phone && String(phone).trim()) || null;
    if (website !== undefined) patch.website = (website && String(website).trim()) || null;
    if (timezone !== undefined) patch.timezone = (timezone && String(timezone).trim()) || null;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .eq('role', 'client')
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'client.update', 'client', id, patch);
    return res.json({ client: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getService();
    const { error: aErr } = await supabase.auth.admin.deleteUser(id);
    if (aErr) return res.status(500).json({ error: aErr.message });
    await logActivity(supabase, req.profile.id, 'client.delete', 'client', id, {});
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const { email, full_name, company, phone, website, timezone } = req.body || {};
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

    const row = {
      id: uid,
      email: String(email).trim().toLowerCase(),
      full_name: (full_name && String(full_name).trim()) || null,
      company: (company && String(company).trim()) || null,
      role: 'client',
    };
    if (phone !== undefined) row.phone = (phone && String(phone).trim()) || null;
    if (website !== undefined) row.website = (website && String(website).trim()) || null;
    if (timezone !== undefined) row.timezone = (timezone && String(timezone).trim()) || null;

    const { error: uErr } = await supabase.from('users').insert(row);

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
    const { client_id, amount, description, due_date, project_id, line_items } = req.body || {};
    if (!client_id || amount == null) {
      return res.status(400).json({ error: 'client_id and amount are required' });
    }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const supabase = getService();
    const { data: cli } = await supabase
      .from('users')
      .select('email')
      .eq('id', client_id)
      .maybeSingle();

    const insert = {
      client_id,
      customer_email: cli?.email || null,
      amount: amt,
      description: (description && String(description)) || null,
      due_date: due_date || null,
      status: 'pending',
    };
    if (project_id) insert.project_id = project_id;
    if (line_items != null) insert.line_items = line_items;

    const { data, error } = await supabase
      .from('invoices')
      .insert(insert)
      .select()
      .single();

    if (error) {
      const { data: d2, error: e2 } = await supabase
        .from('invoices')
        .insert({
          client_id,
          customer_email: cli?.email || null,
          amount: amt,
          description: (description && String(description)) || null,
          due_date: due_date || null,
          status: 'pending',
        })
        .select()
        .single();
      if (e2) return res.status(500).json({ error: e2.message });
      await logActivity(supabase, req.profile.id, 'invoice.create', 'invoice', d2.id, null);
      return res.json({ success: true, invoice: d2 });
    }
    await logActivity(supabase, req.profile.id, 'invoice.create', 'invoice', data.id, null);
    return res.json({ success: true, invoice: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount, description, due_date, project_id } = req.body || {};
    const allowed = ['pending', 'paid', 'overdue'];
    const supabase = getService();
    const patch = {};
    if (status != null) {
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status', allowed });
      patch.status = status;
    }
    if (amount != null) {
      const amt = Number(amount);
      if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ error: 'Invalid amount' });
      patch.amount = amt;
    }
    if (description !== undefined) patch.description = description;
    if (due_date !== undefined) patch.due_date = due_date;
    if (project_id !== undefined) patch.project_id = project_id || null;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { data, error } = await supabase
      .from('invoices')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'invoice.update', 'invoice', id, patch);
    return res.json({ success: true, invoice: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const supabase = getService();
    const { error } = await supabase.from('invoices').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    await logActivity(supabase, req.profile.id, 'invoice.delete', 'invoice', req.params.id, {});
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/invoices/:id/send', async (req, res) => {
  try {
    const supabase = getService();
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !inv) return res.status(404).json({ error: 'Invoice not found' });
    let toEmail = inv.customer_email;
    if (!toEmail && inv.client_id) {
      const { data: u } = await supabase
        .from('users')
        .select('email')
        .eq('id', inv.client_id)
        .maybeSingle();
      toEmail = u?.email;
    }
    const { sent } = await sendInvoiceEmail({
      toEmail: toEmail || '',
      amount: inv.amount,
      description: inv.description,
      dueDate: inv.due_date,
      invoiceId: inv.id,
    });
    await logActivity(supabase, req.profile.id, 'invoice.send', 'invoice', inv.id, { sent });
    return res.json({ success: true, sent });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/invoices', async (_req, res) => {
  try {
    const supabase = getService();
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const { data: projects } = await supabase.from('projects').select('id, name');
    const pmap = Object.fromEntries((projects || []).map((p) => [p.id, p.name]));
    const { data: clients } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'client');
    const cmap = Object.fromEntries((clients || []).map((c) => [c.id, c]));
    const enriched = (invoices || []).map((inv) => ({
      ...inv,
      project_name: inv.project_id ? pmap[inv.project_id] || '—' : '—',
      client_label: inv.client_id
        ? ((cmap[inv.client_id] && cmap[inv.client_id].email) || '—')
        : '—',
    }));
    return res.json({ invoices: enriched });
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
    await logActivity(supabase, req.profile.id, 'message.send', 'project', project_id, null);
    return res.json({ success: true, message: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/time-entries', async (req, res) => {
  try {
    const { project_id, hours, description, worked_date } = req.body || {};
    if (!project_id || hours == null) {
      return res.status(400).json({ error: 'project_id and hours are required' });
    }
    const h = Number(hours);
    if (Number.isNaN(h) || h <= 0) return res.status(400).json({ error: 'Invalid hours' });
    const supabase = getService();
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        project_id,
        hours: h,
        description: (description && String(description).trim()) || null,
        worked_date: worked_date || new Date().toISOString().slice(0, 10),
        created_by: req.profile.id,
      })
      .select()
      .single();
    if (error) {
      if (String(error.message).includes('does not exist')) {
        return res.status(503).json({ error: 'Run supabase/migration_admin_overhaul.sql' });
      }
      return res.status(500).json({ error: error.message });
    }
    await logActivity(supabase, req.profile.id, 'time.log', 'project', project_id, { hours: h });
    return res.json({ success: true, entry: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/time-entries', async (req, res) => {
  try {
    const { project_id } = req.query;
    const supabase = getService();
    let q = supabase.from('time_entries').select('*').order('worked_date', { ascending: false });
    if (project_id) q = q.eq('project_id', project_id);
    const { data, error } = await q.limit(500);
    if (error) {
      if (String(error.message).includes('does not exist')) {
        return res.json({ entries: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ entries: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/contracts', async (_req, res) => {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from('agency_contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (String(error.message).includes('does not exist')) {
        return res.json({ contracts: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ contracts: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const { client_id, project_id, title, status, file_url } = req.body || {};
    if (!client_id || !title) {
      return res.status(400).json({ error: 'client_id and title are required' });
    }
    const supabase = getService();
    const { data, error } = await supabase
      .from('agency_contracts')
      .insert({
        client_id,
        project_id: project_id || null,
        title: String(title).trim(),
        status: (status && ['draft', 'sent', 'signed', 'void'].includes(status)) ? status : 'draft',
        file_url: (file_url && String(file_url).trim()) || null,
      })
      .select()
      .single();
    if (error) {
      if (String(error.message).includes('does not exist')) {
        return res.status(503).json({ error: 'Run supabase/migration_admin_overhaul.sql' });
      }
      return res.status(500).json({ error: error.message });
    }
    await logActivity(supabase, req.profile.id, 'contract.create', 'contract', data.id, null);
    return res.json({ success: true, contract: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, file_url, signed_at, project_id } = req.body || {};
    const supabase = getService();
    const patch = {};
    if (title != null) patch.title = String(title).trim();
    if (file_url !== undefined) patch.file_url = file_url;
    if (signed_at !== undefined) patch.signed_at = signed_at;
    if (project_id !== undefined) patch.project_id = project_id;
    if (status != null) {
      if (!['draft', 'sent', 'signed', 'void'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No fields' });
    const { data, error } = await supabase
      .from('agency_contracts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, contract: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/contracts/:id', async (req, res) => {
  try {
    const supabase = getService();
    const { error } = await supabase.from('agency_contracts').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
