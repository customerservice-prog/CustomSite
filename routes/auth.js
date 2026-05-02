'use strict';

require('../lib/env');

const express = require('express');
const { getAnon, getService, isSupabaseConfigured, isSupabaseAnonReady } = require('../lib/supabase');
const { isBootstrapAdminEmail } = require('../lib/bootstrapAdmin');
const { resolveMeFullName } = require('../lib/displayNameFromEmail');
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
      const code = error?.code || 'invalid_credentials';
      let message = error?.message || 'Invalid credentials';
      if (code === 'email_not_confirmed' || /email not confirmed/i.test(String(message))) {
        message =
          'This email is not confirmed yet. Open the confirmation link Supabase sent, or in Supabase Dashboard go to Authentication → Users, find your account, and confirm the email (or disable “Confirm email” for testing).';
      } else if (code === 'invalid_credentials' || /invalid login credentials/i.test(String(message))) {
        message =
          'Invalid email or password. If you forgot your password, use “Forgot password?” on the portal or reset it in Supabase → Authentication → Users.';
      }
      return res.status(401).json({ error: message, code });
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
        const msg = String(pr.error.message || '');
        if (/does not exist|schema cache|Could not find the table/i.test(msg)) {
          return res.status(503).json({
            error:
              'Database is not set up. Run the SQL migrations in `supabase/migrations` in the Supabase SQL editor.',
            code: 'DB_NOT_READY',
          });
        }
        return res.status(502).json({ error: 'Could not load your account profile. Check server logs.', code: 'PROFILE_LOOKUP' });
      }
      profile = pr.data;
      if (!profile && data.user) {
        const role = isBootstrapAdminEmail(data.user.email) ? 'admin' : 'client';
        const ins = await service
          .from('users')
          .insert({
            id: data.user.id,
            email: String(data.user.email || '').trim().toLowerCase(),
            role,
            full_name: data.user.user_metadata?.full_name || null,
            company: null,
          })
          .select('id, email, full_name, company, role, created_at')
          .single();
        if (ins.error) {
          if (ins.error.code === '23505') {
            const again = await service
              .from('users')
              .select('id, email, full_name, company, role, created_at')
              .eq('id', data.user.id)
              .maybeSingle();
            profile = again.data;
          } else {
            console.error('users insert (login)', ins.error);
          }
        } else {
          profile = ins.data;
        }
      }
      if (
        profile
        && isBootstrapAdminEmail(profile.email)
        && profile.role === 'client'
        && isSupabaseConfigured()
      ) {
        try {
          const up = await service.from('users').update({ role: 'admin' }).eq('id', profile.id);
          if (!up.error) {
            const again = await service
              .from('users')
              .select('id, email, full_name, company, role, created_at')
              .eq('id', profile.id)
              .maybeSingle();
            if (again.data) profile = again.data;
          }
        } catch (e) {
          console.warn('bootstrap admin role upgrade', e.message);
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(502).json({ error: 'Could not load profile' });
    }

    const pu = profile || {
      id: data.user.id,
      email: String(data.user.email || '').trim().toLowerCase(),
      full_name: null,
      company: null,
      role: 'client',
      created_at: null,
    };
    const fullResolved = resolveMeFullName(pu, data.user);
    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullResolved,
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

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken || !String(refreshToken).trim()) {
      return res.status(400).json({ error: 'refresh_token required' });
    }
    if (!isSupabaseConfigured() || !isSupabaseAnonReady()) {
      return res.status(503).json({ error: 'Token refresh is not available on this server' });
    }
    const supabase = getAnon();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: String(refreshToken) });
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Session expired' });
    }
    const uid = data.user.id;
    let profile;
    try {
      const service = getService();
      const pr = await service
        .from('users')
        .select('id, email, full_name, company, role, created_at')
        .eq('id', uid)
        .maybeSingle();
      if (pr.error) {
        console.error('users lookup (refresh)', pr.error);
        return res.status(502).json({ error: 'Could not load profile' });
      }
      profile = pr.data;
    } catch (err) {
      console.error(err);
      return res.status(502).json({ error: 'Could not load profile' });
    }
    const puRefresh =
      profile ||
      ({
        id: data.user.id,
        email: String(data.user.email || '').trim().toLowerCase(),
        full_name: null,
        company: null,
        role: 'client',
        created_at: null,
      });
    const fullResolved = resolveMeFullName(puRefresh, data.user);
    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullResolved,
        company: puRefresh.company ?? null,
        role: puRefresh.role ?? 'client',
        created_at: puRefresh.created_at ?? null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e && e.message ? e.message : 'Refresh failed' });
  }
});

router.post('/logout', (_req, res) => {
  return res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  const full_name = resolveMeFullName(req.profile, req.authUser);
  return res.json({
    user: {
      id: req.profile.id,
      email: req.profile.email,
      full_name,
      company: req.profile.company,
      role: req.profile.role,
      created_at: req.profile.created_at,
    },
  });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};

    /** Local dev JWT — mutate in-memory profile only */
    if (req.isDevToken) {
      if (typeof body.full_name === 'string') req.profile.full_name = body.full_name.trim() || null;
      if (typeof body.company === 'string') req.profile.company = body.company.trim() || null;
      const full_name = resolveMeFullName(req.profile, req.authUser);
      return res.json({
        user: {
          id: req.profile.id,
          email: req.profile.email,
          full_name,
          company: req.profile.company,
          role: req.profile.role,
          created_at: req.profile.created_at,
        },
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Server has no Supabase profile store' });
    }

    const patch = {};
    if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim() ? body.full_name.trim() : null;
    if (typeof body.company === 'string') patch.company = body.company.trim() ? body.company.trim() : null;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Provide full_name or company to update' });
    }

    const supabase = getService();
    const { data: row, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.profile.id)
      .select('*')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    req.profile = row || req.profile;
    if (patch.full_name !== undefined || patch.company !== undefined) {
      try {
        const md = {};
        if (patch.full_name !== undefined) md.full_name = patch.full_name;
        if (patch.company !== undefined) md.company = patch.company;
        const { error: au } = await supabase.auth.admin.updateUserById(req.profile.id, { user_metadata: md });
        if (au) console.warn('[PATCH /me] auth metadata sync', au.message || au);
      } catch (e) {
        console.warn('[PATCH /me] auth.admin', e.message || e);
      }
    }

    const full_name = resolveMeFullName(req.profile, req.authUser);
    return res.json({
      user: {
        id: req.profile.id,
        email: req.profile.email,
        full_name,
        company: req.profile.company,
        role: req.profile.role,
        created_at: req.profile.created_at,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e && e.message ? e.message : 'Update failed' });
  }
});

module.exports = router;
