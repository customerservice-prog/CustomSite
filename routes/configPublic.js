'use strict';

const express = require('express');
const { isSupabaseAnonReady } = require('../lib/supabase');
const { cleanCalendlyUrl } = require('../lib/calendlyUrl');

const router = express.Router();

/**
 * Public values for the browser Supabase client (anon key is safe to expose).
 * Used to parse magic-link and password-recovery URL fragments and OIDC `code=`.
 */

router.get('/config/public', (req, res) => {
  const calendly20Min = cleanCalendlyUrl(process.env.CALENDLY_20_MIN);
  if (!isSupabaseAnonReady()) {
    return res.json({ configured: false, calendly20Min });
  }
  return res.json({
    configured: true,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    calendly20Min,
  });
});

module.exports = router;
