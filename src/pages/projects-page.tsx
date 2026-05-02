import { useEffect, useMemo, useState } from 'react';
import { Calendar, Eye, LayoutGrid, Plus, Radio, Search, Table2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { PageHeader } from '@/components/ui/page-header';
import { TablePageLayout } from '@/components/layout/templates/table-page-layout';
import { TableToolbar, TableToolbarSection } from '@/components/ui/table-toolbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  PROJECT_STATUSES,
  projectHealthBadgeVariant,
  projectStatusBadgeVariant,
  type ProjectStatus,
} from '@/lib/statuses';
import { projectHealthLabel, projectHealthLevel } from '@/lib/system-intelligence';
import { cn } from '@/lib/utils';
import { useProjects, useClients } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { DetailDrawer } from '@/components/design-system/detail-drawer';
import { ActionMenu } from '@/components/design-system/action-menu';
import { formatCurrency } from '@/lib/format-display';
import { CONVERSION_WORKSPACE_LABEL } from '@/lib/offer-positioning';
import { RecommendedNextAction, type NextActionItem } from '@/components/workspace/recommended-next-action';
import { useTasks } from '@/store/hooks';
import { fetchLiveAnalytics, fetchProjectAnalytics } from '@/lib/project-analytics-api';

function formatSiteTrafficLine(p: {
  deliveryFocus: string;
  id: string;
  analyticsByProject: Record<string, { total: number; yesterday: number }>;
  liveByProject: Record<string, number>;
}) {
  if (import.meta.env.VITE_USE_REAL_API !== '1' || p.deliveryFocus !== 'client_site') return null;
  const a = p.analyticsByProject[p.id];
  const live = p.liveByProject[p.id] ?? 0;
  const total = a?.total ?? 0;
  const yest = a?.yesterday ?? 0;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-medium tabular-nums text-slate-500">
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3 w-3 text-slate-400" aria-hidden />
        {(total ?? 0).toLocaleString()} total
      </span>
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3 text-slate-400" aria-hidden />
        {(yest ?? 0).toLocaleString()} yesterday
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1',
          live > 0 ? 'text-emerald-700' : 'text-slate-400',
          live > 0 && 'animate-pulse',
        )}
      >
        <Radio className="h-3 w-3" aria-hidden />
        {live.toLocaleString()} live
      </span>
    </p>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const store = useAppStore((s) => s);
  const openModal = useAppStore((s) => s.openModal);
  const tasks = useTasks();
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [view, setView] = useState<'table' | 'cards'>(() => {
    if (typeof window === 'undefined') return 'table';
    const v = window.localStorage.getItem('projects:view');
    return v === 'cards' ? 'cards' : 'table';
  });

  useEffect(() => {
    window.localStorage.setItem('projects:view', view);
  }, [view]);

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const healthByProjectId = useMemo(() => {
    const m: Record<string, ReturnType<typeof projectHealthLevel>> = {};
    for (const p of projects) m[p.id] = projectHealthLevel(store, p.id);
    return m;
  }, [projects, store]);

  const rows = useMemo(() => {
    const filtered = projects.filter((p) => {
      const client = clientMap[p.clientId];
      const match =
        !q.trim() ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (client?.company.toLowerCase().includes(q.toLowerCase()) ?? false);
      const st = status === 'all' || p.status === status;
      return match && st;
    });
    const rank = (pid: string) => {
      const h = healthByProjectId[pid] ?? 'healthy';
      if (h === 'blocked') return 0;
      if (h === 'at_risk') return 1;
      return 2;
    };
    return filtered.sort((a, b) => {
      const d = rank(a.id) - rank(b.id);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
  }, [projects, q, status, clientMap, healthByProjectId]);

  const clientSiteProjectIdsKey = useMemo(() => rows.filter((p) => p.deliveryFocus === 'client_site').map((p) => p.id).join(','), [rows]);

  const [liveByProject, setLiveByProject] = useState<Record<string, number>>({});
  const [analyticsByProject, setAnalyticsByProject] = useState<Record<string, { total: number; yesterday: number }>>({});

  useEffect(() => {
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    let cancelled = false;
    const poll = async () => {
      const r = await fetchLiveAnalytics();
      if (cancelled || !r.ok) return;
      const m: Record<string, number> = {};
      for (const row of r.data.by_project || []) {
        m[row.project_id] = row.live_visitors;
      }
      setLiveByProject(m);
    };
    void poll();
    const t = window.setInterval(poll, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    const ids = clientSiteProjectIdsKey ? clientSiteProjectIdsKey.split(',') : [];
    if (!ids.length) {
      setAnalyticsByProject({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, { total: number; yesterday: number }> = {};
      await Promise.all(
        ids.map(async (id) => {
          const r = await fetchProjectAnalytics(id);
          if (r.ok) {
            next[id] = {
              total: r.data.total_views ?? 0,
              yesterday: r.data.yesterday_views ?? 0,
            };
          }
        }),
      );
      if (!cancelled) setAnalyticsByProject(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientSiteProjectIdsKey]);

  const drawerProject = drawerProjectId ? store.projects[drawerProjectId] : undefined;
  const drawerClient = drawerProject ? store.clients[drawerProject.clientId] : undefined;
  const drawerTaskCount = drawerProjectId
    ? Object.values(store.tasks).filter((t) => t.projectId === drawerProjectId && t.status !== 'Done').length
    : 0;
  const drawerInvoiceCount = drawerProjectId
    ? sel.invoicesList(store).filter((i) => i.projectId === drawerProjectId).length
    : 0;
  const drawerFileCount = drawerProjectId
    ? Object.values(store.files).filter((f) => f.projectId === drawerProjectId).length
    : 0;

  const healthCounts = useMemo(() => {
    let healthy = 0;
    let atRisk = 0;
    let blocked = 0;
    for (const p of projects) {
      const h = projectHealthLevel(store, p.id);
      if (h === 'healthy') healthy++;
      else if (h === 'at_risk') atRisk++;
      else blocked++;
    }
    return { healthy, atRisk, blocked };
  }, [projects, store]);

  const decisionLines = useMemo(() => {
    const lines: string[] = [];
    const blockedList = projects.filter((p) => projectHealthLevel(store, p.id) === 'blocked');
    for (const p of blockedList.slice(0, 2)) {
      const co = clientMap[p.clientId]?.company ?? 'Client';
      lines.push(`${p.name} (${co}) is blocked — assign an owner and unblock cash or delivery.`);
    }
    const atRisk = projects.filter((p) => projectHealthLevel(store, p.id) === 'at_risk');
    for (const p of atRisk.slice(0, 2)) {
      lines.push(`${p.name} is at risk — deadline ${p.due}. Review tasks before you promise more scope.`);
    }
    return lines.slice(0, 3);
  }, [projects, store, clientMap]);

  const projectNextActions: NextActionItem[] = useMemo(() => {
    const items: NextActionItem[] = [];
    const blockedP = projects.find((p) => projectHealthLevel(store, p.id) === 'blocked');
    if (blockedP) {
      items.push({
        label: `Unblock ${blockedP.name}`,
        hint: `${clientMap[blockedP.clientId]?.company ?? 'Client'} — resolve budget or delivery issues.`,
        href: `/projects/${blockedP.id}`,
        tone: 'danger',
      });
    }
    const atRiskP = projects.find((p) => projectHealthLevel(store, p.id) === 'at_risk');
    if (atRiskP) {
      items.push({
        label: `Confirm scope on ${atRiskP.name}`,
        hint: 'Budget or timeline needs a client check-in.',
        href: `/projects/${atRiskP.id}`,
        tone: 'warning',
      });
    }
    const blockedTask = tasks.find((t) => t.status === 'Blocked');
    if (blockedTask && items.length < 3) {
      const pr = store.projects[blockedTask.projectId];
      items.push({
        label: `Resolve blocker: ${blockedTask.title}`,
        hint: pr?.name ? `Project · ${pr.name}` : undefined,
        href: '/tasks',
        tone: 'danger',
      });
    }
    return items.slice(0, 3);
  }, [projects, store, tasks]);

  return (
    <TablePageLayout
      header={
        <div className="space-y-4">
          <PageHeader
            title="Projects"
            description="Unhealthy work shouldn't compete for attention — this is where you see every client build at once, with blocked and at-risk rows sorted to the top."
            actions={
              <Button type="button" className="gap-2" onClick={() => openModal('create-project')}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            }
          />
          {decisionLines.length > 0 && (
            <Card variant="compact" className="border-l-4 border-slate-800 bg-white py-3 ring-1 ring-slate-900/5">
              <p className="text-[11px] font-bold uppercase text-slate-600">Decide next</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-slate-900">
                {decisionLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </Card>
          )}
          {healthCounts.blocked > 0 && (
            <Card variant="compact" className="border-l-4 border-red-600 bg-red-50/60 ring-1 ring-red-900/10">
              <p className="text-sm font-bold text-red-950">{healthCounts.blocked} project(s) blocked — cash and trust stall.</p>
              <p className="mt-1 text-xs text-red-900/85">Open the first row in the table and clear the blocker before you add scope.</p>
            </Card>
          )}
          <Card variant="compact" className="border border-slate-200/90 bg-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Delivery mix</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs sm:text-sm">
              <span>
                <span className="font-semibold text-emerald-800">{healthCounts.healthy}</span>{' '}
                <span className="text-slate-600">on track</span>
              </span>
              <span>
                <span className="font-semibold text-amber-800">{healthCounts.atRisk}</span>{' '}
                <span className="text-slate-600">slipping</span>
              </span>
              <span>
                <span className="font-semibold text-red-800">{healthCounts.blocked}</span>{' '}
                <span className="text-slate-600">blocked</span>
              </span>
            </div>
          </Card>
          <RecommendedNextAction items={projectNextActions} />
        </div>
      }
      toolbar={
        <TableToolbar>
          <TableToolbarSection grow>
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search project or client…"
                className="pl-10"
                aria-label="Search projects"
              />
            </div>
          </TableToolbarSection>
          <TableToolbarSection>
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">View</span>
            <IconButton
              aria-label="Table view"
              className={cn(view === 'table' && 'border-indigo-200 bg-indigo-50 text-indigo-800')}
              onClick={() => setView('table')}
            >
              <Table2 className="h-4 w-4" />
            </IconButton>
            <IconButton
              aria-label="Card view"
              className={cn(view === 'cards' && 'border-indigo-200 bg-indigo-50 text-indigo-800')}
              onClick={() => setView('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </IconButton>
          </TableToolbarSection>
        </TableToolbar>
      }
    >
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {(['all', ...PROJECT_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-semibold transition duration-150',
              status === s
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
          No projects match these filters.
        </div>
      ) : view === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Project</TableHeadCell>
              <TableHeadCell>Client</TableHeadCell>
                  <TableHeadCell>Client site</TableHeadCell>
                  <TableHeadCell>Site traffic</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Health</TableHeadCell>
              <TableHeadCell className="text-right">Budget</TableHeadCell>
              <TableHeadCell className="min-w-[140px]">Progress</TableHeadCell>
              <TableHeadCell>Due</TableHeadCell>
              <TableHeadCell>Owner</TableHeadCell>
              <TableHeadCell className="w-12 pr-4 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const client = clientMap[p.clientId];
              const owner = users[p.ownerId];
              const pct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
              const hl = healthByProjectId[p.id] ?? 'healthy';
              return (
                <TableRow
                  key={p.id}
                  clickable
                  className={drawerProjectId === p.id ? 'bg-indigo-50/50' : undefined}
                  onClick={() => setDrawerProjectId(p.id)}
                >
                  <TableCell>
                    <Link
                      to={`/projects/${p.id}`}
                      className="font-semibold text-indigo-700 hover:text-indigo-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {client ? (
                      <Link to={`/clients/${client.id}`} className="text-slate-800 hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
                        {client.company}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {p.deliveryFocus === 'client_site' ? (
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            p.siteStatus === 'live' ? 'success' : p.siteStatus === 'review' ? 'info' : 'warning'
                          }
                          className="w-fit capitalize"
                        >
                          {p.siteStatus ?? 'draft'}
                        </Badge>
                        <Link
                          to={`/projects/${p.id}/site`}
                          className="text-[11px] font-semibold text-violet-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {CONVERSION_WORKSPACE_LABEL} →
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Retainer / app</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-[11px] text-slate-600">
                    {p.deliveryFocus === 'client_site'
                      ? (formatSiteTrafficLine({
                          deliveryFocus: p.deliveryFocus,
                          id: p.id,
                          analyticsByProject,
                          liveByProject,
                        }) ?? (
                          <span className="text-slate-400">
                            {import.meta.env.VITE_USE_REAL_API === '1' ? 'Loading…' : 'Real API mode only'}
                          </span>
                        ))
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={projectStatusBadgeVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={projectHealthBadgeVariant(hl)}>{projectHealthLabel(hl)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(p.budget)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <ProgressBar value={pct} max={100} />
                      <span className="text-[11px] font-semibold text-slate-500">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{p.due}</TableCell>
                  <TableCell className="text-slate-600">{owner?.name}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      label={`Actions for ${p.name}`}
                      items={[
                        { label: 'View details', onClick: () => setDrawerProjectId(p.id) },
                        { label: 'Open project page', onClick: () => navigate(`/projects/${p.id}`) },
                        ...(p.deliveryFocus === 'client_site'
                          ? [{ label: CONVERSION_WORKSPACE_LABEL, onClick: () => navigate(`/projects/${p.id}/site`) }]
                          : []),
                        { label: 'New task', onClick: () => { navigate('/tasks'); } },
                        {
                          label: 'New invoice',
                          onClick: () => {
                            openModal('create-invoice');
                          },
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const client = clientMap[p.clientId];
            const pct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
            const hl = healthByProjectId[p.id] ?? 'healthy';
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="block">
                <Card className="h-full border-slate-200/80 p-4 transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={projectStatusBadgeVariant(p.status)}>{p.status}</Badge>
                      <Badge variant={projectHealthBadgeVariant(hl)} className="text-[10px]">
                        {projectHealthLabel(hl)}
                      </Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{client?.company}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    ${p.spent.toLocaleString()} <span className="font-normal text-slate-400">/</span> ${p.budget.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={pct} max={100} />
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">Due {p.due}</p>
                  {p.deliveryFocus === 'client_site' ? (
                    <div className="mt-2 border-t border-slate-100/90 pt-2">
                      {formatSiteTrafficLine({
                        deliveryFocus: p.deliveryFocus,
                        id: p.id,
                        analyticsByProject,
                        liveByProject,
                      }) ?? (
                        <p className="text-[10px] text-slate-400">
                          {import.meta.env.VITE_USE_REAL_API === '1' ? 'Loading…' : 'Site traffic uses real API mode.'}
                        </p>
                      )}
                    </div>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <DetailDrawer
        open={Boolean(drawerProject)}
        title={drawerProject?.name ?? 'Project'}
        subtitle={drawerClient ? drawerClient.company : undefined}
        onClose={() => setDrawerProjectId(null)}
        footer={
          drawerProject ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate(`/projects/${drawerProject.id}`)}>
                Open project
              </Button>
              <Button type="button" variant="secondary" onClick={() => openModal('create-task')}>
                New task
              </Button>
              <Button type="button" variant="secondary" onClick={() => openModal('create-invoice')}>
                New invoice
              </Button>
            </div>
          ) : null
        }
      >
        {drawerProject && drawerClient ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Delivery</p>
                <p className="mt-1 text-sm text-slate-700">
                  Status <span className="font-semibold text-slate-900">{drawerProject.status}</span>
                </p>
                <p className="text-sm text-slate-700">
                  Due <span className="font-semibold text-slate-900">{drawerProject.due}</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Budget {formatCurrency(drawerProject.budget)} · Spent {formatCurrency(drawerProject.spent)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Related volume</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-900">{drawerTaskCount}</span> open tasks
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">{drawerInvoiceCount}</span> invoices
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">{drawerFileCount}</span> files
                  </li>
                </ul>
                <Link to={`/clients/${drawerClient.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  Client profile
                </Link>
              </div>
            </div>
            {drawerProject.deliveryFocus === 'client_site' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-900">Client site</p>
                <p className="mt-1 text-sm text-slate-800">
                  Status <span className="font-semibold capitalize">{drawerProject.siteStatus ?? 'draft'}</span> ·{' '}
                  {drawerProject.sitePageCount ?? '—'} pages · Last: {drawerProject.lastSiteUpdateLabel ?? '—'}
                </p>
                {drawerProject.siteLiveUrl && (
                  <p className="mt-1 truncate text-xs text-purple-800">{drawerProject.siteLiveUrl}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Activity</p>
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {sel.getActivitiesForProject(store, drawerProject.id).slice(0, 10).length === 0 ? (
                  <li className="text-sm text-slate-500">No recent activity on this project.</li>
                ) : (
                  sel
                    .getActivitiesForProject(store, drawerProject.id)
                    .slice(0, 10)
                    .map((a) => (
                      <li key={a.id} className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{a.title}</span>
                        <span className="text-slate-500"> · {a.timeLabel}</span>
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </TablePageLayout>
  );
}
