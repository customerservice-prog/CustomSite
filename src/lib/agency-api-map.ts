import { formatLastStudioTouch, formatRelativeShort } from '@/lib/format-relative';
import { projectStatusForLifecycle } from '@/lib/project-lifecycle';
import type {
  Client,
  ClientSiteStatus,
  Project,
  ProjectDeliveryFocus,
  ProjectLifecycleStage,
  SiteBuildArchetypeId,
} from '@/lib/types/entities';
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
  /** From `users.is_owner` — house account, not billed via revenue KPIs */
  is_owner?: boolean | null;
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
    isOwner: Boolean(row.is_owner),
    lifetimeValue: 0,
    balance: 0,
    createdAt: created,
    updatedAt: created,
    lastActivityLabel: formatRelativeShort(created),
  };
}

export type ApiProjectDashboard = {
  last_studio_touch?: string | null;
  site_file_count?: number;
  html_page_count?: number;
  video_count?: number;
  effective_site_status?: string;
  deliverable_progress_pct?: number;
  thumbnail_url_resolved?: string | null;
  live_url_resolved?: string | null;
  focus_line?: string | null;
  pageviews_total?: number;
  pageviews_yesterday?: number;
  live_visitors?: number;
};

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
  published_at?: string | null;
  launched_at?: string | null;
  thumbnail_url?: string | null;
  live_url?: string | null;
  stage?: string | null;
  dashboard?: ApiProjectDashboard | null;
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

  const rawStatus = pick<string>(row, 'status', 'status') || 'discovery';
  const publishedAtDb = pick<string | null>(row, 'published_at', 'publishedAt') ?? null;
  const launchedAtDb = pick<string | null>(row, 'launched_at', 'launchedAt') ?? null;
  const dash = row.dashboard && typeof row.dashboard === 'object' ? (row.dashboard as ApiProjectDashboard) : null;

  const deliveryFocus: ProjectDeliveryFocus =
    meta.deliveryFocus === 'product_other' || websiteType === 'product_other' ? 'product_other' : 'client_site';

  const dbSaysLive =
    String(rawStatus || '').toLowerCase() === 'live' ||
    Boolean(publishedAtDb && String(publishedAtDb).trim()) ||
    Boolean(launchedAtDb && String(launchedAtDb).trim());

  let lifecycleStage: ProjectLifecycleStage =
    meta.lifecycleStage && typeof meta.lifecycleStage === 'string'
      ? (meta.lifecycleStage as ProjectLifecycleStage)
      : serverProjectStatusToLifecycle(rawStatus);

  if (deliveryFocus === 'client_site' && dbSaysLive) {
    lifecycleStage = 'post_launch';
  }

  const status: ProjectStatus = projectStatusForLifecycle(lifecycleStage);

  const createdAt = pick<string>(row, 'created_at', 'createdAt') || new Date().toISOString();
  const updatedAt = pick<string>(row, 'updated_at', 'updatedAt') || createdAt;
  const ownerId = (meta.ownerId as string | undefined) || clients[clientId]?.ownerId || 'u1';

  const customDomainHost = normalizeDomainHostFromRow(pick(row, 'custom_domain', 'customDomain'));
  const railwayProductionUrl = pick<string>(row, 'railway_url_production', 'railwayUrlProduction') ?? null;
  const railwayServiceIdProduction =
    pick<string>(row, 'railway_service_id_production', 'railwayServiceIdProduction') ?? null;

  const liveResolved = dash?.live_url_resolved?.trim();
  const explicitLiveUrl = pick<string | null>(row, 'live_url', 'liveUrl')?.trim();
  const siteLiveUrl =
    liveResolved ||
    withHttpsBase(explicitLiveUrl ?? undefined) ||
    (customDomainHost ? `https://${customDomainHost}` : null) ||
    withHttpsBase(railwayProductionUrl ?? undefined);

  let siteStatus: ClientSiteStatus | undefined;
  if (deliveryFocus === 'client_site') {
    const eff = dash?.effective_site_status;
    if (eff === 'live' || eff === 'review' || eff === 'draft') {
      siteStatus = eff;
    } else {
      siteStatus =
        lifecycleStage === 'post_launch' ? 'live' : lifecycleStage === 'review' ? 'review' : 'draft';
    }
  }

  const htmlCount = dash?.html_page_count;
  const sitePageCount =
    deliveryFocus === 'client_site'
      ? typeof htmlCount === 'number' && htmlCount > 0
        ? htmlCount
        : undefined
      : undefined;

  const siteVideoCount =
    deliveryFocus === 'client_site' && typeof dash?.video_count === 'number' ? dash.video_count : undefined;

  const fileCount = dash?.site_file_count ?? 0;
  const lastTouch = dash?.last_studio_touch && String(dash.last_studio_touch).trim();
  let lastSiteUpdateLabel: string | undefined;
  if (deliveryFocus === 'client_site') {
    if (lastTouch) lastSiteUpdateLabel = formatLastStudioTouch(lastTouch);
    else if (fileCount > 0) lastSiteUpdateLabel = formatLastStudioTouch(updatedAt);
    else if (lifecycleStage === 'post_launch') lastSiteUpdateLabel = 'Live on production';
    else lastSiteUpdateLabel = 'No site files saved yet';
  }

  const thumbStored = pick<string | null>(row, 'thumbnail_url', 'thumbnailUrl')?.trim();
  const thumbnailUrl = dash?.thumbnail_url_resolved?.trim() || thumbStored || null;

  const deliverableProgressPercent =
    typeof dash?.deliverable_progress_pct === 'number' ? dash.deliverable_progress_pct : undefined;

  const studioFocusLine =
    dash?.focus_line && String(dash.focus_line).trim() ? String(dash.focus_line).trim() : null;

  const publishedAt =
    publishedAtDb && String(publishedAtDb).trim() ? String(publishedAtDb).trim() : null;

  const siteAnalyticsSnapshot =
    deliveryFocus === 'client_site' && dash
      ? {
          total: Number(dash.pageviews_total ?? 0),
          yesterday: Number(dash.pageviews_yesterday ?? 0),
          live: Number(dash.live_visitors ?? 0),
        }
      : undefined;

  return {
    id,
    clientId,
    name,
    status,
    budget: typeof meta.budget === 'number' ? meta.budget : 0,
    spent: typeof meta.spent === 'number' ? meta.spent : 0,
    due: meta.due?.trim() || 'TBD',
    ownerId,
    clientIsOwner: Boolean(clients[clientId]?.isOwner),
    createdAt,
    updatedAt,
    lifecycleStage,
    templateId: null,
    siteBuildArchetype: meta.siteBuildArchetype ?? null,
    waitingOn: null,
    deliveryFocus,
    siteStatus,
    customDomainHost: customDomainHost || null,
    railwayProductionUrl: railwayProductionUrl?.trim() || null,
    railwayServiceIdProduction: railwayServiceIdProduction?.trim() || null,
    siteLiveUrl,
    lastSiteUpdateLabel,
    sitePageCount,
    siteVideoCount,
    publishedAt,
    thumbnailUrl,
    deliverableProgressPercent,
    studioFocusLine,
    siteAnalyticsSnapshot,
    clientPortalVisible: deliveryFocus === 'client_site' ? true : undefined,
    servicePackage: (meta.servicePackage as Project['servicePackage']) ?? null,
  };
}
