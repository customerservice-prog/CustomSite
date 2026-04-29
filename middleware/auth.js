'use strict';

const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { verifyDevToken, isDevAuthEnabled } = require('../lib/devAuth');
const { isBootstrapAdminEmail } = require('../lib/bootstrapAdmin');

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Not signed in — open your CustomSite login and sign in, then try again.',
        code: 'NO_TOKEN',
      });
    }
    const token = auth.slice(7);

    if (isDevAuthEnabled()) {
      const devPayload = verifyDevToken(token);
      if (devPayload && devPayload.sub) {
        req.isDevToken = true;
        req.authUser = { id: devPayload.sub, email: devPayload.email };
        req.authToken = token;
        req.profile = {
          id: devPayload.sub,
          email: devPayload.email,
          full_name: devPayload.full_name ?? 'Local dev admin',
          company: devPayload.company ?? 'Local',
          role: devPayload.role || 'admin',
          created_at: devPayload.created_at || new Date().toISOString(),
        };
        return next();
      }
    }

    if (!isSupabaseConfigured()) {
      if (isDevAuthEnabled()) {
        return res.status(401).json({ error: 'Invalid or expired session', code: 'INVALID_TOKEN' });
      }
      return res.status(503).json({ error: 'Server has no database (set Supabase env or enable local DEV_AUTH).' });
    }

    const supabase = getService();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session', code: 'INVALID_TOKEN' });
    }

    let { data: profile, error: pErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (pErr) {
      console.error(pErr);
      const msg = String(pErr.message || '');
      if (/does not exist|schema cache|Could not find the table/i.test(msg)) {
        return res.status(503).json({
          error: 'Database is not set up yet. Run supabase/migrations in the Supabase SQL editor (see docs/LAUNCH-PHASES.md).',
          code: 'DB_NOT_READY',
        });
      }
      return res.status(500).json({ error: 'Profile lookup failed' });
    }
    if (!profile) {
      const role = isBootstrapAdminEmail(user.email) ? 'admin' : 'client';
      const ins = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: String(user.email || '').trim().toLowerCase(),
          role,
          full_name: user.user_metadata?.full_name || null,
          company: null,
        })
        .select()
        .single();
      if (ins.error) {
        console.error('users insert', ins.error);
        if (ins.error.code === '23505') {
          const again = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
          profile = again.data;
        } else {
          return res.status(500).json({ error: 'Could not create your account profile', code: 'NO_PROFILE' });
        }
      } else {
        profile = ins.data;
      }
    }
    if (!profile) {
      return res.status(403).json({ error: 'No portal profile for this account', code: 'NO_PROFILE' });
    }

    req.authUser = user;
    req.authToken = token;
    req.profile = profile;
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
