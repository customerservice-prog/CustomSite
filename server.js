'use strict';

const path = require('path');
require('./lib/env');

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
const PORT = process.env.PORT || 3000;

// Railway, Render, etc. set X-Forwarded-* — needed for correct https:// host in preview URLs
app.set('trust proxy', 1);

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

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
}));

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
  app.listen(PORT, () => {
    console.log(`CustomSite server listening on ${PORT}`);
    if (isDevAuthEnabled() && !isSupabaseConfigured()) {
      console.log(
        `  Local dev login: email=${process.env.DEV_ADMIN_EMAIL} (set in .env; no Supabase on this run)`
      );
    }
  });
}
