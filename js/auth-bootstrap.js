/**
 * Run before other app scripts. Parses Supabase auth from URL (hash: magic link / recovery;
 * ?code: PKCE / email) into localStorage keys the rest of the app already uses.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ACCESS = 'customsite_access_token';
const REFRESH = 'customsite_refresh_token';

function hasUrlAuthSignal() {
  const h = (window.location.hash || '').replace(/^#/, '');
  if (h && /(access_token|refresh_token|type=|error=)/.test(h)) return true;
  return new URLSearchParams(window.location.search).has('code');
}

async function saveSessionToAppKeys(supabase) {
  let session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    await new Promise((r) => setTimeout(r, 50));
    session = (await supabase.auth.getSession()).data.session;
  }
  if (!session) {
    return null;
  }
  try {
    localStorage.setItem(ACCESS, session.access_token);
    if (session.refresh_token) {
      localStorage.setItem(REFRESH, session.refresh_token);
    }
  } catch (e) {
    console.error(e);
  }
  const u = new URL(window.location.href);
  if (u.hash) {
    u.hash = '';
    window.history.replaceState(null, '', u.pathname + u.search);
  }
  return session;
}

async function run() {
  const hadUrlAuth = hasUrlAuthSignal();
  if (!hadUrlAuth) return;

  let res;
  try {
    res = await fetch('/api/config/public');
  } catch {
    return;
  }
  const cfg = await res.json().catch(() => ({}));
  if (!cfg || !cfg.configured || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  const search = new URLSearchParams(window.location.search);
  if (search.has('code')) {
    const code = search.get('code');
    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('exchangeCodeForSession', error);
        } else {
          const u = new URL(window.location.href);
          u.searchParams.delete('code');
          window.history.replaceState(null, '', u.pathname + u.search + u.hash);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  await saveSessionToAppKeys(supabase);

  const path = window.location.pathname || '';
  if (path.endsWith('client-portal.html') && hadUrlAuth) {
    const token = localStorage.getItem(ACCESS);
    if (token) {
      try {
        const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
        if (r.ok) {
          const j = await r.json();
          const role = j.user && j.user.role;
          window.location.replace(role === 'admin' ? 'admin.html' : 'dashboard.html');
        }
      } catch (e) {
        /* user stays to sign in manually */
      }
    }
  }
}

window.__csAuthReady = run();
