'use strict';

const express = require('express');
const multer = require('multer');
const dns = require('dns').promises;
const { getService } = require('../lib/supabase');
const { getTemplateFiles, TEMPLATE_KEYS } = require('../lib/siteTemplates');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addServeBundle, createZipBuffer } = require('../lib/bundleStaticSite');
const { testToken, createProject } = require('../lib/railwayGql');

const router = express.Router();
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

router.use(requireAuth, requireAdmin);

function normalizePath(p) {
  if (!p || typeof p !== 'string') return null;
  const s = p.replace(/\\/g, '/').trim();
  if (s.includes('..') || s.startsWith('/')) return null;
  return s;
}

/** Postgres `uuid` columns reject non-UUID strings (e.g. legacy demo ids). */
function isUuidParam(id) {
  return (
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
  );
}

function safeSelectSiteFiles() {
  return 'path, content, updated_at, content_encoding';
}

router.get('/projects/:projectId/site', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    let data;
    let error;
    const try1 = await supabase
      .from('site_files')
      .select(safeSelectSiteFiles())
      .eq('project_id', projectId)
      .order('path');
    ({ data, error } = try1);
    if (error) {
      if (!/content_encoding/.test(String(error.message))) {
        return res.status(500).json({ error: error.message });
      }
      const try2 = await supabase
        .from('site_files')
        .select('path, updated_at')
        .eq('project_id', projectId)
        .order('path');
      data = try2.data;
      error = try2.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    const files = (data || []).map((row) => ({
      path: row.path,
      updated_at: row.updated_at,
      content_encoding: row.content_encoding || 'utf8',
    }));
    return res.json({ files });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = normalizePath(req.query.path);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const supabase = getService();
    const try1 = await supabase
      .from('site_files')
      .select('content, updated_at, content_encoding')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();
    let row = try1.data;
    let err = try1.error;
    if (err && /content_encoding/.test(String(err.message))) {
      const try2 = await supabase
        .from('site_files')
        .select('content, updated_at')
        .eq('project_id', projectId)
        .eq('path', filePath)
        .maybeSingle();
      row = try2.data;
      err = try2.error;
    }
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({
      path: filePath,
      content: row.content,
      content_encoding: row.content_encoding || 'utf8',
      updated_at: row.updated_at,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: rawPath, content, content_encoding: encIn } = req.body || {};
    const filePath = normalizePath(rawPath);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const encoding = encIn === 'base64' ? 'base64' : 'utf8';
    const text = content == null ? '' : String(content);
    if (encoding === 'utf8' && Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
      return res.status(400).json({ error: 'File too large (max 2MB for text)' });
    }
    if (encoding === 'base64' && Buffer.byteLength(text, 'utf8') > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'File too large (max 4MB for images)' });
    }
    const supabase = getService();
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from('site_files')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();

    const baseRow = { content: text, updated_at: now, content_encoding: encoding };
    const insertRow = { project_id: projectId, path: filePath, ...baseRow };

    async function writePlain(rowPlain) {
      if (existing) {
        return supabase
          .from('site_files')
          .update(rowPlain)
          .eq('id', existing.id)
          .select()
          .single();
      }
      return supabase
        .from('site_files')
        .insert({ project_id: projectId, path: filePath, ...rowPlain })
        .select()
        .single();
    }

    let data;
    let error;
    if (existing) {
      ({ data, error } = await supabase
        .from('site_files')
        .update(baseRow)
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from('site_files')
        .insert(insertRow)
        .select()
        .single());
    }
    if (error && /content_encoding/.test(String(error.message))) {
      const rowPlain = { content: text, updated_at: now };
      ({ data, error } = await writePlain(rowPlain));
    } else if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, file: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/projects/:projectId/site/file', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = normalizePath(req.query.path);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const supabase = getService();
    const { error } = await supabase
      .from('site_files')
      .delete()
      .eq('project_id', projectId)
      .eq('path', filePath);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/site-builder/templates', (_req, res) => {
  return res.json({ templates: TEMPLATE_KEYS });
});

router.post('/projects/:projectId/site/init', async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isUuidParam(projectId)) {
      return res.status(400).json({
        error:
          'Invalid project id: expected a UUID (Postgres site_files uses uuid). Use a project created in Admin, or align demo seed ids with your database.',
      });
    }
    const supabase = getService();
    const { data: projRow, error: projErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId.trim())
      .maybeSingle();
    if (projErr) return res.status(500).json({ error: projErr.message });
    if (!projRow) {
      return res.status(404).json({
        error:
          'Project not found in the database. Create this project in Admin (or insert it in Supabase) before starting the site template.',
      });
    }
    const templateId = (req.body && req.body.template) || 'basic';
    const files = getTemplateFiles(templateId);
    const now = new Date().toISOString();
    for (const [path, content] of Object.entries(files)) {
      const { data: row } = await supabase
        .from('site_files')
        .select('id')
        .eq('project_id', projectId)
        .eq('path', path)
        .maybeSingle();
      if (row) {
        const { error } = await supabase
          .from('site_files')
          .update({ content, updated_at: now, content_encoding: 'utf8' })
          .eq('id', row.id);
        if (error && /content_encoding/.test(String(error.message))) {
          const e2 = await supabase
            .from('site_files')
            .update({ content, updated_at: now })
            .eq('id', row.id);
          if (e2.error) return res.status(500).json({ error: e2.error.message });
        } else if (error) {
          return res.status(500).json({ error: error.message });
        }
      } else {
        const insert = { project_id: projectId, path, content, updated_at: now, content_encoding: 'utf8' };
        let { error } = await supabase.from('site_files').insert(insert);
        if (error && /content_encoding/.test(String(error.message))) {
          delete insert.content_encoding;
          ({ error } = await supabase.from('site_files').insert(insert));
        }
        if (error) return res.status(500).json({ error: error.message });
      }
    }
    return res.json({ success: true, paths: Object.keys(files), template: templateId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function listProjectFileRows(supabase, projectId) {
  let q = await supabase
    .from('site_files')
    .select('path, content, content_encoding')
    .eq('project_id', projectId);
  if (q.error && /content_encoding/.test(String(q.error.message))) {
    q = await supabase.from('site_files').select('path, content').eq('project_id', projectId);
  }
  if (q.error) throw new Error(q.error.message);
  return q.data || [];
}

function rowsToBundleFiles(rows) {
  return (rows || []).map((r) => ({
    path: r.path,
    content: r.content,
    encoding: (r.content_encoding || 'utf8') === 'base64' ? 'base64' : 'utf8',
  }));
}

router.get('/projects/:projectId/site/export', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const rows = await listProjectFileRows(supabase, projectId);
    const files = addServeBundle(rowsToBundleFiles(rows));
    const buf = await createZipBuffer(files);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}.zip"`);
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.get('/projects/:projectId/builder', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const pick = 'id, name, status, client_id, railway_url_staging, railway_url_production, custom_domain, site_settings, created_at, website_type';
    let { data, error } = await supabase.from('projects').select(pick).eq('id', projectId).maybeSingle();
    if (error && /railway_|custom_domain|site_settings|website_type/.test(String(error.message))) {
      const r2 = await supabase.from('projects').select('id, name, status, client_id, created_at').eq('id', projectId).maybeSingle();
      data = r2.data;
      error = r2.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    let client = null;
    if (data.client_id) {
      const c = await supabase.from('users').select('email, full_name, company').eq('id', data.client_id).maybeSingle();
      if (!c.error) client = c.data;
    }
    return res.json({ project: { ...data, client } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/projects/:projectId/builder', async (req, res) => {
  try {
    const { projectId } = req.params;
    const b = req.body || {};
    const supabase = getService();
    const patch = {};
    if (b.railway_url_staging !== undefined) patch.railway_url_staging = b.railway_url_staging;
    if (b.railway_url_production !== undefined) patch.railway_url_production = b.railway_url_production;
    if (b.railway_project_id_staging !== undefined) patch.railway_project_id_staging = b.railway_project_id_staging;
    if (b.railway_project_id_production !== undefined) patch.railway_project_id_production = b.railway_project_id_production;
    if (b.railway_service_id_staging !== undefined) patch.railway_service_id_staging = b.railway_service_id_staging;
    if (b.railway_service_id_production !== undefined) patch.railway_service_id_production = b.railway_service_id_production;
    if (b.custom_domain !== undefined) patch.custom_domain = b.custom_domain;
    if (b.site_settings !== undefined) patch.site_settings = b.site_settings;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No valid fields' });
    }
    const { data, error } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .select()
      .single();
    if (error) {
      if (/railway_/.test(String(error.message)) || /site_settings/.test(String(error.message))) {
        return res.status(400).json({
          error: 'Run migration migration_site_builder_v2.sql in Supabase to enable these fields.',
        });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ project: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/site/upload-asset', upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { originalname, buffer, mimetype } = req.file;
    if (!/image\/(png|jpe?g|gif|webp|svg\+xml|svg)/i.test(mimetype) && !/\.svg$/i.test(originalname)) {
      return res.status(400).json({ error: 'Only image uploads allowed' });
    }
    let rel = (req.body && req.body.path) || `assets/${originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
    rel = normalizePath(rel);
    if (!rel) return res.status(400).json({ error: 'Invalid path' });
    if (!rel.startsWith('assets/')) {
      rel = `assets/${rel.replace(/^assets\//, '')}`;
    }
    const b64 = buffer.toString('base64');
    const supabase = getService();
    const now = new Date().toISOString();
    const row = { project_id: projectId, path: rel, content: b64, updated_at: now, content_encoding: 'base64' };
    const { data: ex } = await supabase
      .from('site_files')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', rel)
      .maybeSingle();
    let err;
    if (ex) {
      const u = await supabase.from('site_files').update(row).eq('id', ex.id);
      err = u.error;
    } else {
      const ins = await supabase.from('site_files').insert(row);
      err = ins.error;
    }
    if (err && /content_encoding/.test(String(err.message))) {
      const r2 = { project_id: projectId, path: rel, content: b64, updated_at: now };
      if (ex) {
        const u = await supabase.from('site_files').update(r2).eq('id', ex.id);
        err = u.error;
      } else {
        const ins = await supabase.from('site_files').insert(r2);
        err = ins.error;
      }
      if (err) return res.status(500).json({ error: err.message, hint: 'Add content_encoding to site_files (migration)' });
    } else if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ success: true, path: rel, content_encoding: 'base64' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/railway/verify', async (req, res) => {
  try {
    const token = (req.body && req.body.token) || process.env.RAILWAY_API_TOKEN;
    if (!token) {
      return res.status(400).json({ error: 'Pass token in body or set RAILWAY_API_TOKEN' });
    }
    const t = await testToken(token);
    if (!t.ok) return res.status(400).json({ error: t.error });
    return res.json({ ok: true, me: t.me, teams: t.teams });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/deploy', async (req, res) => {
  try {
    const { projectId } = req.params;
    const body = req.body || {};
    const environment = body.environment === 'production' ? 'production' : 'staging';
    const teamId = body.teamId || process.env.RAILWAY_TEAM_ID;
    const token = body.token || process.env.RAILWAY_API_TOKEN;
    const supabase = getService();
    const { data: proj, error: perr } = await supabase
      .from('projects')
      .select('id, name, railway_url_staging, railway_url_production, railway_project_id_staging, railway_project_id_production')
      .eq('id', projectId)
      .maybeSingle();
    if (perr) {
      if (/railway_/.test(String(perr.message))) {
        return res.status(400).json({ error: 'Run migration migration_site_builder_v2.sql' });
      }
      return res.status(500).json({ error: perr.message });
    }
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    const rows = await listProjectFileRows(supabase, projectId);
    if (!rows.length) {
      return res.status(400).json({ error: 'No site files to deploy. Init a starter or add files first.' });
    }
    const files = addServeBundle(rowsToBundleFiles(rows));
    const zipBuffer = await createZipBuffer(files);
    const steps = [];
    const push = (id, label, status, detail) => {
      steps.push({ id, label, status, detail, at: new Date().toISOString() });
    };
    push('bundle', 'Bundling project files and serve config', 'done', `${files.length} files`);
    if (!token) {
      return res.json({
        ok: true,
        partial: true,
        environment,
        steps,
        message:
          'No RAILWAY_API_TOKEN. Configure it on the server, then redeploy. Below is a downloadable bundle you can deploy with Railway CLI (railway link && railway up) or by connecting a GitHub repo.',
        zipBytes: zipBuffer.length,
        manualUrl: `/api/admin/projects/${projectId}/site/export`,
      });
    }
    const t0 = await testToken(token);
    if (!t0.ok) {
      push('token', 'Verify Railway API token', 'error', t0.error);
      return res.status(400).json({ ok: false, steps, error: t0.error });
    }
    push('token', 'Verify Railway API token', 'done', t0.me && t0.me.email ? t0.me.email : 'ok');
    if (!teamId) {
      push('team', 'Team ID for project create', 'error', 'Set RAILWAY_TEAM_ID or pass teamId in the request');
      return res.status(400).json({
        ok: false,
        steps,
        error: 'RAILWAY_TEAM_ID required. Copy your team (workspace) id from Railway account settings or GraphiQL me{teams}.',
      });
    }
    const slug = `customsite-${String(projectId).slice(0, 8)}-${environment}`;
    const rname = (proj.name || 'site') + (environment === 'production' ? ' (prod)' : ' (staging)');
    const cproj = await createProject(token, { name: `${rname}`.slice(0, 64), teamId, description: `CustomSite static deploy ${projectId}` });
    if (cproj.error) {
      push('create', 'Create Railway project', 'error', cproj.error);
      return res.status(400).json({ ok: false, steps, error: cproj.error, zipBytes: zipBuffer.length });
    }
    push('create', 'Create Railway project', 'done', cproj.id);
    const railwayProjectId = cproj.id;
    const publicUrl = `https://${slug}.up.railway.app`;
    const patch = {};
    if (environment === 'production') {
      patch.railway_url_production = publicUrl;
      patch.railway_project_id_production = railwayProjectId;
    } else {
      patch.railway_url_staging = publicUrl;
      patch.railway_project_id_staging = railwayProjectId;
    }
    const { error: uerr } = await supabase.from('projects').update(patch).eq('id', projectId);
    if (uerr && !/railway_/.test(String(uerr.message))) {
      console.warn(uerr);
    }
    push(
      'code',
      'Connect source in Railway',
      'pending',
      'Upload this ZIP in Railway (empty service → deploy from local via CLI) or connect Git. Bundle ready via GET /api/admin/projects/{id}/site/export'
    );
    return res.json({
      ok: true,
      environment,
      steps,
      railwayProjectId,
      publicUrl,
      projectName: cproj.name,
      note:
        'Railway needs a connected Git repository or a CLI deploy to host these files. Your project was created in Railway — open the dashboard, create an empty service, then run: railway link <id> in the unzipped folder, or connect a GitHub repo and push. The staging/production URL is stored on this CustomSite project once migration is applied.',
      downloadZip: `/api/admin/projects/${projectId}/site/export`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.get('/site-builder/dns-check', async (req, res) => {
  try {
    const host = (req.query.host || '').replace(/^https?:\/\//, '').split('/')[0].trim();
    if (!host) return res.status(400).json({ error: 'host query required' });
    const cname = await dns.resolveCname(host).catch(() => null);
    const a = cname ? null : await dns.resolve4(host).catch(() => null);
    return res.json({ host, cname, a: a || null, ok: !!(cname || a) });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'lookup failed' });
  }
});

module.exports = router;
