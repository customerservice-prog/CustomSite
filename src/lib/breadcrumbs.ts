import type { UIMatch } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { routeMeta } from '@/lib/routes-meta';

export type Crumb = { label: string; to?: string };

export function crumbsFromMatches(matches: UIMatch[]): Crumb[] {
  const state = useAppStore.getState();
  const last = matches[matches.length - 1];
  if (!last) return [{ label: 'CustomSite', to: '/dashboard' }, { label: 'Dashboard' }];

  const path = last.pathname.replace(/\/$/, '') || '/';
  const params = last.params as Record<string, string | undefined>;
  const base: Crumb[] = [{ label: 'CustomSite', to: '/dashboard' }];

  if (path === '/dashboard' || path === '/' || path === '') {
    return [...base, { label: 'Dashboard' }];
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
    return [...base, { label: 'Projects', to: '/projects' }, { label: p?.name ?? 'Project' }];
  }

  if (meta.segment === 'invoices' && params.invoiceId) {
    const inv = state.invoices[params.invoiceId];
    return [...base, { label: 'Invoices', to: '/invoices' }, { label: inv?.number ?? 'Invoice' }];
  }

  return [...base, { label: meta.title }];
}
