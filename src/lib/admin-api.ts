/** Matches `js/site-builder/config.js` — same keys the legacy admin and site-builder.html use. */
export const ADMIN_ACCESS_TOKEN_KEY = 'customsite_access_token';
export const ADMIN_REFRESH_TOKEN_KEY = 'customsite_refresh_token';
export const RAILWAY_TOKEN_KEY = 'customsite_railway_api_token';
export const RAILWAY_TEAM_KEY = 'customsite_railway_team_id';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
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

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Uses `/api/auth/refresh` + `customsite_refresh_token` (same as legacy admin `api.js`).
 * Returns new access token on success; updates localStorage.
 */
export async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const rt = getRefreshToken();
      if (!rt?.trim()) return null;
      const r = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt.trim() }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string | null;
      };
      if (!r.ok || !data.access_token) return null;
      try {
        localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, data.access_token);
        if (data.refresh_token) {
          localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, data.refresh_token);
        }
      } catch {
        /* */
      }
      return data.access_token;
    } catch {
      return null;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function parseFetchResult<T>(res: Response): Promise<AdminJsonResult<T>> {
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

/**
 * Same-origin fetch to Express `/api/admin/*` (and `/api/auth/*`) with Bearer token when present.
 * On 401, attempts one refresh via `/api/auth/refresh` then retries the request (legacy admin parity).
 */
export async function adminFetchJson<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<AdminJsonResult<T>> {
  const buildHeaders = (accessToken: string | null) => {
    const headers = new Headers(init?.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init && 'json' in init && init.json !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  };

  let body = init?.body ?? undefined;
  if (init && 'json' in init && init.json !== undefined) {
    body = JSON.stringify(init.json);
  }

  const run = async (accessToken: string | null): Promise<Response> => {
    try {
      return await fetch(path, { ...init, headers: buildHeaders(accessToken), body });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      throw new Error(msg);
    }
  };

  let res: Response;
  try {
    res = await run(getAccessToken());
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, error: msg };
  }

  if (res.status === 401 && getRefreshToken()?.trim()) {
    const newTok = await tryRefreshAccessToken();
    if (newTok) {
      try {
        res = await run(newTok);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network error';
        return { ok: false, status: 0, error: msg };
      }
    }
  }

  return parseFetchResult<T>(res);
}
