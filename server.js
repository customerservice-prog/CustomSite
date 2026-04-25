'use strict';

const path = require('path');
const fs = require('fs/promises');
require('./lib/env');
const { applySitePhoneToHtml } = require('./lib/sitePhone');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { buildCorsOptions } = require('./lib/corsConfig');

const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const siteBuilderRoutes = require('./routes/siteBuilder');
const previewSiteMiddleware = require('./routes/previewSite');
const { devModeApiStub } = require('./middleware/devModeApiStub');
const { router: paymentsRoutes, handleWebhook } = require('./routes/payments');
const configPublicRoutes = require('./routes/configPublic');
const { isSupabaseConfigured } = require('./lib/supabase');
const { isDevAuthEnabled } = require('./lib/devAuth');

const app = express();
const PORT = Number.parseInt(String(process.env.PORT || '3000'), 10) || 3000;
/** Bind all interfaces so http://127.0.0.1:PORT and http://localhost:PORT work; required on Railway/Docker. */
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

// Railway, Render, etc. set X-Forwarded-* — needed for correct https:// host in preview URLs
app.set('trust proxy', 1);

/**
 * www and apex (e.g. customsite.online vs www.customsite.online) are different origins;
 * `localStorage` (session token after login) is not shared, so the user appears signed
 * out on the other host. If PUBLIC_SITE_URL is set, 301 GET/HEAD to that hostname
 * for the same "site" (ignores Railway/Render preview hostnames). Set
 * PUBLIC_SITE_URL=https://customsite.online (pick www or not — use one and stick to it).
 * Emergency bypass: SKIP_CANONICAL_HOST=1
 */
function skipCanonicalHostCheck(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (
    h.endsWith('.railway.app')
    || h.endsWith('.onrender.com')
    || h.endsWith('.vercel.app')
  ) {
    return true;
  }
  return false;
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (String(process.env.SKIP_CANONICAL_HOST || '').trim() === '1') return next();
  if (skipCanonicalHostCheck(req.hostname)) return next();
  const raw = String(process.env.PUBLIC_SITE_URL || '').trim();
  if (!raw) return next();
  let canonicalHost;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    canonicalHost = new URL(withProto).hostname.toLowerCase();
  } catch {
    return next();
  }
  if (!canonicalHost) return next();
  const host = String(req.hostname || '').toLowerCase();
  if (host === canonicalHost) return next();
  const stripWww = (x) => (x.startsWith('www.') ? x.slice(4) : x);
  if (stripWww(host) !== stripWww(canonicalHost)) return next();
  const rel = String(req.originalUrl || req.url || '/');
  const dest = new URL(rel, `https://${canonicalHost}/`);
  dest.protocol = 'https:';
  dest.hostname = canonicalHost;
  return res.redirect(301, dest.toString());
});

// API hardening: disable default CSP/COEP so preview iframes and the site builder keep working; tighten per-route if needed.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// CORS: CORS_ORIGINS (comma list) or PUBLIC_SITE_URL; reflect any origin in dev if unset.
app.use(cors(buildCorsOptions()));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(devModeApiStub);

app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', siteBuilderRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api', configPublicRoutes);

app.use(previewSiteMiddleware);

function buildSitemapXml(hostname) {
  const host = String(hostname || 'customsite.online').toLowerCase();
  const base = `https://${host}`;
  const isMain = host === 'customsite.online' || host === 'www.customsite.online';
  const allPages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/pricing.html', priority: '0.9', changefreq: 'monthly' },
    { path: '/portfolio.html', priority: '0.8', changefreq: 'monthly' },
    { path: '/contact.html', priority: '0.8', changefreq: 'monthly' },
    { path: '/case-studies.html', priority: '0.7', changefreq: 'monthly' },
    { path: '/agency.html', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy.html', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms.html', priority: '0.3', changefreq: 'yearly' },
  ];
  const demoPaths = isMain
    ? [
        { path: '/demo-site.html?t=ridgelineplumbing', priority: '0.5', changefreq: 'yearly' },
        { path: '/partyrental-demo.html', priority: '0.5', changefreq: 'yearly' },
      ]
    : [];
  const pages = allPages.concat(demoPaths);
  const today = new Date().toISOString().split('T')[0];
  const escapeLoc = (p) => base + p.replace(/&/g, '&amp;');
  const urls = pages
    .map(
      (p) => `
  <url>
    <loc>${escapeLoc(p.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function buildRobotsTxt(hostname) {
  const host = String(hostname || 'customsite.online');
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin.html
Disallow: /client-portal.html
Disallow: /site-builder.html
Disallow: /reset-password.html
Disallow: /dashboard.html
Disallow: /preview/

Sitemap: https://${host}/sitemap.xml
`;
}

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(buildSitemapXml(req.hostname));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(buildRobotsTxt(req.hostname));
});

/** One canonical home URL: avoid /index.html vs / duplicate content. */
app.get('/index.html', (req, res) => {
  const i = req.url.indexOf('?');
  const q = i >= 0 ? req.url.slice(i) : '';
  res.redirect(301, '/' + q);
});

/* Same local SEO HTML as a direct path on customsite.online (not only via dedicated hostnames). */
const LOCAL_SEO_SLUGS = ['syracuse-web-agency', 'cny-web-agency', 'syracuse-web-designer'];
LOCAL_SEO_SLUGS.forEach((slug) => {
  app.get(`/${slug}.html`, async (req, res, next) => {
    try {
      const filePath = path.join(__dirname, 'local-seo', `${slug}.html`);
      const raw = await fs.readFile(filePath, 'utf8');
      res.type('html').send(applySitePhoneToHtml(raw));
    } catch (e) {
      next(e);
    }
  });
});

/* Local SEO domains (Syracuse / CNY) — host-based landing pages, same deployment */
const LOCAL_SEO_PAGES = {
  'syracusewebagency.com': 'syracuse-web-agency',
  'www.syracusewebagency.com': 'syracuse-web-agency',
  'cnywebagency.com': 'cny-web-agency',
  'www.cnywebagency.com': 'cny-web-agency',
  'syracusewebdesigner.com': 'syracuse-web-designer',
  'www.syracusewebdesigner.com': 'syracuse-web-designer',
};

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const host = String(req.hostname || '').toLowerCase();
  const slug = LOCAL_SEO_PAGES[host];
  if (!slug) {
    return next();
  }
  let p = req.path || '/';
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  if (p === '/' || p === '/index.html') {
    try {
      const filePath = path.join(__dirname, 'local-seo', `${slug}.html`);
      const raw = await fs.readFile(filePath, 'utf8');
      res.type('html').send(applySitePhoneToHtml(raw));
    } catch (e) {
      next(e);
    }
    return;
  }
  return next();
});

app.use(
  express.static(path.join(__dirname), {
    extensions: ['html'],
    etag: true,
    setHeaders: (res, filePath) => {
      if (String(filePath).endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    },
  })
);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(404).end();
  }
  res.status(404).sendFile(path.join(__dirname, '404.html'), (err) => {
    if (err) {
      res.status(404).type('text/plain').send('Not found');
    }
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = { app };

if (require.main === module) {
  const server = app.listen(PORT, BIND_HOST, () => {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`CustomSite server listening on ${BIND_HOST}:${PORT}`);
    console.log(`  Open: ${url}/  or  http://localhost:${PORT}/index.html`);
    if (isDevAuthEnabled() && !isSupabaseConfigured()) {
      console.log(
        `  Local dev login: email=${process.env.DEV_ADMIN_EMAIL} (set in .env; no Supabase on this run)`
      );
    }
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        `\n[${err.code}] Port ${PORT} is already in use. Another process is using it (or a second CustomSite instance).\n` +
          `  • Stop the other app, or set a different port, e.g.  PowerShell:  $env:PORT=3001; npm start  \n` +
          `  • Then use http://127.0.0.1:3001/ in the browser (not file://).\n`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}
