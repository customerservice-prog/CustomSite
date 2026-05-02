'use strict';

const express = require('express');
const multer = require('multer');
const dns = require('dns').promises;
const { getService } = require('../lib/supabase');
const { getTemplateFiles, TEMPLATE_KEYS } = require('../lib/siteTemplates');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addServeBundle, createZipBuffer } = require('../lib/bundleStaticSite');
const { testToken, createCustomDomainForService } = require('../lib/railwayGql');
const { provisionStaticDeploy } = require('../lib/railwayStaticDeploy');
const { normalizeCustomDomainHost } = require('../lib/normalizeCustomDomainHost');
const { upsertProjectVideosFromHtmlContent } = require('../lib/projectVideosHtmlSync');

const router = express.Router();
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Matches `src/lib/data/demo-ids.ts` — friendly default name for seeded demo project id. */
const DEMO_BUILDER_PROJECT_ID = '00000000-0000-4000-8000-000000000002';

/**
 * When `site_files` insert fails FK (no `projects` row), create a minimal project owned by the signed-in admin.
 * Fixes demo UUIDs and any localStorage-only project id that never hit the DB.
 */
async function ensureProjectRowForSiteFiles(supabase, projectId, ownerUserId) {
  if (!projectId || !ownerUserId) return false;
  const { data: row, error: selErr } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
  if (selErr) {
    console.error('ensureProjectRowForSiteFiles select', selErr);
    return false;
  }
  if (row?.id) return true;
  const name =
    projectId === DEMO_BUILDER_PROJECT_ID ? 'E-Commerce Site (Tables & Chairs)' : 'Website project';
  const { error } = await supabase.from('projects').insert({
    id: projectId,
    client_id: ownerUserId,
    name,
    status: 'discovery',
  });
  if (error) {
    console.error('ensureProjectRowForSiteFiles insert', error);
    return false;
  }
  return true;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

/** Public image bucket (Supabase Dashboard → Storage). Override with CUSTOMSITE_STORAGE_BUCKET. */
const STORAGE_BUCKET = String(process.env.CUSTOMSITE_STORAGE_BUCKET || 'project-assets').trim() || 'project-assets';

async function uploadProjectImagePublicUrl(supabase, projectId, buffer, originalname, mimetype) {
  const safeBase = String(originalname || 'image').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `${String(projectId).trim()}/${Date.now()}-${safeBase}`;
  const up = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: mimetype || 'application/octet-stream',
    upsert: true,
  });
  if (up.error) {
    throw new Error(up.error.message || 'storage upload failed');
  }
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub?.publicUrl || null;
  return { storagePath, publicUrl };
}

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

const PROJECT_STATUS_ALLOWED = ['discovery', 'design', 'development', 'review', 'live'];

function hostingPatchFromBody(b) {
  const patch = {};
  if (!b || typeof b !== 'object') return patch;
  if (b.railway_url_staging !== undefined) patch.railway_url_staging = b.railway_url_staging;
  if (b.railway_url_production !== undefined) patch.railway_url_production = b.railway_url_production;
  if (b.railway_project_id_staging !== undefined) patch.railway_project_id_staging = b.railway_project_id_staging;
  if (b.railway_project_id_production !== undefined) patch.railway_project_id_production = b.railway_project_id_production;
  if (b.railway_service_id_staging !== undefined) patch.railway_service_id_staging = b.railway_service_id_staging;
  if (b.railway_service_id_production !== undefined) patch.railway_service_id_production = b.railway_service_id_production;
  if (b.custom_domain !== undefined) {
    const h = b.custom_domain == null || b.custom_domain === '' ? null : normalizeCustomDomainHost(b.custom_domain);
    patch.custom_domain = h;
  }
  return patch;
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
    const body = req.body || {};
    /** Accept path in JSON body (builder) or query string (mistaken clients). */
    const rawPath = body.path !== undefined && body.path !== null && body.path !== '' ? body.path : req.query.path;
    const { content, content_encoding: encIn } = body;
    const filePath = normalizePath(rawPath);
    if (!filePath) return res.status(400).json({ error: 'Invalid path' });
    const encoding = encIn === 'base64' ? 'base64' : 'utf8';
    const text = content == null ? '' : String(content);
    if (encoding === 'utf8' && Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
      return res.status(400).json({ error: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB for text)` });
    }
    if (encoding === 'base64' && Buffer.byteLength(text, 'utf8') > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: `File too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB for base64 assets)` });
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
    if (
      error &&
      !existing &&
      /site_files_project_id_fkey|foreign key constraint/i.test(String(error.message || ''))
    ) {
      const fixed = await ensureProjectRowForSiteFiles(supabase, projectId, req.profile?.id);
      if (fixed) {
        ({ data, error } = await supabase
          .from('site_files')
          .insert(insertRow)
          .select()
          .single());
      }
    }
    if (error && /content_encoding/.test(String(error.message))) {
      const rowPlain = { content: text, updated_at: now };
      ({ data, error } = await writePlain(rowPlain));
    } else if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (error) return res.status(500).json({ error: error.message });
    if (encoding === 'utf8' && /\.html?$/i.test(filePath)) {
      setImmediate(async () => {
        try {
          await upsertProjectVideosFromHtmlContent(getService(), projectId, text);
        } catch (sy) {
          console.warn('[site/file] youtube catalog sync skipped:', sy.message || sy);
        }
      });
    }
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
    for (const [path, raw] of Object.entries(files)) {
      let content = raw;
      if (typeof content === 'string') {
        content = content.replace(/__CS_PROJECT_UUID__/g, projectId);
      }
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
    const patch = hostingPatchFromBody(b);
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

router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    let client = null;
    if (data.client_id) {
      const c = await supabase.from('users').select('id, email, full_name, company').eq('id', data.client_id).maybeSingle();
      if (!c.error) client = c.data;
    }
    return res.json({ project: { ...data, client } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function patchAdminProjectById(req, res) {
  try {
    const { projectId } = req.params;
    const b = req.body || {};
    const supabase = getService();
    const patch = hostingPatchFromBody(b);
    if (b.site_settings !== undefined) {
      if (b.site_settings && typeof b.site_settings === 'object' && !Array.isArray(b.site_settings)) {
        const { data: cur } = await supabase.from('projects').select('site_settings').eq('id', projectId).maybeSingle();
        const prev =
          cur?.site_settings && typeof cur.site_settings === 'object' && !Array.isArray(cur.site_settings)
            ? cur.site_settings
            : {};
        patch.site_settings = { ...prev, ...b.site_settings };
      } else {
        patch.site_settings = b.site_settings;
      }
    }
    if (b.name != null && String(b.name).trim()) patch.name = String(b.name).trim();
    if (b.status != null) {
      if (!PROJECT_STATUS_ALLOWED.includes(b.status)) {
        return res.status(400).json({ error: 'Invalid status', allowed: PROJECT_STATUS_ALLOWED });
      }
      patch.status = b.status;
      if (b.status === 'live') {
        const { data: curLu } = await supabase.from('projects').select('launched_at').eq('id', projectId).maybeSingle();
        if (!curLu?.launched_at) patch.launched_at = new Date().toISOString();
      }
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const { data, error } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .select()
      .single();
    if (error) {
      if (/railway_|site_settings|custom_domain/.test(String(error.message))) {
        return res.status(400).json({
          error: 'Run migration migration_site_builder_v2.sql in Supabase to enable these fields.',
        });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, project: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}

router.patch('/projects/:projectId', patchAdminProjectById);
router.put('/projects/:projectId', patchAdminProjectById);

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

    /** Optional public CDN URL via Supabase Storage (bucket must exist + public read policy). */
    let publicUrl = null;
    try {
      const up = await uploadProjectImagePublicUrl(supabase, projectId, buffer, originalname, mimetype);
      publicUrl = up.publicUrl || null;
    } catch (e) {
      console.warn('[upload-asset] Storage URL skipped:', e.message);
    }

    return res.json({ success: true, path: rel, content_encoding: 'base64', publicUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/** Storage-only upload (public URL); also updates site preview when same path mirrors assets/*. */
router.post('/projects/:projectId/upload', upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { originalname, buffer, mimetype } = req.file;
    if (!/image\/(png|jpe?g|gif|webp|svg\+xml|svg)/i.test(mimetype) && !/\.svg$/i.test(originalname)) {
      return res.status(400).json({ error: 'Only image uploads allowed' });
    }
    const supabase = getService();
    const { storagePath, publicUrl } = await uploadProjectImagePublicUrl(supabase, projectId, buffer, originalname, mimetype);
    return res.json({
      success: true,
      path: storagePath,
      publicUrl,
      url: publicUrl,
      bucket: STORAGE_BUCKET,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error:
        e.message ||
        `Upload failed — create a public Storage bucket "${STORAGE_BUCKET}" (or set CUSTOMSITE_STORAGE_BUCKET env). Service role uploads + public read URLs.`,
    });
  }
});

router.get('/projects/:projectId/site/media', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const prefix = `${String(projectId).trim()}`;
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, { limit: 500 });
    if (error) return res.status(500).json({ error: error.message });
    const items = [];
    for (const o of data || []) {
      if (!o.name) continue;
      const key = `${prefix}/${o.name}`;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
      if (pub?.publicUrl) items.push({ name: o.name, url: pub.publicUrl, path: key });
    }
    return res.json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:projectId/form-submissions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const lim = Math.min(Number(req.query.limit) || 80, 200);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('id, fields, submitted_at, read_flag')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(lim);
    if (error) {
      if (/form_submissions|does not exist/i.test(error.message)) {
        return res.status(503).json({ error: 'Run migration 006_agency_extensions.sql for form submissions.' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ submissions: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/projects/:projectId/form-submissions/:submissionId/read', async (req, res) => {
  try {
    const { projectId, submissionId } = req.params;
    const read = req.body?.read_flag !== undefined ? Boolean(req.body.read_flag) : true;
    const supabase = getService();
    const { error } = await supabase
      .from('form_submissions')
      .update({ read_flag: read })
      .eq('id', submissionId)
      .eq('project_id', projectId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects/:projectId/site/snapshots', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const lim = Math.min(Number(req.query.limit) || 30, 100);
    const { data, error } = await supabase
      .from('project_site_snapshots')
      .select('id, label, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(lim);
    if (error) {
      if (/project_site_snapshots|does not exist/i.test(error.message)) {
        return res.json({ snapshots: [], hint: 'Run migration 006_agency_extensions.sql' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ snapshots: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/site/snapshot', async (req, res) => {
  try {
    const { projectId } = req.params;
    const label = ((req.body && req.body.label) || 'manual').slice(0, 200);
    const supabase = getService();
    const rows = await listProjectFileRows(supabase, projectId);
    const { data, error } = await supabase
      .from('project_site_snapshots')
      .insert({ project_id: projectId, label, files: rows })
      .select('id, label, created_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, snapshot: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:projectId/site/snapshots/:snapshotId/restore', async (req, res) => {
  try {
    const { projectId, snapshotId } = req.params;
    const supabase = getService();
    const { data: snap, error: ge } = await supabase
      .from('project_site_snapshots')
      .select('id, files')
      .eq('id', snapshotId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (ge) return res.status(500).json({ error: ge.message });
    if (!snap || !Array.isArray(snap.files)) return res.status(404).json({ error: 'Snapshot not found' });
    await supabase.from('site_files').delete().eq('project_id', projectId);
    const now = new Date().toISOString();
    let n = 0;
    for (const r of snap.files) {
      if (!r || !r.path || r.content === undefined || r.content === null) continue;
      const insert = {
        project_id: projectId,
        path: r.path,
        content: r.content,
        updated_at: r.updated_at || now,
        content_encoding: r.content_encoding === 'base64' ? 'base64' : 'utf8',
      };
      const { error: ie } = await supabase.from('site_files').insert(insert);
      if (ie && /content_encoding/.test(String(ie.message))) {
        delete insert.content_encoding;
        await supabase.from('site_files').insert(insert);
      }
      n++;
    }
    return res.json({ success: true, restoredFileCount: n });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.post('/projects/:projectId/duplicate', async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getService();
    const { data: src, error: se } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
    if (se) return res.status(500).json({ error: se.message });
    if (!src) return res.status(404).json({ error: 'Project not found' });

    const { randomUUID } = require('crypto');
    const newId = randomUUID();
    const baseName = `${String(src.name || 'Site')} (copy)`.slice(0, 240);
    const ins = {
      id: newId,
      client_id: src.client_id,
      name: baseName,
      status: src.status || 'discovery',
      launched_at: null,
      railway_url_production: null,
      railway_url_staging: null,
      railway_project_id_production: null,
      railway_project_id_staging: null,
      railway_service_id_production: null,
      railway_service_id_staging: null,
      custom_domain: null,
      site_settings: src.site_settings || null,
      website_type: src.website_type || null,
      internal_notes:
        `${String(src.internal_notes || '').slice(0, 3800)}\nDuplicated from project ${projectId}`.slice(0, 8000),
    };
    let { error: ie } = await supabase.from('projects').insert(ins);
    if (ie) {
      const r2 = await supabase.from('projects').insert({
        id: newId,
        client_id: src.client_id,
        name: baseName,
        status: 'discovery',
      });
      if (r2.error) return res.status(500).json({ error: r2.error.message });
    }

    const rows = await listProjectFileRows(supabase, projectId);
    for (const r of rows) {
      if (!r || !r.path || r.content === undefined) continue;
      const insert = {
        project_id: newId,
        path: r.path,
        content: r.content,
        updated_at: new Date().toISOString(),
        content_encoding: r.content_encoding === 'base64' ? 'base64' : 'utf8',
      };
      const { error: fe } = await supabase.from('site_files').insert(insert);
      if (fe && /content_encoding/.test(String(fe.message))) {
        delete insert.content_encoding;
        await supabase.from('site_files').insert(insert);
      }
    }

    const { data: fresh } = await supabase.from('projects').select('*').eq('id', newId).maybeSingle();
    return res.json({ success: true, project: fresh, id: newId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
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
    const railwayEnv = {
      RAILWAY_API_TOKEN: Boolean(String(process.env.RAILWAY_API_TOKEN || '').trim()),
      RAILWAY_TEAM_ID: Boolean(String(process.env.RAILWAY_TEAM_ID || '').trim()),
    };
    const supabase = getService();
    const { data: proj, error: perr } = await supabase
      .from('projects')
      .select(
        'id, name, launched_at, custom_domain, railway_url_staging, railway_url_production, railway_project_id_staging, railway_project_id_production, railway_service_id_staging, railway_service_id_production'
      )
      .eq('id', projectId)
      .maybeSingle();
    if (perr) {
      if (/railway_/.test(String(perr.message)) || /custom_domain/.test(String(perr.message))) {
        return res.status(400).json({ error: 'Run migration migration_site_builder_v2.sql' });
      }
      return res.status(500).json({ error: perr.message });
    }
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    if (environment === 'production') {
      const dom = normalizeCustomDomainHost(proj.custom_domain);
      if (!dom) {
        return res.status(400).json({
          error:
            'Production deploy requires a custom domain on this project. PATCH /api/admin/projects/:id with { "custom_domain": "www.example.com" } (or set it in the publish workspace), then deploy again.',
          code: 'DOMAIN_REQUIRED',
        });
      }
    }
    const rows = await listProjectFileRows(supabase, projectId);
    if (!rows.length) {
      return res.status(400).json({ error: 'No site files to deploy. Init a starter or add files first.' });
    }

    try {
      const sl = `${environment === 'production' ? 'Pre-production deploy' : 'Pre-staging deploy'} • ${new Date().toISOString()}`;
      const { error: sne } = await supabase.from('project_site_snapshots').insert({
        project_id: projectId,
        label: sl,
        files: rows,
      });
      if (sne) console.warn('[deploy] snapshot insert', sne.message);
    } catch (snapEx) {
      console.warn('[deploy] snapshot insert', snapEx.message);
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
        railwayEnv,
        message:
          'No RAILWAY_API_TOKEN. Configure it on the server, then redeploy. Below is a downloadable bundle you can deploy with Railway CLI (railway link && railway up) or by connecting a GitHub repo.',
        zipBytes: zipBuffer.length,
        manualUrl: `/api/admin/projects/${projectId}/site/export`,
      });
    }
    const t0 = await testToken(token);
    if (!t0.ok) {
      push('token', 'Verify Railway API token', 'error', t0.error);
      return res.status(400).json({ ok: false, steps, error: t0.error, railwayEnv });
    }
    push('token', 'Verify Railway API token', 'done', t0.me && t0.me.email ? t0.me.email : 'ok');
    const existingRailwayProjectId =
      environment === 'production' ? proj.railway_project_id_production : proj.railway_project_id_staging;
    const existingServiceId =
      environment === 'production' ? proj.railway_service_id_production : proj.railway_service_id_staging;
    const hasReuse =
      Boolean(existingRailwayProjectId) &&
      Boolean(existingServiceId) &&
      String(existingRailwayProjectId).trim().length > 0 &&
      String(existingServiceId).trim().length > 0;
    if (!hasReuse && !teamId) {
      push('team', 'Team ID for project create', 'error', 'Set RAILWAY_TEAM_ID or pass teamId in the request');
      return res.status(400).json({
        ok: false,
        steps,
        error:
          'RAILWAY_TEAM_ID required for the first deploy (new Railway project). After the first successful deploy, IDs are saved and teamId is only needed for new projects.',
        railwayEnv,
      });
    }
    const rname = (proj.name || 'site') + (environment === 'production' ? ' (prod)' : ' (staging)');
    const customHost = normalizeCustomDomainHost(proj.custom_domain);
    const attachRailwayDomain =
      environment === 'production' && customHost && body.attach_custom_domain !== false;

    push(
      'railway',
      hasReuse ? 'Redeploy files to existing Railway static service' : 'Create Railway project, service, and upload site (CLI)',
      'pending',
      'This can take 2–4 minutes'
    );
    const deployed = await provisionStaticDeploy({
      token,
      teamId,
      displayName: `${rname}`.slice(0, 64),
      description: `CustomSite static deploy ${projectId}`,
      files,
      domain:
        environment === 'production'
          ? { attachCustomDomain: attachRailwayDomain, customDomain: customHost }
          : { attachCustomDomain: false, customDomain: null },
      existingDeployment: hasReuse
        ? {
            railwayProjectId: String(existingRailwayProjectId).trim(),
            serviceId: String(existingServiceId).trim(),
          }
        : undefined,
    });

    if (!deployed.ok) {
      if (deployed.railwayProjectId) {
        push('railway', 'Railway project created but deploy failed', 'error', deployed.error);
      } else {
        push('railway', 'Railway provision failed', 'error', deployed.error);
      }
      return res.status(400).json({
        ok: false,
        steps,
        error: deployed.error,
        zipBytes: zipBuffer.length,
        manualUrl: `/api/admin/projects/${projectId}/site/export`,
        railwayProjectId: deployed.railwayProjectId,
        serviceId: deployed.serviceId,
        railwayEnv,
      });
    }

    push(
      'railway',
      hasReuse ? 'Redeploy to existing Railway service' : 'Create Railway project, service, and upload site (CLI)',
      'done',
      deployed.publicUrl
    );
    const patch = {};
    if (environment === 'production') {
      patch.railway_url_production = deployed.publicUrl;
      patch.railway_project_id_production = deployed.railwayProjectId;
      patch.railway_service_id_production = deployed.serviceId;
      patch.status = 'live';
      if (!proj.launched_at) patch.launched_at = new Date().toISOString();
    } else {
      patch.railway_url_staging = deployed.publicUrl;
      patch.railway_project_id_staging = deployed.railwayProjectId;
      patch.railway_service_id_staging = deployed.serviceId;
    }
    const { error: uerr } = await supabase.from('projects').update(patch).eq('id', projectId);
    if (uerr && !/railway_/.test(String(uerr.message))) {
      console.warn(uerr);
    }

    const dnsHint = {
      cnameTarget: deployed.cnameTarget,
      registrarNote:
        deployed.cnameTarget && customHost
          ? `At your DNS provider: point ${customHost} (or www) CNAME → ${deployed.cnameTarget} (or use ALIAS/ANAME at apex if supported).`
          : deployed.cnameTarget
            ? `Point your hostname CNAME → ${deployed.cnameTarget}.`
            : 'Use the Railway dashboard → Networking for exact DNS rows.',
    };

    return res.json({
      ok: true,
      environment,
      steps,
      railwayProjectId: deployed.railwayProjectId,
      railwayServiceId: deployed.serviceId,
      serviceName: deployed.serviceName,
      publicUrl: deployed.publicUrl,
      cnameTarget: deployed.cnameTarget,
      dnsHint,
      customDomainDns: deployed.customDomainDns || undefined,
      projectName: rname,
      deployedReused: Boolean(deployed.reused),
      projectStatus: environment === 'production' ? 'live' : undefined,
      railwayEnv,
      note:
        environment === 'production'
          ? `${
              attachRailwayDomain
                ? 'Production URL saved; custom domain attach was attempted — verify dnsRecords / Railway if TLS is pending.'
                : 'Production URL saved. Add a CNAME at your registrar when you use a custom domain.'
            } Project status set to live in the database.`
          : 'Preview/staging URL saved on this project.',
      downloadZip: `/api/admin/projects/${projectId}/site/export`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

router.post('/projects/:projectId/railway/attach-custom-domain', async (req, res) => {
  try {
    const { projectId } = req.params;
    const body = req.body || {};
    const token = body.token || process.env.RAILWAY_API_TOKEN;
    if (!token) {
      return res.status(400).json({
        error: 'Railway API token required. Set RAILWAY_API_TOKEN on the server or pass token in the JSON body.',
      });
    }
    const supabase = getService();
    const { data: proj, error: perr } = await supabase
      .from('projects')
      .select('id, custom_domain, railway_service_id_production')
      .eq('id', projectId)
      .maybeSingle();
    if (perr) {
      if (/railway_|custom_domain/.test(String(perr.message))) {
        return res.status(400).json({ error: 'Run migration migration_site_builder_v2.sql' });
      }
      return res.status(500).json({ error: perr.message });
    }
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    const domain = normalizeCustomDomainHost(body.domain) || normalizeCustomDomainHost(proj.custom_domain);
    if (!domain) {
      return res.status(400).json({
        error: 'No domain: set custom_domain via PATCH /api/admin/projects/:id or pass { "domain": "www.example.com" }.',
      });
    }
    const serviceId = (body.serviceId && String(body.serviceId).trim()) || proj.railway_service_id_production;
    if (!serviceId) {
      return res.status(400).json({
        error:
          'railway_service_id_production is not set on this project. In Railway, open your static site service → Settings → copy Service ID, then PATCH the project with { "railway_service_id_production": "<id>" } or pass serviceId in this request.',
        code: 'SERVICE_ID_REQUIRED',
      });
    }
    const created = await createCustomDomainForService(token, { serviceId, domain });
    if (created.error) {
      return res.status(400).json({ ok: false, error: created.error });
    }
    return res.json({
      ok: true,
      domain: created.domain,
      customDomainId: created.id,
      dnsRecords: created.dnsRecords,
      hint: 'Add the DNS records at your registrar. Railway may also require a TXT record for verification — see dnsRecords.',
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
