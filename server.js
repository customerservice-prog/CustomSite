'use strict';

const path = require('path');
require('./lib/env');

const express = require('express');
const cors = require('cors');

const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const siteBuilderRoutes = require('./routes/siteBuilder');
const previewSiteMiddleware = require('./routes/previewSite');
const { devModeApiStub } = require('./middleware/devModeApiStub');
const { router: paymentsRoutes, handleWebhook } = require('./routes/payments');
const { isSupabaseConfigured } = require('./lib/supabase');
const { isDevAuthEnabled } = require('./lib/devAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Reflect request Origin so both http://localhost and http://127.0.0.1 work (single-host API + static).
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

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
  res.sendFile(path.join(__dirname, '404.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CustomSite server listening on ${PORT}`);
  if (isDevAuthEnabled() && !isSupabaseConfigured()) {
    console.log(
      `  Local dev login: email=${process.env.DEV_ADMIN_EMAIL} (set in .env; no Supabase on this run)`
    );
  }
});
