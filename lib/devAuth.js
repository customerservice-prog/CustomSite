'use strict';

require('./env');

const crypto = require('crypto');

const TOKEN_PREFIX = 'csdev.';

function getSecret() {
  return String(process.env.DEV_AUTH_SECRET || 'change-me-in-env');
}

function isDevAuthEnabled() {
  const flag = String(process.env.DEV_AUTH || '')
    .trim()
    .toLowerCase();
  if (!['1', 'true', 'yes', 'on'].includes(flag)) {
    return false;
  }
  return Boolean(process.env.DEV_ADMIN_EMAIL && process.env.DEV_ADMIN_PASSWORD);
}

function signDevToken(payload) {
  const body = Buffer.from(
    JSON.stringify({ v: 1, iat: Date.now(), ...payload }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${TOKEN_PREFIX}${body}.${sig}`;
}

function verifyDevToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  const rest = token.slice(TOKEN_PREFIX.length);
  const lastDot = rest.lastIndexOf('.');
  if (lastDot < 0) return null;
  const body = rest.slice(0, lastDot);
  const sig = rest.slice(lastDot + 1);
  const expect = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if (sig.length !== expect.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expect, 'utf8'))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** Fixed UUIDs for the local demo project + client (in-memory; no database). */
const DEV_CLIENT_ID = '00000000-0000-0000-0000-00000000b001';
const DEV_PROJECT_ID = '00000000-0000-0000-0000-00000000d0d0';

module.exports = {
  isDevAuthEnabled,
  signDevToken,
  verifyDevToken,
  extractBearerToken,
  TOKEN_PREFIX,
  DEV_CLIENT_ID,
  DEV_PROJECT_ID,
};
