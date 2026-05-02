import { formatRelativeShort } from '@/lib/format-relative';
import { projectStatusForLifecycle } from '@/lib/project-lifecycle';
import type { Client, Project, ProjectDeliveryFocus, ProjectLifecycleStage, SiteBuildArchetypeId } from '@/lib/types/entities';
import type { ClientStatus } from '@/lib/statuses';
import type { ProjectStatus } from '@/lib/statuses';

/** Embedded in `projects.internal_notes` so SPA fields survive without extra DB columns. */
export const SPA_PROJECT_META_KEY = '__customsite_spa_v1';

export type SpaProjectMeta = {
  budget?: number;
  due?: string;
  ownerId?: string;
  spent?: number;
  deliveryFocus?: ProjectDeliveryFocus;
  lifecycleStage?: ProjectLifecycleStage;
  siteBuildArchetype?: SiteBuildArchetypeId | null;
  servicePackage?: string | null;
  clientStatus?: ClientStatus;
};

export function buildProjectInternalNotes(meta: SpaProjectMeta, existingRaw?: string | null): string {
  let base: Record<string, unknown> = {};
  if (existingRaw?.trim()) {
    try {
      const parsed = JSON.parse(existingRaw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        base = { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      /* keep base empty; overwrite with structured blob only */
    }
  }
  base[SPA_PROJECT_META_KEY] = meta;
  return JSON.stringify(base);
}

export function parseSpaProjectMeta(internalNotes: string | null | undefined): SpaProjectMeta {
  if (!internalNotes?.trim()) return {};
  try {
    const o = JSON.parse(internalNotes) as Record<string, unknown>;
    const block = o[SPA_PROJECT_META_KEY];
    if (!block || typeof block !== 'object' || Array.isArray(block)) return {};
    return block as SpaProjectMeta;
  } catch {
    return {};
  }
}

/** DB `projects.status` → SPA lifecycle */
export function serverProjectStatusToLifecycle(status: string | undefined | null): ProjectLifecycleStage {
  const s = (status || 'discovery').toLowerCase();
  const map: Record<string, ProjectLifecycleStage> = {
    discovery: 'discovery',
    design: 'proposal_contract',
    development: 'build',
    review: 'review',
    live: 'post_launch',
  };
  return map[s] || 'discovery';
}

export function lifecycleStageToServerProjectStatus(stage: ProjectLifecycleStage): string {
  const map: Record<ProjectLifecycleStage, string> = {
    inquiry: 'discovery',
    discovery: 'discovery',
    proposal_contract: 'design',
    build: 'development',
    review: 'review',
    launch: 'live',
    post_launch: 'live',
  };
  return map[stage] || 'discovery';
}

export type ApiClientRow = {
  id: string;
  email: string;
  full_name?: string | null;
  company?: string | null;
  phone?: string | null;
  created_at?: string;
};

export function mapApiClientRowToClient(row: ApiClientRow, ownerId: string): Client {
  const name = (row.full_name && String(row.full_name).trim()) || row.company || row.email.split('@')[0] || 'Client';
  const company = (row.company && String(row.company).trim()) || '';
  const created = row.created_at || new Date().toISOString();
  const status: ClientStatus = 'Active';
  return {
    id: row.id,
    name,
    company,
    email: row.email,
    phone: (row.phone && String(row.phone)) || '',
    status,
    ownerId,
    lifetimeValue: 0,
    balance: 0,
    createdAt: created,
    updatedAt: created,
    lastActivityLabel: formatRelativeShort(created),
  };
}

export type ApiProjectRow = Record<string, unknown> & {
  id?: string;
  client_id?: string;
  name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  website_type?: string | null;
  internal_notes?: string | null;
  custom_domain?: string | null;
  railway_url_production?: string | null;
  railway_project_id_production?: string | null;
  railway_service_id_production?: string | null;
};

function normalizeDomainHostFromRow(input: unknown): string | null {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0] || '';
  s = s.split(':')[0] || '';
  s = s.replace(/\.$/, '').trim();
  return s || null;
}

function withHttpsBase(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function pick<T>(row: ApiProjectRow, snake: keyof ApiProjectRow, camel: string): T | undefined {
  const v = row[snake] ?? row[camel as keyof ApiProjectRow];
  return v as T | undefined;
}

export function mapApiProjectRowToProject(row: ApiProjectRow, clients: Record<string, Client>): Project | null {
  const id = pick<string>(row, 'id', 'id');
  const clientId = pick<string>(row, 'client_id', 'clientId');
  const name = pick<string>(row, 'name', 'name');
  if (!id || !clientId || !name) return null;

  const internal = pick<string>(row, 'internal_notes', 'internalNotes') ?? null;
  const meta = parseSpaProjectMeta(internal);
  const websiteType = pick<string>(row, 'website_type', 'websiteType') ?? null;

  const lifecycleStage =
    meta.lifecycleStage && typeof meta.lifecycleStage === 'string'
      ? meta.lifecycleStage
      : serverProjectStatusToLifecycle(pick<string>(row, 'status', 'status'));
  const status: ProjectStatus = projectStatusForLifecycle(lifecycleStage);

  const deliveryFocus: ProjectDeliveryFocus =
    meta.deliveryFocus === 'product_other' || websiteType === 'product_other' ? 'product_other' : 'client_site';

  const createdAt = pick<string>(row, 'created_at', 'createdAt') || new Date().toISOString();
  const updatedAt = pick<string>(row, 'updated_at', 'updatedAt') || createdAt;
  const ownerId = (meta.ownerId as string | undefined) || clients[clientId]?.ownerId || 'u1';

  const customDomainHost = normalizeDomainHostFromRow(pick(row, 'custom_domain', 'customDomain'));
  const railwayProductionUrl = pick<string>(row, 'railway_url_production', 'railwayUrlProduction') ?? null;
  const railwayServiceIdProduction =
    pick<string>(row, 'railway_service_id_production', 'railwayServiceIdProduction') ?? null;
  const siteLiveUrl = customDomainHost
    ? `https://${customDomainHost}`
    : withHttpsBase(railwayProductionUrl ?? undefined);

  return {
    id,
    clientId,
    name,
    status,
    budget: typeof meta.budget === 'number' ? meta.budget : 0,
    spent: typeof meta.spent === 'number' ? meta.spent : 0,
    due: meta.due?.trim() || 'TBD',
    ownerId,
    createdAt,
    updatedAt,
    lifecycleStage,
    templateId: null,
    siteBuildArchetype: meta.siteBuildArchetype ?? null,
    waitingOn: null,
    deliveryFocus,
    siteStatus: deliveryFocus === 'client_site' ? 'draft' : undefined,
    customDomainHost: customDomainHost || null,
    railwayProductionUrl: railwayProductionUrl?.trim() || null,
    railwayServiceIdProduction: railwayServiceIdProduction?.trim() || null,
    siteLiveUrl,
    lastSiteUpdateLabel: deliveryFocus === 'client_site' ? 'Not launched yet' : undefined,
    sitePageCount: deliveryFocus === 'client_site' ? 5 : undefined,
    clientPortalVisible: deliveryFocus === 'client_site' ? true : undefined,
    servicePackage: (meta.servicePackage as Project['servicePackage']) ?? null,
  };
}
