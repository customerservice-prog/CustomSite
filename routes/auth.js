'use strict';

require('../lib/env');

const express = require('express');
const { getAnon, getService, isSupabaseConfigured, isSupabaseAnonReady } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { isDevAuthEnabled, signDevToken } = require('../lib/devAuth');

const router = express.Router();

async function logSignIn(userId, email, source) {
  try {
    if (!isSupabaseConfigured()) return;
    const supabase = getService();
    await supabase.from('agency_activity').insert({
      actor_id: userId,
      action: 'sign_in',
      entity_type: 'session',
      entity_id: null,
      metadata: { email: String(email || ''), source },
    });
  } catch (e) {
    console.warn('sign_in activity', e.message);
  }
}

const DEV_LOCAL_ADMIN_ID = '00000000-0000-0000-0000-00000000a001';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Dev login first: works even if Supabase vars are partially set in the OS env (avoids getAnon throwing).
    if (isDevAuthEnabled()) {
      const e = String(email).trim().toLowerCase();
      const devPass = String(process.env.DEV_ADMIN_PASSWORD || '').trim();
      const passIn = String(password).trim();
      if (
        e === String(process.env.DEV_ADMIN_EMAIL).trim().toLowerCase()
        && passIn === devPass
      ) {
        let access_token;
        try {
          access_token = signDevToken({
            sub: DEV_LOCAL_ADMIN_ID,
            email: e,
            role: 'admin',
            full_name: 'Local dev admin',
            company: 'CustomSite (local)',
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('signDevToken', err);
          return res.status(500).json({ error: 'Could not create local session' });
        }
        return res.json({
          access_token,
          refresh_token: '',
          expires_at: null,
          user: {
            id: DEV_LOCAL_ADMIN_ID,
            email: e,
            full_name: 'Local dev admin',
            company: 'CustomSite (local)',
            role: 'admin',
            created_at: new Date().toISOString(),
          },
        });
      }
    }

    if (!isSupabaseConfigured()) {
      if (isDevAuthEnabled()) {
        return res.status(401).json({
          error: 'Invalid credentials. Check DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD in .env match what you type.',
        });
      }
      return res.status(503).json({
        error: 'Server is missing Supabase configuration (SUPABASE_URL and keys in .env), or set DEV_AUTH for local sign-in.',
      });
    }

    // Service URL + key can be set while anon is missing; getAnon() would throw and become HTTP 500.
    if (!isSupabaseAnonReady()) {
      if (isDevAuthEnabled()) {
        return res.status(401).json({
          error:
            'Invalid credentials, or add SUPABASE_ANON_KEY: your env has a service key but the anon (public) key is missing, which is required for Supabase email login.',
        });
      }
      return res.status(503).json({
        error: 'Set SUPABASE_ANON_KEY in .env, or use local dev login (DEV_AUTH=1 and DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD).',
      });
    }

    let supabase;
    try {
      supabase = getAnon();
    } catch (err) {
      console.error(err);
      return res.status(503).json({
        error: 'Supabase sign-in is not available: ' + (err && err.message ? err.message : 'configure keys'),
      });
    }

    let data;
    let error;
    let session;
    try {
      const out = await supabase.auth.signInWithPassword({
        email: String(email).trim().toLowerCase(),
        password: String(password),
      });
      data = out.data;
      error = out.error;
      session = out.data && out.data.session;
    } catch (err) {
      console.error(err);
      return res.status(502).json({
        error: 'Sign-in request failed. Check the server terminal for details.',
      });
    }

    if (error || !session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

    await logSignIn(data.user.id, data.user.email, 'password');

    let profile;
    try {
      const service = getService();
      const pr = await service
        .from('users')
        .select('id, email, full_name, company, role, created_at')
        .eq('id', data.user.id)
        .maybeSingle();
      if (pr.error) {
        console.error('users lookup', pr.error);
        return res.status(502).json({ error: 'Could not load profile' });
      }
      profile = pr.data;
    } catch (err) {
      console.error(err);
      return res.status(502).json({ error: 'Could not load profile' });
    }

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name ?? null,
        company: profile?.company ?? null,
        role: profile?.role ?? 'client',
        created_at: profile?.created_at ?? null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: e && e.message ? `Login failed: ${e.message}` : 'Login failed',
    });
  }
});

router.post('/logout', (_req, res) => {
  return res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    user: {
      id: req.profile.id,
      email: req.profile.email,
      full_name: req.profile.full_name,
      company: req.profile.company,
      role: req.profile.role,
      created_at: req.profile.created_at,
    },
  });
});

module.exports = router;
