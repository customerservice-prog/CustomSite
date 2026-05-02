'use strict';

const crypto = require('crypto');
const multer = require('multer');
const { isSupabaseConfigured } = require('../lib/supabase');
const { extractYoutubeId, fetchYoutubeOembed, probeYoutubeAvailability } = require('../lib/youtubeUtils');

const demoMemUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
}).single('file');
const {
  verifyDevToken,
  extractBearerToken,
} = require('../lib/devAuth');
const { DEV_CLIENT_ID, DEV_PROJECT_ID } = require('../lib/devAuth');
const devStore = require('../lib/devSiteFileStore');
const { addServeBundle, createZipBuffer } = require('../lib/bundleStaticSite');
const { TEMPLATE_KEYS } = require('../lib/siteTemplates');

function normalizePath(p) {
  if (!p || typeof p !== 'string') return null;
  const s = p.replace(/\\/g, '/').trim();
  if (s.includes('..') || s.startsWith('/')) return null;
  return s;
}

function noDb(req, res) {
  return res.status(503).json({
    error: 'Local demo: connect Supabase in .env to save data.',
    code: 'DEV_NO_DB',
  });
}

function pathName(req) {
  return (req.originalUrl || req.url || '').split('?')[0];
}

/**
 * RAM-backed site files + deploy stub when Supabase is off.
 * Does not require a dev Bearer token so the React conversion workspace works on first load.
 * @returns {boolean|import('http').ServerResponse|Promise<unknown>} false = not handled; true = handled; or a Promise for async send
 */
function tryRespondLocalDemoSite(req, res, m, p) {
  const siteList = /^\/api\/admin\/projects\/([^/]+)\/site$/;
  const siteFilesList = /^\/api\/admin\/projects\/([^/]+)\/site\/files$/;
  const siteFileGet = /^\/api\/admin\/projects\/([^/]+)\/site\/file$/;
  const siteFilePut = /^\/api\/admin\/projects\/([^/]+)\/site\/file$/;
  const siteFileDel = /^\/api\/admin\/projects\/([^/]+)\/site\/file$/;
  const siteInit = /^\/api\/admin\/projects\/([^/]+)\/site\/init$/;

  if (m === 'GET' && siteList.test(p)) {
    const projectId = p.match(siteList)[1];
    const listed = devStore.listPaths(projectId);
    res.json({ files: listed });
    return true;
  }
  if (m === 'GET' && siteFilesList.test(p)) {
    const projectId = p.match(siteFilesList)[1];
    const listed = devStore.listPaths(projectId);
    res.json({ files: listed });
    return true;
  }
  if (m === 'GET' && siteFileGet.test(p)) {
    const projectId = p.match(siteFileGet)[1];
    const filePath = normalizePath(req.query.path);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid path' });
      return true;
    }
    const data = devStore.getFile(projectId, filePath);
    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return true;
    }
    res.json({
      path: filePath,
      content: data.content,
      content_encoding: data.content_encoding || 'utf8',
      updated_at: data.updated_at,
    });
    return true;
  }
  if (m === 'PUT' && siteFilePut.test(p)) {
    const projectId = p.match(siteFilePut)[1];
    const filePath = normalizePath(req.body && req.body.path);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid path' });
      return true;
    }
    const text = req.body && req.body.content != null ? String(req.body.content) : '';
    if (Buffer.byteLength(text, 'utf8') > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File too large (max 10MB)' });
      return true;
    }
    const enc = req.body && req.body.content_encoding;
    const data = devStore.setFile(projectId, filePath, text, enc);
    res.json({
      success: true,
      file: {
        project_id: projectId,
        path: filePath,
        content: data.content,
        updated_at: data.updated_at,
        content_encoding: data.content_encoding || 'utf8',
      },
    });
    return true;
  }
  if (m === 'DELETE' && siteFileDel.test(p)) {
    const projectId = p.match(siteFileDel)[1];
    const filePath = normalizePath(req.query.path);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid path' });
      return true;
    }
    devStore.deleteFile(projectId, filePath);
    res.json({ success: true });
    return true;
  }
  if (m === 'POST' && siteInit.test(p)) {
    const projectId = p.match(siteInit)[1];
    const template = (req.body && req.body.template) || 'basic';
    const keys = devStore.initStarter(projectId, template);
    res.json({ success: true, paths: keys, template });
    return true;
  }

  if (m === 'GET' && p === '/api/admin/site-builder/templates') {
    res.json({ templates: TEMPLATE_KEYS });
    return true;
  }

  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+\/site\/export$/.test(p)) {
    const projectId = p.split('/')[4];
    const listed = devStore.listPaths(projectId);
    const files = listed.map(({ path }) => {
      const f = devStore.getFile(projectId, path);
      return {
        path,
        content: f.content,
        encoding: f.content_encoding === 'base64' ? 'base64' : 'utf8',
      };
    });
    return createZipBuffer(addServeBundle(files))
      .then((buf) => {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}.zip"`);
        return res.send(buf);
      })
      .catch((e) => res.status(500).json({ error: e.message }));
  }

  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+\/builder$/.test(p)) {
    const projectId = p.split('/')[4];
    const host = devProjectHostingById[projectId] || {};
    res.json({
      project: {
        id: projectId,
        name: demoProjectRow.name,
        status: demoProjectRow.status,
        client_id: demoProjectRow.client_id,
        website_type: demoProjectRow.website_type,
        railway_url_staging: host.railway_url_staging || 'https://demo-staging.up.railway.app',
        railway_url_production: host.railway_url_production || '',
        custom_domain: host.custom_domain || '',
        railway_service_id_production: host.railway_service_id_production || null,
        site_settings:
          host.site_settings && typeof host.site_settings === 'object' && !Array.isArray(host.site_settings)
            ? host.site_settings
            : {},
        created_at: demoProjectRow.created_at,
        client: { email: demoClient.email, full_name: demoClient.full_name, company: demoClient.company },
      },
    });
    return true;
  }

  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+$/.test(p)) {
    const projectId = p.split('/')[4];
    const host = devProjectHostingById[projectId] || {};
    res.json({
      project: {
        ...demoProjectRow,
        id: projectId,
        railway_url_staging: host.railway_url_staging ?? null,
        railway_url_production: host.railway_url_production ?? null,
        custom_domain: host.custom_domain ?? null,
        railway_project_id_production: host.railway_project_id_production ?? null,
        railway_service_id_production: host.railway_service_id_production ?? null,
        site_settings:
          host.site_settings && typeof host.site_settings === 'object' && !Array.isArray(host.site_settings)
            ? host.site_settings
            : {},
        client: demoClient,
      },
    });
    return true;
  }

  if (m === 'PATCH' && /^\/api\/admin\/projects\/[^/]+\/builder$/.test(p)) {
    const projectId = p.split('/')[4];
    devProjectHostingById[projectId] = { ...(devProjectHostingById[projectId] || {}), ...req.body };
    res.json({ project: { ...demoProjectRow, id: projectId, ...devProjectHostingById[projectId] } });
    return true;
  }

  if (m === 'PATCH' && /^\/api\/admin\/projects\/[^/]+$/.test(p)) {
    const projectId = p.split('/')[4];
    const body = req.body || {};
    const prev = devProjectHostingById[projectId] || {};
    const nextHost = { ...prev };
    Object.keys(body).forEach((k) => {
      if (k === 'site_settings' && body[k] && typeof body[k] === 'object' && !Array.isArray(body[k])) {
        const pss =
          prev.site_settings && typeof prev.site_settings === 'object' && !Array.isArray(prev.site_settings)
            ? prev.site_settings
            : {};
        nextHost.site_settings = { ...pss, ...body[k] };
      } else {
        nextHost[k] = body[k];
      }
    });
    devProjectHostingById[projectId] = nextHost;
    res.json({
      success: true,
      project: { ...demoProjectRow, id: projectId, ...nextHost, client: demoClient },
    });
    return true;
  }

  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/site\/upload-asset$/.test(p)) {
    res.json({ success: true, path: 'assets/uploaded-asset.png', content_encoding: 'base64' });
    return true;
  }

  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/deploy$/.test(p)) {
    const projectId = p.split('/')[4];
    const env = (req.body && req.body.environment) || 'staging';
    const host = devProjectHostingById[projectId] || {};
    const dom = String(host.custom_domain || '').trim();
    if (env === 'production' && !dom) {
      res.status(400).json({
        error:
          'Production deploy requires a custom domain on this project (dev stub). PATCH /api/admin/projects/:id with custom_domain first.',
        code: 'DOMAIN_REQUIRED',
      });
      return true;
    }
    res.json({
      ok: true,
      partial: true,
      environment: env,
      steps: [
        { id: 'bundle', label: 'Bundling', status: 'done', at: new Date().toISOString() },
        { id: 'dev', label: 'Local dev (no Supabase)', status: 'done', detail: 'Deploy API is a stub' },
      ],
      publicUrl: 'https://dev-preview.example.com',
      message: 'Local preview bundle ready. Add Railway credentials in production for live deploys.',
    });
    return true;
  }

  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/railway\/attach-custom-domain$/.test(p)) {
    res.status(400).json({
      ok: false,
      error: 'Local dev: configure Supabase + RAILWAY_API_TOKEN to register domains via API.',
      code: 'DEV_STUB',
    });
    return true;
  }

  return false;
}

const demoClient = {
  id: DEV_CLIENT_ID,
  email: 'm.lee@northstar.io',
  full_name: 'Michael Lee',
  company: 'Northstar Digital',
  role: 'client',
  created_at: new Date(0).toISOString(),
};

const demoProjectRow = {
  id: DEV_PROJECT_ID,
  client_id: DEV_CLIENT_ID,
  name: 'Northstar marketing site',
  status: 'development',
  website_type: 'business',
  internal_notes: 'Local workspace — matches seeded admin demo data.',
  created_at: new Date().toISOString(),
  launched_at: null,
};

/** RAM merge for GET/PATCH /api/admin/projects/:id when Supabase is off. */
const devProjectHostingById = {};

/** In-memory uploads for GET /site/media demo (Supabase off). */
const devProjectMediaStore = {};

/** RAM-backed project_videos rows when DB is off. */
const devProjectVideosStore = {};

/**
 * When Supabase is not configured, serve API responses for the signed-in dev user
 * so the admin and site builder UIs load. Site files and preview use RAM.
 */
function devModeApiStub(req, res, next) {
  if (isSupabaseConfigured()) {
    return next();
  }

  const p = pathName(req);
  const m = req.method;

  if (m === 'GET' && /^\/api\/public\/projects\/[^/]+\/videos$/.test(p)) {
    return res.json({ videos: [] });
  }

  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/upload$/.test(p)) {
    return demoMemUpload(req, res, (err) => {
      if (err) return res.status(400).json({ error: String(err.message || err) });
      const projectId = p.split('/')[4];
      const f = req.file;
      if (!f) return res.status(400).json({ error: 'file required' });
      const safe = String(f.originalname || 'image').replace(/[^a-zA-Z0-9._-]+/g, '_');
      const fileName = `${Date.now()}-${safe}`;
      const storagePath = `${projectId}/${fileName}`;
      const fakeUrl = `https://dev-media.local/${encodeURIComponent(projectId)}/${encodeURIComponent(fileName)}`;
      if (!devProjectMediaStore[projectId]) devProjectMediaStore[projectId] = [];
      devProjectMediaStore[projectId].push({ name: fileName, url: fakeUrl, path: storagePath });
      res.json({ success: true, path: storagePath, publicUrl: fakeUrl, url: fakeUrl, bucket: 'project-assets' });
    });
  }

  if (m === 'POST' && p === '/api/contact') {
    const body = req.body || {};
    const hp = (body.cs_hp_website != null && String(body.cs_hp_website).trim()) || '';
    if (hp) {
      return res.json({ success: true, id: 'filtered' });
    }
    const { name, email, message } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    return res.json({ success: true, id: 'local-dev', devMode: true });
  }

  if (p === '/api/auth/login' && m === 'POST') {
    return next();
  }

  const localSite = tryRespondLocalDemoSite(req, res, m, p);
  if (localSite !== false) {
    return localSite;
  }

  if (m === 'POST' && /^\/api\/forms\/[^/]+\/submit$/.test(p)) {
    return res.json({ ok: true, thanks: true, id: 'demo-form-submission' });
  }

  const token = extractBearerToken(req);
  if (!token || !verifyDevToken(token)) {
    if (p.startsWith('/api/') && p !== '/api/auth/login') {
      // Unauthenticated: let routes return 401 (e.g. /api/auth/me, /api/admin/*)
      return next();
    }
    return next();
  }

  // Authenticated with dev token — stub admin and site builder APIs
  if (m === 'GET' && p === '/api/auth/me') {
    return next();
  }

  if (m === 'GET' && p === '/api/dashboard') {
    return next();
  }

  if ((m === 'GET' || m === 'POST') && p === '/api/messages') {
    return next();
  }

  if (p.startsWith('/api/payments/')) {
    if (m === 'POST' && p === '/api/payments/create-checkout') {
      return res.status(503).json({
        error: 'Add Stripe env vars to test checkout (local demo is UI-only).',
        code: 'DEV_NO_STRIPE',
      });
    }
    return next();
  }

  if (m === 'GET' && p === '/api/admin/leads') {
    return res.json({ leads: [] });
  }
  if (m === 'PATCH' && /^\/api\/admin\/leads\/[^/]+$/.test(p) && p.indexOf('convert') === -1) {
    return res.json({ lead: { id: p.split('/').pop() } });
  }
  if (m === 'POST' && /^\/api\/admin\/leads\/[^/]+\/convert$/.test(p)) {
    return noDb(req, res);
  }

  if (m === 'GET' && p === '/api/admin/projects') {
    return res.json({
      projects: [
        {
          ...demoProjectRow,
          client: {
            id: demoClient.id,
            email: demoClient.email,
            full_name: demoClient.full_name,
            company: demoClient.company,
          },
        },
      ],
    });
  }
  if (m === 'POST' && p === '/api/admin/projects') {
    return noDb(req, res);
  }

  if (m === 'GET' && p === '/api/admin/clients') {
    return res.json({ clients: [demoClient] });
  }
  if (m === 'GET' && /^\/api\/admin\/clients\/[^/]+$/.test(p)) {
    return res.json({ client: demoClient, projects: [demoProjectRow] });
  }
  if (m === 'POST' && p === '/api/admin/clients') {
    return noDb(req, res);
  }

  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/update$/.test(p)) {
    return noDb(req, res);
  }
  if (m === 'PATCH' && /^\/api\/admin\/projects\/[^/]+\/status$/.test(p)) {
    return noDb(req, res);
  }
  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+\/files$/.test(p)) {
    return res.json({ files: [] });
  }
  if (m === 'POST' && /^\/api\/admin\/projects\/[^/]+\/files$/.test(p)) {
    return noDb(req, res);
  }
  if (m === 'GET' && p === '/api/admin/invoices') {
    return res.json({ invoices: [] });
  }
  if (m === 'POST' && p === '/api/admin/invoices') {
    return noDb(req, res);
  }
  if (m === 'GET' && p === '/api/admin/messages') {
    return res.json({ messages: [] });
  }
  if (m === 'POST' && p === '/api/admin/messages') {
    return noDb(req, res);
  }
  if (m === 'POST' && /^\/api\/admin\/invoices\/[^/]+\/stripe-checkout$/.test(p)) {
    return res.status(503).json({
      error: 'Stripe is not configured in this local demo. Set STRIPE_SECRET_KEY to generate payment links.',
      code: 'DEV_NO_STRIPE',
    });
  }

  if (m === 'POST' && p === '/api/admin/leads') {
    return res.json({
      success: true,
      lead: {
        id: '00000000-0000-0000-0000-00000000e001',
        name: 'Manual lead',
        email: 'lead@local.dev',
        status: 'New',
        created_at: new Date().toISOString(),
      },
    });
  }
  if (m === 'PUT' && /^\/api\/admin\/leads\/[^/]+$/.test(p)) {
    return res.json({ lead: { id: p.split('/').pop(), name: 'Updated' } });
  }
  if (m === 'DELETE' && /^\/api\/admin\/leads\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'GET' && p.startsWith('/api/admin/project-updates')) {
    return res.json({ updates: [] });
  }
  if (m === 'POST' && p === '/api/admin/project-updates') {
    return res.json({ success: true, update: { id: 'dev-upd' } });
  }
  if (m === 'GET' && p === '/api/admin/integrations') {
    return res.json({ resend: false, stripe: false, fromEmail: '', adminEmail: '', publicUrl: 'http://localhost:3000' });
  }
  if (m === 'PATCH' && /^\/api\/admin\/entity\/project\/[^/]+$/.test(p)) {
    return res.json({ success: true, project: { id: p.split('/').pop(), status: 'development' } });
  }
  if (m === 'DELETE' && /^\/api\/admin\/entity\/project\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'GET' && /^\/api\/admin\/by-project\/[^/]+\/files$/.test(p)) {
    return res.json({ files: [] });
  }
  if (m === 'DELETE' && /^\/api\/admin\/files\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'GET' && p === '/api/admin/activity') {
    return res.json({ events: [] });
  }
  if (m === 'GET' && p.startsWith('/api/admin/time-entries')) {
    return res.json({ entries: [] });
  }
  if (m === 'GET' && p === '/api/admin/contracts') {
    return res.json({ contracts: [] });
  }
  if (m === 'POST' && p === '/api/admin/contracts') {
    return res.json({ success: true, contract: { id: 'dev-contract', title: 'Contract' } });
  }
  if (m === 'PATCH' && /^\/api\/admin\/contracts\/[^/]+$/.test(p)) {
    return res.json({ success: true, contract: {} });
  }
  if (m === 'DELETE' && /^\/api\/admin\/contracts\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'POST' && /^\/api\/admin\/contracts\/[^/]+\/send$/.test(p)) {
    return res.json({ success: true, sent: true });
  }
  if (m === 'POST' && p === '/api/admin/time-entries') {
    return res.json({ success: true, entry: { id: 'dev-te' } });
  }
  if (m === 'PATCH' && /^\/api\/admin\/clients\/[^/]+$/.test(p)) {
    return res.json({ client: {} });
  }
  if (m === 'DELETE' && /^\/api\/admin\/clients\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'PATCH' && /^\/api\/admin\/invoices\/[^/]+$/.test(p)) {
    return res.json({ success: true, invoice: {} });
  }
  if (m === 'DELETE' && /^\/api\/admin\/invoices\/[^/]+$/.test(p)) {
    return res.json({ success: true });
  }
  if (m === 'POST' && /^\/api\/admin\/invoices\/[^/]+\/send$/.test(p)) {
    return res.json({ success: true, sent: false });
  }

  if (m === 'POST' && p === '/api/admin/railway/verify') {
    if (!(req.body && req.body.token) && !process.env.RAILWAY_API_TOKEN) {
      return res.status(400).json({ error: 'Pass token in body' });
    }
    return res.json({ ok: true, me: { name: 'Dev', email: 'dev@local' }, teams: [] });
  }

  if (m === 'GET' && p.startsWith('/api/admin/site-builder/dns-check')) {
    const dns = require('dns').promises;
    let h = '';
    try {
      h = new URL(req.originalUrl || '', 'http://localhost').searchParams.get('host') || '';
    } catch (_e) {
      h = '';
    }
    h = h.replace(/^https?:\/\//, '').split('/')[0].trim();
    if (!h) return res.status(400).json({ error: 'host required' });
    return dns
      .resolveCname(h)
      .then((cname) => res.json({ host: h, cname, ok: true }))
      .catch(() =>
        dns
          .resolve4(h)
          .then((a) => res.json({ host: h, a, ok: true }))
          .catch(() => res.json({ host: h, ok: false }))
      );
  }

  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+\/form-submissions$/.test(p)) {
    return res.json({ submissions: [] });
  }
  if (m === 'PATCH' && /^\/api\/admin\/projects\/[^/]+\/form-submissions\/[^/]+\/read$/.test(p)) {
    return res.json({ success: true });
  }

  if (m === 'GET' && /^\/api\/admin\/projects\/[^/]+\/analytics$/.test(p)) {
    const projectId = p.split('/')[4];
    const thirty = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400000);
      thirty.push({
        date: d.toISOString().slice(0, 10),
        pageviews: 0,
        unique_visitors: 0,
      });
    }
    return res.json({
      total_views: 0,
      yesterday_views: 0,
      yesterday_unique_visitors: 0,
      today_views: 0,
      last_30_days: thirty,
      launched_at: null,
      peak_day: null,
      top_referrers: [],
      project_id: projectId,
    });
  }
  if (m === 'GET' && p === '/api/admin/analytics/live') {
    return res.json({ total_live: 0, by_project: [] });
  }

  /** Dev-backed project videos (requires dev Bearer token; same shapes as `/routes/projectVideos.js`). */
  const devVidList = /^\/api\/admin\/projects\/([^/]+)\/videos$/;
  const devVidCheck = /^\/api\/admin\/projects\/([^/]+)\/videos\/check$/;
  const devVidCache = /^\/api\/admin\/projects\/([^/]+)\/videos\/cache-thumbnails$/;
  const devVidReorder = /^\/api\/admin\/projects\/([^/]+)\/videos\/reorder$/;
  const devVidOne = /^\/api\/admin\/projects\/([^/]+)\/videos\/([^/]+)$/;
  const devVideoRowId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function devEnsVideos(pid) {
    if (!devProjectVideosStore[pid]) devProjectVideosStore[pid] = [];
    return devProjectVideosStore[pid];
  }

  if (m === 'GET' && devVidList.test(p)) {
    const projectId = p.match(devVidList)[1];
    const rows = [...devEnsVideos(projectId)].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return res.json({ videos: rows });
  }
  if (m === 'POST' && devVidCheck.test(p)) {
    const projectId = p.match(devVidCheck)[1];
    const list = devEnsVideos(projectId);
    let active = 0;
    let unavailable = 0;
    return (async () => {
      const nowIso = new Date().toISOString();
      for (const row of list) {
        const probe = await probeYoutubeAvailability(row.youtube_id);
        if (probe.ok) {
          active += 1;
          const meta = probe.meta || {};
          if (typeof meta.title === 'string' && meta.title.trim()) row.title = meta.title.trim();
          if (typeof meta.thumbnail_url === 'string') row.thumbnail_url = meta.thumbnail_url;
          if (typeof meta.author_name === 'string') row.author_name = meta.author_name;
          row.status = 'active';
          row.health_status = 'ok';
        } else {
          unavailable += 1;
          row.status = 'unavailable';
          row.health_status = 'unavailable';
        }
        row.health_checked_at = nowIso;
        row.last_checked = nowIso;
      }
      return res.json({
        checked: list.length,
        active,
        unavailable,
        summary: `${list.length} checked — ${active} active, ${unavailable} unavailable`,
      });
    })();
  }
  if (m === 'POST' && devVidCache.test(p)) {
    const projectId = p.match(devVidCache)[1];
    const list = devEnsVideos(projectId);
    const need = list.filter((r) => !r.cached_thumbnail && r.thumbnail_url);
    let cached = 0;
    let failed = 0;
    const nowIso = new Date().toISOString();
    for (const row of need) {
      try {
        row.cached_thumbnail = `${row.thumbnail_url}${String(row.thumbnail_url).includes('?') ? '&' : '?'}cs_dev_cache=1`;
        row.last_checked = nowIso;
        cached += 1;
      } catch {
        failed += 1;
      }
    }
    return res.json({ queued: need.length, cached, failed });
  }
  if (m === 'PUT' && devVidReorder.test(p)) {
    const projectId = p.match(devVidReorder)[1];
    const ids = req.body && req.body.ordered_ids;
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return res.status(400).json({ error: 'ordered_ids: string[] required' });
    }
    ids.forEach((id, i) => {
      const row = devEnsVideos(projectId).find((r) => r.id === id);
      if (row) row.sort_order = i;
    });
    return res.json({ success: true });
  }
  if (m === 'PUT' && devVidOne.test(p)) {
    const [, projectId, videoId] = p.match(devVidOne);
    if (devVideoRowId.test(videoId)) {
      const row = devEnsVideos(projectId).find((r) => r.id === videoId);
      if (!row) return res.status(404).json({ error: 'Not found' });
      const b = req.body || {};
      ['title', 'description', 'author_name', 'thumbnail_url', 'cached_thumbnail', 'duration', 'view_count', 'status', 'sort_order', 'health_status', 'health_checked_at', 'source', 'category', 'episode_number', 'playlist_id'].forEach(
        (k) => {
          if (b[k] !== undefined) row[k] = b[k];
        }
      );
      return res.json({ video: row });
    }
  }
  if (m === 'DELETE' && devVidOne.test(p)) {
    const [, projectId, videoId] = p.match(devVidOne);
    if (devVideoRowId.test(videoId)) {
      const list = devEnsVideos(projectId);
      const ix = list.findIndex((r) => r.id === videoId);
      if (ix < 0) return res.status(404).json({ error: 'Not found' });
      list.splice(ix, 1);
      return res.json({ success: true });
    }
  }
  if (m === 'POST' && devVidList.test(p)) {
    const projectId = p.match(devVidList)[1];
    const yt = extractYoutubeId(String((req.body && (req.body.youtube_url || req.body.youtube_id)) || ''));
    if (!yt) {
      return res.status(400).json({ error: 'youtube_url or youtube_id required (paste a standard YouTube link)' });
    }
    const list = devEnsVideos(projectId);
    if (list.some((r) => r.youtube_id === yt)) {
      return res.status(409).json({ error: 'That video is already on this project' });
    }
    return (async () => {
      const meta = await fetchYoutubeOembed(yt);
      const row = {
        id: crypto.randomUUID(),
        project_id: projectId,
        youtube_id: yt,
        title: meta?.title || `YouTube ${yt}`,
        description: req.body && req.body.description != null ? String(req.body.description) : null,
        author_name: meta?.author_name || null,
        thumbnail_url: meta?.thumbnail_url || null,
        cached_thumbnail: null,
        duration: null,
        view_count: null,
        status: 'active',
        health_status: 'unchecked',
        health_checked_at: null,
        last_checked: new Date().toISOString(),
        sort_order: list.length,
        created_at: new Date().toISOString(),
        source: 'best_of_jm',
        category: null,
        episode_number: null,
        playlist_id: null,
      };
      list.push(row);
      if (row.thumbnail_url) {
        row.cached_thumbnail = `${row.thumbnail_url}${String(row.thumbnail_url).includes('?') ? '&' : '?'}cs_dev_cache=1`;
      }
      return res.status(201).json({ video: row });
    })();
  }
  const devVidReplace = /^\/api\/admin\/projects\/([^/]+)\/videos\/([^/]+)\/replace-youtube$/;
  if (m === 'POST' && devVidReplace.test(p)) {
    const [, projectId, videoId] = p.match(devVidReplace);
    if (!devVideoRowId.test(videoId)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const row = devEnsVideos(projectId).find((r) => r.id === videoId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const newYt = extractYoutubeId(String((req.body && (req.body.youtube_id || req.body.replacement_youtube_id)) || ''));
    if (!newYt) return res.status(400).json({ error: 'replacement youtube id required' });
    if (devEnsVideos(projectId).some((r) => r.youtube_id === newYt && r.id !== videoId)) {
      return res.status(409).json({ error: 'That video ID is already on this project' });
    }
    row.youtube_id = newYt;
    row.cached_thumbnail = null;
    row.status = 'active';
    row.health_status = 'unchecked';
    row.health_checked_at = new Date().toISOString();
    return res.json({ video: row, pathsUpdated: 0 });
  }

  if (p.startsWith('/api/admin/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  return next();
}

module.exports = { devModeApiStub };
