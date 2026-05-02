import { adminFetchJson, getRailwayCredentials } from '@/lib/admin-api';
import type { ApiProjectRow } from '@/lib/agency-api-map';

/** Hostname only: strips protocol, path, port; lowercases. */
export function normalizeCustomDomainInput(raw: string): string {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0] ?? '';
  s = s.split(':')[0] ?? '';
  s = s.replace(/\.$/, '').trim();
  if (s.startsWith('www.')) s = s.slice(4);
  return s;
}

/** Target hostname for a CNAME (e.g. xxxxx.up.railway.app) from a full Railway HTTPS URL. */
export function railwayHostnameFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  try {
    const u = new URL(t.startsWith('http') ? t : `https://${t}`);
    return u.hostname || null;
  } catch {
    return null;
  }
}

export async function fetchAdminProject(projectId: string) {
  return adminFetchJson<{ project?: ApiProjectRow }>(`/api/admin/projects/${encodeURIComponent(projectId)}`);
}

export type ProjectHostingPatch = {
  custom_domain?: string | null;
  railway_url_production?: string | null;
  railway_project_id_production?: string | null;
  railway_service_id_production?: string | null;
  railway_url_staging?: string | null;
  railway_project_id_staging?: string | null;
  railway_service_id_staging?: string | null;
  name?: string;
  status?: string;
  site_settings?: Record<string, unknown>;
};

export async function patchAdminProject(projectId: string, patch: ProjectHostingPatch) {
  return adminFetchJson<{ project?: ApiProjectRow }>(`/api/admin/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    json: patch,
  });
}

export async function deployAdminProjectZip(projectId: string, environment: 'staging' | 'production') {
  const { token, teamId } = getRailwayCredentials();
  return adminFetchJson<Record<string, unknown>>(`/api/admin/projects/${encodeURIComponent(projectId)}/deploy`, {
    method: 'POST',
    json: {
      environment,
      ...(token.trim() ? { token: token.trim() } : {}),
      ...(teamId.trim() ? { teamId: teamId.trim() } : {}),
    },
  });
}

export async function attachRailwayCustomDomain(
  projectId: string,
  body: { domain?: string; serviceId?: string; token?: string; includeWww?: boolean } = {}
) {
  return adminFetchJson<{
    ok?: boolean;
    domain?: string;
    dnsRecords?: unknown[];
    error?: string;
    code?: string;
  }>(`/api/admin/projects/${encodeURIComponent(projectId)}/railway/attach-custom-domain`, {
    method: 'POST',
    json: body,
  });
}
