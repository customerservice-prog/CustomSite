/**
 * Runs first on app pages. Parses Supabase auth from URL (hash: implicit tokens;
 * ?code= PKCE) into localStorage keys used by /api/auth/* and admin fetch wrappers.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ACCESS = 'customsite_access_token';
const REFRESH = 'customsite_refresh_token';

function hasUrlAuthSignal() {
  const h = (window.location.hash || '').replace(/^#/, '');
  if (h && /(access_token|refresh_token|type=|error=)/.test(h)) return true;
  return new URLSearchParams(window.location.search).has('code');
}

function isResetPasswordPage() {
  return (window.location.pathname || '').toLowerCase().includes('reset-password');
}

/**
 * Implicit flow + PKCE: wait until Supabase has processed the URL into a session.
 */
function waitForSession(supabase, maxMs) {
  return new Promise((resolve) => {
    let sub;
    const done = (session) => {
      clearTimeout(failTimer);
      try {
        sub?.unsubscribe();
      } catch {
        /* */
      }
      resolve(session || null);
    };
    const failTimer = setTimeout(async () => {
      try {
        sub?.unsubscribe();
      } catch {
        /* */
      }
      const { data: { session } } = await supabase.auth.getSession();
      resolve(session || null);
    }, maxMs);

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY')) {
        done(session);
      }
    });
    sub = data && data.subscription;
  });
}

async function saveSessionToAppKeys(supabase) {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await new Promise((r) => setTimeout(r, 80));
    ({ data: { session } } = await supabase.auth.getSession());
  }
  if (!session) {
    session = await waitForSession(supabase, 3200);
  }
  if (!session) {
    for (const ms of [120, 250, 400]) {
      await new Promise((r) => setTimeout(r, ms));
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (s2) {
        session = s2;
        break;
      }
    }
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

async function redirectIfLoggedIn() {
  const token = localStorage.getItem(ACCESS);
  if (!token) return;
  try {
    const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
    if (r.ok) {
      const j = await r.json();
      const role = j.user && j.user.role;
      if (isResetPasswordPage()) {
        return;
      }
      window.location.replace(role === 'admin' ? 'admin.html' : 'dashboard.html');
    } else if (r.status === 503) {
      /* DB missing — let user see current page; admin shows setup banner */
    }
  } catch (e) {
    /* keep page */
  }
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
  const isIndex =
    path === '/' || path === '' || /\/index\.html$/i.test(path);
  const isClientPortal = path.endsWith('client-portal.html');

  if (hadUrlAuth && (isClientPortal || isIndex)) {
    await redirectIfLoggedIn();
  }
}

window.__csAuthReady = run();
