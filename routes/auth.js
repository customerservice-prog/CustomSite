'use strict';

const express = require('express');
const { getAnon, getService } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const supabase = getAnon();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

    const service = getService();
    const { data: profile } = await service
      .from('users')
      .select('id, email, full_name, company, role, created_at')
      .eq('id', data.user.id)
      .maybeSingle();

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
    return res.status(500).json({ error: 'Login failed' });
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
