'use strict';

import { getToken, TOKEN_KEY, REFRESH_KEY } from './config.js';
export { TOKEN_KEY };

let serverError = false;
export function hasServerError() {
  return serverError;
}
export function clearServerError() {
  serverError = false;
}

export async function api(path, options = {}) {
  const t = getToken();
  const headers = { ...options.headers };
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.body && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  let r;
  try {
    r = await fetch(path, { ...options, headers });
  } catch (e) {
    serverError = true;
    const reason = e && e.name === 'TypeError' ? ' (network or CORS — often offline, wrong host, or blocked request).' : '';
    throw new Error('Could not reach the server' + reason);
  }
  serverError = false;
  if (r.status === 401) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* */
    }
    window.location.replace('client-portal.html?agency=1');
    throw new Error('Session expired. Sign in again.');
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    const raw = String((j && (j.error || j.message)) || r.statusText || 'Request failed');
    const friendly = /schema cache|Could not find the table|relation .+ does not exist|PGRST205|PGRST204/i.test(raw)
      ? 'Database is not set up yet. In your Supabase project, run the SQL in the repo (supabase/migrations) or see docs/LAUNCH-PHASES.md.'
      : /NO_TOKEN|Unauthorized/i.test(raw) && r.status === 500
        ? 'You are not signed in. Open the site builder again after signing in to admin.'
        : raw;
    throw new Error(friendly);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return r.json();
  }
  if (ct.includes('application/zip') || ct.includes('application/octet-stream') || ct.includes('zip')) {
    return r.blob();
  }
  return r.text();
}
