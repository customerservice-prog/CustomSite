'use strict';

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TRIM_KEYS = [
  'DEV_AUTH',
  'DEV_AUTH_SECRET',
  'DEV_ADMIN_EMAIL',
  'DEV_ADMIN_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'PUBLIC_SITE_URL',
];

for (const k of TRIM_KEYS) {
  if (process.env[k] !== undefined && process.env[k] !== null) {
    let v = String(process.env[k]);
    v = v.replace(/^\uFEFF/, '').trim();
    process.env[k] = v;
  }
}

module.exports = {};
