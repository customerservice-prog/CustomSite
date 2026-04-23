'use strict';

const { getService, isSupabaseConfigured } = require('../lib/supabase');
const { verifyDevToken, isDevAuthEnabled } = require('../lib/devAuth');

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
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

    const { data: profile, error: pErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (pErr) {
      console.error(pErr);
      return res.status(500).json({ error: 'Profile lookup failed' });
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
