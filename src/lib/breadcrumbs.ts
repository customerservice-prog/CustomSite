import type { UIMatch } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { CONVERSION_WORKSPACE_LABEL } from '@/lib/offer-positioning';
import { routeMeta } from '@/lib/routes-meta';

export type Crumb = { label: string; to?: string };

export function crumbsFromMatches(matches: UIMatch[]): Crumb[] {
  const state = useAppStore.getState();
  const last = matches[matches.length - 1];
  if (!last) return [{ label: 'CustomSite', to: '/dashboard' }, { label: routeMeta.dashboard.title }];

  const path = last.pathname.replace(/\/$/, '') || '/';
  const params = last.params as Record<string, string | undefined>;
  const base: Crumb[] = [{ label: 'CustomSite', to: '/dashboard' }];

  if (path === '/dashboard' || path === '/' || path === '') {
    return [...base, { label: routeMeta.dashboard.title }];
  }

  const segments = path.split('/').filter(Boolean);
  const first = segments[0] ?? '';

  const meta = routeMeta[first];
  if (!meta) {
    return [...base, { label: segments.join(' / ') || 'Page' }];
  }

  if (meta.segment === 'clients' && params.clientId) {
    const c = state.clients[params.clientId];
    return [...base, { label: 'Clients', to: '/clients' }, { label: c?.name ?? 'Client' }];
  }

  if (meta.segment === 'projects' && params.projectId) {
    const p = state.projects[params.projectId];
    if (segments[2] === 'site') {
      return [
        ...base,
        { label: 'Projects', to: '/projects' },
        { label: p?.name ?? 'Project', to: `/projects/${params.projectId}` },
        { label: CONVERSION_WORKSPACE_LABEL },
      ];
    }
    return [...base, { label: 'Projects', to: '/projects' }, { label: p?.name ?? 'Project' }];
  }

  if (meta.segment === 'invoices' && params.invoiceId) {
    const inv = state.invoices[params.invoiceId];
    return [...base, { label: 'Invoices', to: '/invoices' }, { label: inv?.number ?? 'Invoice' }];
  }

  if (meta.segment === 'client-portal') {
    const sub = segments[1];
    const subLabels: Record<string, string> = { messages: 'Messages', files: 'Files', invoices: 'Invoices' };
    return [...base, { label: 'Client portal', to: '/client-portal' }, ...(sub ? [{ label: subLabels[sub] ?? 'Page' }] : [])];
  }

  return [...base, { label: meta.title }];
}

/** Browser tab title from the same trail as the header breadcrumbs. */
export function documentTitleFromMatches(matches: UIMatch[]): string {
  const crumbs = crumbsFromMatches(matches);
  const last = crumbs[crumbs.length - 1];
  const leaf = (last?.label ?? 'CustomSite').trim() || 'CustomSite';
  return `${leaf} — CustomSite`;
}
