'use strict';

import { clearAuth, getToken } from './config.js';
import { toast } from './toast.js';

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (e) {
    toast('Network error — is the server running?', 'error');
    throw e;
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  if (res.status === 401 || (res.status === 500 && data && (data.code === 'NO_TOKEN' || data.error === 'Unauthorized'))) {
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
