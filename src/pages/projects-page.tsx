import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Clapperboard,
  Eye,
  FileText,
  LayoutGrid,
  Pencil,
  Plus,
  Radio,
  Search,
  Table2,
} from 'lucide-react';
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
import { fetchProjectVideosArchiveZip } from '@/lib/project-videos-api';
import { deleteProjectWithLiveConfirm } from '@/lib/admin-project-entity-api';
import { getAccessToken } from '@/lib/admin-api';
import { compileSectionsToPreviewHtml } from '@/lib/site-production/compile-preview-html';
import { applyInlinePreviewYoutubeThumbnailPlaceholders } from '@/lib/site-builder/preview-youtube-thumbnail-placeholder';
import { openClientSitePreviewTab } from '@/lib/site-builder/open-client-site-preview';
import { siteProductionBundleKey, useSiteProductionStore } from '@/store/useSiteProductionStore';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import { fetchProjectSiteSourceExportZip, siteFilesTargetLiveServer } from '@/lib/site-builder/site-builder-site-api';
import { useShell } from '@/context/shell-context';

import type { Project } from '@/lib/types/entities';

function formatSiteTrafficLine(p: {
  project: Project;
  analyticsByProject: Record<string, { total: number; yesterday: number; today: number }>;
  liveByProject: Record<string, number>;
}) {
  if (import.meta.env.VITE_USE_REAL_API !== '1' || p.project.deliveryFocus !== 'client_site') return null;
  const pr = p.project;
  const a = p.analyticsByProject[pr.id];
  const snap = pr.siteAnalyticsSnapshot;
  const total = a?.total ?? snap?.total ?? 0;
  const yest = a?.yesterday ?? snap?.yesterday ?? 0;
  const today = a?.today ?? 0;
  const live = p.liveByProject[pr.id] ?? snap?.live ?? 0;

  return (
    <>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold tabular-nums text-slate-700">
        <span className="inline-flex items-center gap-1" title="All-time views (since launch, server)">
          <Eye className="h-3 w-3 text-slate-400" aria-hidden />
          {(total ?? 0).toLocaleString()} total
        </span>
        <span className="inline-flex items-center gap-1 text-slate-300">·</span>
        <span className="inline-flex items-center gap-1" title="Views today (UTC midnight boundary on server)">
          <Activity className="h-3 w-3 text-slate-400" aria-hidden />
          {(today ?? 0).toLocaleString()} today
        </span>
        <span className="inline-flex items-center gap-1 text-slate-300">·</span>
        <span className="inline-flex items-center gap-1" title="Yesterday (daily rollup)">
          <Calendar className="h-3 w-3 text-slate-400" aria-hidden />
          {(yest ?? 0).toLocaleString()} y&apos;day
        </span>
        <span className="inline-flex items-center gap-1 text-slate-300">·</span>
        <span
          className={cn(
            'inline-flex items-center gap-1',
            live > 0 ? 'text-emerald-700' : 'text-slate-500',
            live > 0 && 'animate-pulse',
          )}
          title="Distinct visitors seen in roughly the last 5 minutes"
        >
          <Radio className="h-3 w-3 shrink-0" aria-hidden />
          {live.toLocaleString()} live
        </span>
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium tabular-nums text-slate-400">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3 text-slate-300" aria-hidden />
          {pr.sitePageCount != null ? `${pr.sitePageCount} pages` : '— pages'}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1">
          <Clapperboard className="h-3 w-3 text-slate-300" aria-hidden />
          {pr.siteVideoCount != null ? `${pr.siteVideoCount} videos` : '— videos'}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1">
          <Pencil className="h-3 w-3 text-slate-300" aria-hidden />
          {pr.lastSiteUpdateLabel ?? '—'}
        </span>
      </p>
    </>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { toast } = useShell();
  const projects = useProjects();
  const clients = useClients();
  const users = useAppStore(useShallow((s) => s.users));
  const store = useAppStore((s) => s);
  const openModal = useAppStore((s) => s.openModal);
  const hydrateAgencyFromServer = useAppStore((s) => s.hydrateAgencyFromServer);
  const tasks = useTasks();
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [videoZipBusyProjectId, setVideoZipBusyProjectId] = useState<string | null>(null);
  const [siteHandoffZipBusyProjectId, setSiteHandoffZipBusyProjectId] = useState<string | null>(null);
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
  const [analyticsByProject, setAnalyticsByProject] = useState<
    Record<string, { total: number; yesterday: number; today: number }>
  >({});

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
      const next: Record<string, { total: number; yesterday: number; today: number }> = {};
      await Promise.all(
        ids.map(async (id) => {
          const r = await fetchProjectAnalytics(id);
          if (r.ok) {
            next[id] = {
              total: r.data.total_views ?? 0,
              yesterday: r.data.yesterday_views ?? 0,
              today: r.data.today_views ?? 0,
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

  const ensurePagesForProject = useSiteProductionStore((s) => s.ensurePagesForProject);
  const sectionsByBundle = useSiteProductionStore((s) => s.sectionsByBundle);
  const hydrateSiteWorkspace = useProjectSiteWorkspaceStore((s) => s.hydrate);
  const flushWorkspacePreview = useProjectSiteWorkspaceStore((s) => s.flushPreview);
  const drawerWorkspaceRow = useProjectSiteWorkspaceStore((s) =>
    drawerProjectId ? s.byProjectId[drawerProjectId] : undefined,
  );

  useEffect(() => {
    if (!drawerProjectId || !drawerProject || drawerProject.deliveryFocus !== 'client_site') return;
    ensurePagesForProject(drawerProjectId);
    void hydrateSiteWorkspace(drawerProjectId);
  }, [
    drawerProjectId,
    drawerProject?.deliveryFocus,
    drawerProject?.id,
    ensurePagesForProject,
    hydrateSiteWorkspace,
  ]);

  const drawerSectionPreviewHtml = useMemo(() => {
    if (!drawerProjectId || !drawerProject || drawerProject.deliveryFocus !== 'client_site') return '';
    const k = siteProductionBundleKey(drawerProjectId, '/');
    const secs = [...(sectionsByBundle[k] ?? [])].sort((a, b) => a.order - b.order);
    return compileSectionsToPreviewHtml(secs, { pageTitle: 'Home', viewport: 'desktop' });
  }, [drawerProjectId, drawerProject, sectionsByBundle]);

  const drawerSiteIframeSrcDoc = useMemo(() => {
    if (!drawerProject || drawerProject.deliveryFocus !== 'client_site') return '';
    const row = drawerWorkspaceRow;
    const preferBuilt =
      row &&
      row.loadStatus === 'ready' &&
      row.site.files.length > 0 &&
      row.previewHtml.trim().length > 0;
    if (preferBuilt) return applyInlinePreviewYoutubeThumbnailPlaceholders(row.previewHtml);
    return drawerSectionPreviewHtml;
  }, [drawerProject, drawerWorkspaceRow, drawerSectionPreviewHtml]);

  const openDrawerSitePreviewTab = useCallback(async () => {
    if (!drawerProjectId || !drawerProject || drawerProject.deliveryFocus !== 'client_site') return;
    await hydrateSiteWorkspace(drawerProjectId);
    flushWorkspacePreview(drawerProjectId);
    const row = useProjectSiteWorkspaceStore.getState().byProjectId[drawerProjectId];
    if (!row?.site.files.length) {
      toast('No saved site files yet — open the workspace to add HTML.', 'info');
      return;
    }
    const w = openClientSitePreviewTab(row.site);
    if (!w) toast('Allow popups to open the preview tab.', 'error');
  }, [
    drawerProjectId,
    drawerProject,
    hydrateSiteWorkspace,
    flushWorkspacePreview,
    toast,
  ]);

  const triggerVideoArchiveBlobDownload = useCallback((blob: Blob, filename: string) => {
    const u = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = u;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(u);
    }
  }, []);

  const downloadProjectVideoArchiveZip = useCallback(
    async (pid: string) => {
      if (import.meta.env.VITE_USE_REAL_API !== '1' || !siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
        toast('Sign in with the live API to download archived MP4s.', 'error');
        return;
      }
      const pr = projects.find((x) => x.id === pid);
      if (!pr || pr.deliveryFocus !== 'client_site') return;
      if ((pr.siteVideoCount ?? 0) === 0) {
        toast(
          'No catalog videos yet. Open Site builder → Videos on this project; after mirrored MP4s sync, download the ZIP.',
          'info',
        );
        return;
      }
      setVideoZipBusyProjectId(pid);
      try {
        const r = await fetchProjectVideosArchiveZip(pid);
        if (!r.ok) {
          toast(r.error, 'error');
          return;
        }
        triggerVideoArchiveBlobDownload(r.blob, r.filename);
        toast('Download started.', 'success');
      } finally {
        setVideoZipBusyProjectId(null);
      }
    },
    [toast, triggerVideoArchiveBlobDownload, projects],
  );

  const downloadProjectSiteHandoffZip = useCallback(
    async (pid: string) => {
      if (import.meta.env.VITE_USE_REAL_API !== '1' || !siteFilesTargetLiveServer() || !getAccessToken()?.trim()) {
        toast('Sign in with the live API to download the site export.', 'error');
        return;
      }
      setSiteHandoffZipBusyProjectId(pid);
      try {
        const r = await fetchProjectSiteSourceExportZip(pid);
        if (!r.ok) {
          toast(r.error, 'error');
          return;
        }
        triggerVideoArchiveBlobDownload(r.blob, r.filename);
        toast('Download started.', 'success');
      } finally {
        setSiteHandoffZipBusyProjectId(null);
      }
    },
    [toast, triggerVideoArchiveBlobDownload],
  );

  const confirmAndDeleteProject = useCallback(
    async (p: Project, opts?: { closeDrawer?: boolean }) => {
      if (!siteFilesTargetLiveServer()) {
        toast('Project delete requires the live API build (VITE_USE_REAL_API=1).', 'error');
        return;
      }
      if (!getAccessToken()?.trim()) {
        toast('Sign in again to delete projects.', 'error');
        return;
      }
      if (!window.confirm(`Delete "${p.name}"?\n\nThis removes the project and cascades related database records.`)) {
        return;
      }
      const r = await deleteProjectWithLiveConfirm(p.id);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      toast('Project deleted.', 'success');
      if (opts?.closeDrawer) setDrawerProjectId(null);
      await hydrateAgencyFromServer();
    },
    [toast, hydrateAgencyFromServer],
  );

  const projectActionMenuItems = useCallback(
    (p: Project) => [
      { label: 'View details', onClick: () => setDrawerProjectId(p.id) },
      { label: 'Open project page', onClick: () => navigate(`/projects/${p.id}`) },
      ...(p.deliveryFocus === 'client_site'
        ? [{ label: CONVERSION_WORKSPACE_LABEL, onClick: () => navigate(`/projects/${p.id}/site`) }]
        : []),
      ...(p.deliveryFocus === 'client_site'
        ? [
            {
              label:
                siteHandoffZipBusyProjectId === p.id ? 'Zipping site…' : 'Download site folder (client handoff ZIP)',
              onClick: () => void downloadProjectSiteHandoffZip(p.id),
            },
          ]
        : []),
      ...(p.deliveryFocus === 'client_site'
        ? [
            {
              label:
                videoZipBusyProjectId === p.id ? 'Building video ZIP…' : 'Download all videos (MP4 ZIP)',
              onClick: () => void downloadProjectVideoArchiveZip(p.id),
            },
          ]
        : []),
      { label: 'New task', onClick: () => { navigate('/tasks'); } },
      {
        label: 'New invoice',
        onClick: () => {
          openModal('create-invoice');
        },
      },
      {
        label: 'Delete project',
        destructive: true,
        onClick: () => void confirmAndDeleteProject(p),
      },
    ],
    [
      navigate,
      openModal,
      confirmAndDeleteProject,
      downloadProjectVideoArchiveZip,
      downloadProjectSiteHandoffZip,
      videoZipBusyProjectId,
      siteHandoffZipBusyProjectId,
    ],
  );

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
              const budgetPct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
              const deliverPct =
                p.deliveryFocus === 'client_site' && typeof p.deliverableProgressPercent === 'number'
                  ? p.deliverableProgressPercent
                  : budgetPct;
              const isClientLive =
                p.deliveryFocus === 'client_site' &&
                (p.lifecycleStage === 'post_launch' || p.siteStatus === 'live');
              const hl = healthByProjectId[p.id] ?? 'healthy';
              const owner = users[p.ownerId];
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
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Link to={`/clients/${client.id}`} className="text-slate-800 hover:text-indigo-700" onClick={(e) => e.stopPropagation()}>
                      {client.company}
                    </Link>
                    {client.isOwner ? (
                      <Badge variant="neutral" className="border-indigo-300 bg-indigo-50 px-2 py-0 text-[10px] font-bold uppercase text-indigo-950">
                        Owner
                      </Badge>
                    ) : null}
                  </span>
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
                        <div
                          role="group"
                          aria-label={`Downloads for ${p.name}`}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100/90 pt-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
                            disabled={siteHandoffZipBusyProjectId === p.id}
                            title={
                              import.meta.env.VITE_USE_REAL_API !== '1'
                                ? 'Enable VITE_USE_REAL_API'
                                : 'Full site folder ZIP (client handoff readme inside)'
                            }
                            onClick={() => void downloadProjectSiteHandoffZip(p.id)}
                          >
                            {siteHandoffZipBusyProjectId === p.id ? 'Zipping…' : 'Site ZIP'}
                          </button>
                          <span className="text-slate-300" aria-hidden>
                            ·
                          </span>
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-indigo-800 underline-offset-2 hover:underline disabled:opacity-50"
                            disabled={
                              videoZipBusyProjectId === p.id || (p.siteVideoCount ?? 0) === 0
                            }
                            title={
                              (p.siteVideoCount ?? 0) === 0
                                ? 'Add videos in Site builder → Videos first'
                                : 'Mirrored MP4 catalog (requires archive sync)'
                            }
                            onClick={() => void downloadProjectVideoArchiveZip(p.id)}
                          >
                            {videoZipBusyProjectId === p.id ? 'Videos…' : 'Videos ZIP'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Retainer / app</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-[11px] text-slate-600">
                    {p.deliveryFocus === 'client_site'
                      ? (formatSiteTrafficLine({
                          project: p,
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
                    {isClientLive ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="success" className="w-fit text-[10px] font-bold uppercase tracking-wide">
                          Live
                        </Badge>
                        {p.publishedAt ? (
                          <span className="text-[10px] leading-tight text-slate-500">
                            Launched {new Date(p.publishedAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <ProgressBar value={deliverPct} max={100} />
                        <span className="text-[11px] font-semibold text-slate-500">{deliverPct}%</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500">{p.due}</TableCell>
                  <TableCell className="text-slate-600">{owner?.name}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu label={`Actions for ${p.name}`} items={projectActionMenuItems(p)} />
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
            const budgetPct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
            const deliverPct =
              p.deliveryFocus === 'client_site' && typeof p.deliverableProgressPercent === 'number'
                ? p.deliverableProgressPercent
                : budgetPct;
            const isClientLive =
              p.deliveryFocus === 'client_site' &&
              (p.lifecycleStage === 'post_launch' || p.siteStatus === 'live');
            const hl = healthByProjectId[p.id] ?? 'healthy';
            return (
              <Card
                key={p.id}
                className="relative h-full border-slate-200/80 p-4 transition hover:border-indigo-200 hover:shadow-md"
              >
                {p.thumbnailUrl ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-[0.2]">
                    <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <div className="absolute right-2 top-2 z-20 rounded-lg bg-white/90 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
                  <ActionMenu label={`Actions for ${p.name}`} items={projectActionMenuItems(p)} />
                </div>
                <Link to={`/projects/${p.id}`} className="relative block outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <div className="pr-10">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={projectStatusBadgeVariant(p.status)}>{p.status}</Badge>
                      <Badge variant={projectHealthBadgeVariant(hl)} className="text-[10px]">
                        {projectHealthLabel(hl)}
                      </Badge>
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{client?.company}</span>
                    {client?.isOwner ? (
                      <Badge variant="neutral" className="border-indigo-300 bg-indigo-50 px-1.5 py-0 text-[9px] font-bold uppercase text-indigo-950">
                        Owner
                      </Badge>
                    ) : null}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    ${p.spent.toLocaleString()} <span className="font-normal text-slate-400">/</span> ${p.budget.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    {isClientLive ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-[10px] font-bold uppercase">
                          Live
                        </Badge>
                        {p.publishedAt ? (
                          <span className="text-[10px] text-slate-500">
                            {new Date(p.publishedAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <ProgressBar value={deliverPct} max={100} />
                    )}
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">Due {p.due}</p>
                  {p.deliveryFocus === 'client_site' ? (
                    <div className="mt-2 border-t border-slate-100/90 pt-2">
                      {formatSiteTrafficLine({
                        project: p,
                        analyticsByProject,
                        liveByProject,
                      }) ?? (
                        <p className="text-[10px] text-slate-400">
                          {import.meta.env.VITE_USE_REAL_API !== '1' ? 'Site traffic uses real API mode.' : ''}
                        </p>
                      )}
                    </div>
                  ) : null}
                  </div>
                </Link>
                {p.deliveryFocus === 'client_site' ? (
                  <div className="relative z-10 border-t border-slate-200/80 px-4 pb-3 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Exports</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100/90 disabled:opacity-50"
                        disabled={siteHandoffZipBusyProjectId === p.id}
                        onClick={() => void downloadProjectSiteHandoffZip(p.id)}
                      >
                        {siteHandoffZipBusyProjectId === p.id ? 'Zipping…' : 'Site ZIP'}
                      </button>
                      {(p.siteVideoCount ?? 0) > 0 ? (
                        <button
                          type="button"
                          className="rounded-md border border-indigo-200 bg-indigo-50/90 px-2 py-1 text-[10px] font-semibold text-indigo-900 hover:bg-indigo-100/90 disabled:opacity-50"
                          disabled={videoZipBusyProjectId === p.id}
                          onClick={() => void downloadProjectVideoArchiveZip(p.id)}
                        >
                          {videoZipBusyProjectId === p.id ? 'Videos…' : 'Videos ZIP'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
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
              {drawerProject.deliveryFocus === 'client_site' ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-xs border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                    disabled={siteHandoffZipBusyProjectId === drawerProject.id}
                    onClick={() => void downloadProjectSiteHandoffZip(drawerProject.id)}
                  >
                    {siteHandoffZipBusyProjectId === drawerProject.id ? 'Zipping…' : 'Site ZIP'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-xs border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                    disabled={
                      videoZipBusyProjectId === drawerProject.id ||
                      (drawerProject.siteVideoCount ?? 0) === 0
                    }
                    title={
                      (drawerProject.siteVideoCount ?? 0) === 0
                        ? 'Add videos in Site builder → Videos first'
                        : undefined
                    }
                    onClick={() => void downloadProjectVideoArchiveZip(drawerProject.id)}
                  >
                    {videoZipBusyProjectId === drawerProject.id ? 'Videos…' : 'Videos ZIP'}
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                className="h-9 px-3 text-xs"
                onClick={() => drawerProject && void confirmAndDeleteProject(drawerProject, { closeDrawer: true })}
              >
                Delete project
              </Button>
            </div>
          ) : null
        }
      >
        {drawerProject && drawerClient ? (
          <div className="space-y-6">
            {drawerProject.deliveryFocus === 'client_site' && drawerSiteIframeSrcDoc ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Site preview</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] font-semibold text-slate-700"
                      onClick={() =>
                        drawerProjectId && drawerProject?.deliveryFocus === 'client_site' && void hydrateSiteWorkspace(drawerProjectId)
                      }
                    >
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 px-2 text-[11px] font-semibold"
                      onClick={() => void openDrawerSitePreviewTab()}
                    >
                      New tab
                    </Button>
                    <Link
                      to={`/projects/${drawerProject.id}/site`}
                      className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-violet-800 hover:bg-slate-50"
                    >
                      Workspace
                    </Link>
                  </div>
                </div>
                <iframe
                  key={`${drawerProjectId}-${drawerWorkspaceRow?.previewNonce ?? 0}`}
                  title={`Preview of ${drawerProject.name}`}
                  srcDoc={drawerSiteIframeSrcDoc}
                  className="h-[280px] w-full bg-white"
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                />
                <p className="border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px] leading-relaxed text-slate-500">
                  {drawerWorkspaceRow?.loadStatus === 'ready' && drawerWorkspaceRow.site.files.length > 0
                    ? 'Rendered from saved site files — same compose as Site builder.'
                    : 'Shows the conversions section preview until workspace files finish loading.'}
                </p>
              </div>
            ) : null}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3 text-xs font-semibold"
                    disabled={siteHandoffZipBusyProjectId === drawerProject.id}
                    onClick={() => void downloadProjectSiteHandoffZip(drawerProject.id)}
                  >
                    {siteHandoffZipBusyProjectId === drawerProject.id
                      ? 'Zipping site…'
                      : 'Site folder (ZIP handoff)'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3 text-xs font-semibold"
                    disabled={
                      videoZipBusyProjectId === drawerProject.id ||
                      (drawerProject.siteVideoCount ?? 0) === 0
                    }
                    title={
                      (drawerProject.siteVideoCount ?? 0) === 0
                        ? 'Add videos in Site builder → Videos first'
                        : undefined
                    }
                    onClick={() => void downloadProjectVideoArchiveZip(drawerProject.id)}
                  >
                    {videoZipBusyProjectId === drawerProject.id ? 'Building ZIP…' : 'Videos (MP4 ZIP)'}
                  </Button>
                </div>
                {formatSiteTrafficLine({
                  project: drawerProject,
                  analyticsByProject,
                  liveByProject,
                })}
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
