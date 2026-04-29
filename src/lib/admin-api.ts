/** Matches `js/site-builder/config.js` — same token the legacy admin and site-builder.html use. */
export const ADMIN_ACCESS_TOKEN_KEY = 'customsite_access_token';
export const RAILWAY_TOKEN_KEY = 'customsite_railway_api_token';
export const RAILWAY_TEAM_KEY = 'customsite_railway_team_id';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRailwayCredentials(): { token: string; teamId: string } {
  try {
    return {
      token: localStorage.getItem(RAILWAY_TOKEN_KEY) || '',
      teamId: localStorage.getItem(RAILWAY_TEAM_KEY) || '',
    };
  } catch {
    return { token: '', teamId: '' };
  }
}

export type AdminJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code?: string };

/**
 * Same-origin fetch to Express `/api/admin/*` with Bearer token when present.
 */
export async function adminFetchJson<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<AdminJsonResult<T>> {
  const headers = new Headers(init?.headers);
  const t = getAccessToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  let body = init?.body ?? undefined;
  if (init && 'json' in init && init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, error: msg };
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = (await res.json()) as T;
    if (!res.ok) {
      const body = data as { error?: string; message?: string; code?: string };
      const err = body?.error || body?.message;
      const code = typeof body?.code === 'string' ? body.code : undefined;
      return { ok: false, status: res.status, error: err || res.statusText || 'Request failed', code };
    }
    return { ok: true, data };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text || res.statusText };
  }
  return { ok: true, data: (await res.text()) as T };
}
