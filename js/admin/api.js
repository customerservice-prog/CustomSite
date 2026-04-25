'use strict';

import { clearAuth, getToken, getRefreshToken, setSessionTokens } from './config.js';
import { toast } from './toast.js';

let refreshInFlight = null;

async function refreshAccessToken() {
  const rt = getRefreshToken();
  if (!rt) return null;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const r = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
      credentials: 'same-origin',
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => ({}));
    if (!d || !d.access_token) return null;
    setSessionTokens(d.access_token, d.refresh_token || null);
    return d.access_token;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function api(path, options = {}) {
  const { _authRetry, ...fetchOpts } = options;
  const run = async () => {
    const token = getToken();
    const headers = {
      ...(fetchOpts.body && !(fetchOpts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...fetchOpts.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    let res;
    try {
      res = await fetch(path, { ...fetchOpts, headers });
    } catch (e) {
      toast('Network error — is the server running?', 'error');
      throw e;
    }
    return res;
  };

  let res = await run();
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  if (res.status === 403 && data && data.error === 'Admin access required') {
    const err = new Error(data.error || 'Forbidden');
    err.status = 403;
    err.body = data;
    throw err;
  }
  const authLikeFailure =
    res.status === 401 ||
    (res.status === 500 && data && (data.code === 'NO_TOKEN' || data.error === 'Unauthorized'));
  if (authLikeFailure) {
    if (!_authRetry) {
      const newTok = await refreshAccessToken();
      if (newTok) {
        return api(path, { ...options, _authRetry: true });
      }
    }
    clearAuth();
    window.location.replace('/client-portal.html?agency=1');
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || 'Request failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function withBusy(btn, p) {
  if (!btn) return p;
  const prev = btn.disabled;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  return p.finally(() => {
    btn.disabled = prev;
    btn.removeAttribute('aria-busy');
  });
}
