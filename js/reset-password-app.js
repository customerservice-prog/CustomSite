/**
 * reset-password.html — request reset email or set a new password after the email link.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ACCESS = 'customsite_access_token';
const REFRESH = 'customsite_refresh_token';

function show(id, on) {
  const el = document.getElementById(id);
  if (el) el.hidden = !on;
}

function msg(text, kind) {
  const el = document.getElementById('rpMsg');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind || 'info';
  el.style.color = kind === 'error' ? '#fecaca' : 'rgba(255,255,255,0.75)';
}

function redirectByRole() {
  const t = localStorage.getItem(ACCESS);
  if (!t) {
    window.location.replace('client-portal.html');
    return;
  }
  return fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j && j.user && j.user.role === 'admin') {
        window.location.replace('admin.html');
      } else {
        window.location.replace('dashboard.html');
      }
    })
    .catch(() => {
      window.location.replace('client-portal.html');
    });
}

async function getSupabase() {
  const res = await fetch('/api/config/public');
  const cfg = await res.json().catch(() => ({}));
  if (!cfg || !cfg.configured) {
    throw new Error('This site is not connected to a database. Ask your host to set Supabase env vars.');
  }
  return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

if (window.__csAuthReady) {
  try {
    await window.__csAuthReady;
  } catch (e) {
    console.error(e);
  }
}

let supabase;
try {
  supabase = await getSupabase();
} catch (e) {
  msg(e.message || 'Could not start password reset', 'error');
}

const isRecovery = /type=recovery/.test(window.location.hash);

if (isRecovery) {
  show('panelPassword', true);
  show('panelEmail', false);
} else {
  show('panelPassword', false);
  show('panelEmail', true);
}

const formEmail = document.getElementById('rpRequestForm');
if (formEmail && supabase) {
  formEmail.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('rpEmail')?.value?.trim();
    if (!email) {
      msg('Enter the email for your account.', 'error');
      return;
    }
    msg('Sending link…', 'info');
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password.html`,
    });
    if (error) {
      msg(error.message || 'Could not send email', 'error');
      return;
    }
    msg('If an account exists for that address, you will get an email with a link. Check spam.', 'ok');
  });
}

const formPw = document.getElementById('rpNewPassForm');
if (formPw && supabase) {
  formPw.addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = document.getElementById('rpNew1')?.value || '';
    const b = document.getElementById('rpNew2')?.value || '';
    if (a.length < 8) {
      msg('Use at least 8 characters for your password.', 'error');
      return;
    }
    if (a !== b) {
      msg('Passwords do not match.', 'error');
      return;
    }
    msg('Saving…', 'info');
    const { error } = await supabase.auth.updateUser({ password: a });
    if (error) {
      msg(error.message || 'Could not update password', 'error');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        localStorage.setItem(ACCESS, session.access_token);
        if (session.refresh_token) localStorage.setItem(REFRESH, session.refresh_token);
      } catch (err) {
        console.error(err);
      }
    }
    msg('Saved. Redirecting…', 'ok');
    await redirectByRole();
  });
}

document.getElementById('rpBack')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = 'client-portal.html';
});
