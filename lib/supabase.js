'use strict';

const { createClient } = require('@supabase/supabase-js');

function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL
      && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  );
}

/** URL + anon key — required for signInWithPassword; without it, getAnon() throws. */
function isSupabaseAnonReady() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function getAnon() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  return createClient(url, key);
}

function getService() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

module.exports = { getAnon, getService, isSupabaseConfigured, isSupabaseAnonReady };
