'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const siteBuilderRoutes = require('./routes/siteBuilder');
const previewSiteMiddleware = require('./routes/previewSite');
const { router: paymentsRoutes, handleWebhook } = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

const publicUrl = process.env.PUBLIC_SITE_URL || '*';

app.use(
  cors({
    origin: publicUrl === '*' ? true : publicUrl,
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

app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', siteBuilderRoutes);
app.use('/api/payments', paymentsRoutes);

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
});
