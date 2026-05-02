import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { DetailPageLayout } from '@/components/layout/templates/detail-page-layout';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHeadCell, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  contractStatusBadgeVariant,
  invoiceStatusBadgeVariant,
  projectHealthBadgeVariant,
  projectStatusBadgeVariant,
  taskStatusBadgeVariant,
} from '@/lib/statuses';
import { hoursSinceLastProjectThreadActivity, projectHealthLabel, projectHealthLevel } from '@/lib/system-intelligence';
import { daysSinceIso } from '@/lib/days-since';
import { LIFECYCLE_LABELS, LIFECYCLE_ORDER, clientDeliveryStatusLabel } from '@/lib/project-lifecycle';
import { OFFER_PHASE_CLIENT, OFFER_PHASE_ORDER, lifecycleStageToOfferPhase } from '@/lib/service-offer';
import {
  AFTER_LIVE_LINE,
  POST_LAUNCH_CLIENT_LINE,
  focusFallbackForPhase,
  narrativeThisPhase,
  narrativeWhatsNext,
  offerStepNumber,
  primaryFocusFromTasks,
} from '@/lib/project-service-narrative';
import { pageStatusDisplay } from '@/lib/site-production/page-status-labels';
import { compileSectionsToPreviewHtml } from '@/lib/site-production/compile-preview-html';
import { formatCurrency } from '@/lib/format-display';
import { liveBuildNextLines } from '@/lib/live-build-status';
import { buildProjectLiveActivityFeed } from '@/lib/project-live-feed';
import { openClientSitePreviewTab } from '@/lib/site-builder/open-client-site-preview';
import { siteProductionBundleKey, useSiteProductionStore } from '@/store/useSiteProductionStore';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';
import type { Project, ProjectLifecycleStage } from '@/lib/types/entities';
import { useShell } from '@/context/shell-context';
import { useProject, useProjectActivities } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';
import { cn } from '@/lib/utils';
import { normalizeCustomDomainInput, patchAdminProject, railwayHostnameFromUrl, fetchAdminProject } from '@/lib/admin-project-hosting';
import type { ApiProjectRow } from '@/lib/agency-api-map';
import { fetchProjectFormSubmissions, patchFormSubmissionReadFlag, type FormSubmissionRow } from '@/lib/project-form-submissions-api';
import { siteBuilderListFiles } from '@/lib/site-builder/site-builder-site-api';
import {
  CONVERSION_WORKSPACE_LABEL,
  DELIVERY_ADVANTAGE,
  OFFER_PACKAGES,
  OFFER_STATEMENT,
  PROCESS_STEPS,
  RISK_REVERSAL,
} from '@/lib/offer-positioning';

const ACTIVE_SITE_STAGES: ProjectLifecycleStage[] = ['discovery', 'proposal_contract', 'build', 'review'];

function lifecycleStageIndex(project: Project): number {
  const i = LIFECYCLE_ORDER.indexOf(project.lifecycleStage);
  return i < 0 ? 0 : i;
}

function milestoneRowsForProject(project: Project) {
  if (project.deliveryFocus === 'client_site') {
    const cur = lifecycleStageIndex(project);
    return [
      { id: 'diagnose', label: 'Diagnose — where visitors drop', done: cur > 2 },
      { id: 'rebuild', label: 'Rebuild — conversion path on the page', done: cur > 3 },
      { id: 'launch', label: 'Launch — go live without breaking the path', done: cur > 5 },
      { id: 'optimize', label: 'Optimize — tighten from real traffic', done: cur >= 6 },
    ];
  }
  return [
    { id: '1', label: 'Align outcomes & scope', done: true },
    {
      id: '2',
      label: 'Lock plan & revenue signals',
      done: project.status !== 'Planning' && project.status !== 'Design',
    },
    {
      id: '3',
      label: 'Ship work clients can book or buy from',
      done: project.status === 'Live' || project.status === 'Review',
    },
    { id: '4', label: 'Launch, hand off, close the loop', done: project.status === 'Live' },
  ];
}

const PROJECT_MAIN_TABS = new Set(['timeline', 'tasks', 'files', 'messages', 'contracts', 'budget', 'activity']);

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useShell();
  const project = useProject(projectId);
  const projectActivities = useProjectActivities(projectId);
  const completeTask = useAppStore((s) => s.completeTask);
  const advanceProjectPhase = useAppStore((s) => s.advanceProjectPhase);
  const advanceProjectLifecycle = useAppStore((s) => s.advanceProjectLifecycle);
  const toggleTaskChecklistItem = useAppStore((s) => s.toggleTaskChecklistItem);
  const setProjectWaitingOn = useAppStore((s) => s.setProjectWaitingOn);
  const requestClientFeedback = useAppStore((s) => s.requestClientFeedback);
  const sendInvoice = useAppStore((s) => s.sendInvoice);
  const users = useAppStore(useShallow((s) => s.users));
  const store = useAppStore((s) => s);
  const mergeProjectRowFromServer = useAppStore((s) => s.mergeProjectRowFromServer);

  const [hostDomainDraft, setHostDomainDraft] = useState('');
  const [hostSvcDraft, setHostSvcDraft] = useState('');
  const [ga4WorkspaceDraft, setGa4WorkspaceDraft] = useState('');
  const [hostingSaveBusy, setHostingSaveBusy] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRow[]>([]);
  const [formSubmissionsLoading, setFormSubmissionsLoading] = useState(false);
  const [siteHtmlPages, setSiteHtmlPages] = useState<Array<{ path: string; updated_at?: string }>>([]);
  const [sitePagesLoading, setSitePagesLoading] = useState(false);
  /** Paths explicitly marked draft in site_settings.page_publish; default is published. */
  const [pagePublishByPath, setPagePublishByPath] = useState<Record<string, 'draft' | 'published'>>({});

  const client = useAppStore(useShallow((s) => (project ? s.clients[project.clientId] : undefined)));
  const owner = project ? users[project.ownerId] : undefined;

  const projectTasks = useAppStore(
    useShallow((s) => (projectId ? sel.getTasksForProject(s, projectId) : []))
  );
  const projectFiles = useAppStore(
    useShallow((s) => (projectId ? sel.getFilesForProject(s, projectId) : []))
  );
  const projectInvoices = useAppStore(
    useShallow((s) => (projectId ? sel.getInvoicesForProject(s, projectId) : []))
  );
  const projectMessages = useAppStore(
    useShallow((s) => (projectId ? sel.getThreadsForProject(s, projectId) : []))
  );
  const projectContracts = useAppStore(
    useShallow((s) => (projectId ? sel.getContractsForProject(s, projectId) : []))
  );

  const ensurePagesForProject = useSiteProductionStore((s) => s.ensurePagesForProject);
  const sectionsByBundle = useSiteProductionStore((s) => s.sectionsByBundle);
  const hydrateWorkspaceSite = useProjectSiteWorkspaceStore((s) => s.hydrate);
  const flushWorkspacePreview = useProjectSiteWorkspaceStore((s) => s.flushPreview);

  const openWorkspacePreviewInNewTab = useCallback(async () => {
    if (!project?.id) return;
    await hydrateWorkspaceSite(project.id);
    const row = useProjectSiteWorkspaceStore.getState().byProjectId[project.id];
    if (!row?.site?.files?.length) {
      toast('Add site files in the builder first—we opened the workspace for you.', 'info');
      navigate(`/projects/${project.id}/site`);
      return;
    }
    flushWorkspacePreview(project.id);
    const site = useProjectSiteWorkspaceStore.getState().byProjectId[project.id]!.site;
    const w = openClientSitePreviewTab(site);
    if (!w) toast('Allow popups to open the preview tab.', 'error');
  }, [project?.id, hydrateWorkspaceSite, flushWorkspacePreview, navigate, toast]);

  useEffect(() => {
    if (!projectId || !project || project.deliveryFocus !== 'client_site') return;
    ensurePagesForProject(projectId);
  }, [projectId, project, ensurePagesForProject]);

  useEffect(() => {
    if (!project) return;
    setHostDomainDraft(project.customDomainHost ?? '');
    setHostSvcDraft(project.railwayServiceIdProduction ?? '');
  }, [project?.id, project?.customDomainHost, project?.railwayServiceIdProduction]);

  useEffect(() => {
    if (!projectId || !project || project.deliveryFocus !== 'client_site') return;
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    let cancelled = false;
    void (async () => {
      const r = await fetchAdminProject(projectId);
      if (cancelled || !r.ok || !r.data?.project) return;
      const p = r.data.project as Record<string, unknown>;
      const ss = p.site_settings ?? p.siteSettings;
      if (ss && typeof ss === 'object' && !Array.isArray(ss)) {
        const o = ss as Record<string, unknown>;
        const gid = o.ga4_measurement_id ?? o.ga4MeasurementId;
        setGa4WorkspaceDraft(typeof gid === 'string' ? gid.trim() : '');
      } else setGa4WorkspaceDraft('');
      const rawDom = p.custom_domain ?? p.customDomain;
      if (typeof rawDom === 'string' && rawDom.trim()) {
        setHostDomainDraft(normalizeCustomDomainInput(rawDom));
      }
      const svc = p.railway_service_id_production ?? p.railwayServiceIdProduction;
      if (typeof svc === 'string') setHostSvcDraft(svc);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, project?.deliveryFocus]);

  useEffect(() => {
    if (!projectId || !project || project.deliveryFocus !== 'client_site') return;
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    let cancelled = false;
    setFormSubmissionsLoading(true);
    void (async () => {
      const r = await fetchProjectFormSubmissions(projectId);
      if (cancelled) return;
      setFormSubmissionsLoading(false);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setFormSubmissions(r.data.submissions ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, project?.deliveryFocus, toast]);

  useEffect(() => {
    if (!projectId || !project || project.deliveryFocus !== 'client_site') return;
    if (import.meta.env.VITE_USE_REAL_API !== '1') return;
    let cancelled = false;
    setSitePagesLoading(true);
    void (async () => {
      const [list, pr] = await Promise.all([siteBuilderListFiles(projectId), fetchAdminProject(projectId)]);
      if (cancelled) return;
      setSitePagesLoading(false);
      const rows = list.ok && Array.isArray(list.data.files) ? list.data.files : [];
      const html = rows.filter(
        (row: { path?: string }) => typeof row?.path === 'string' && row.path.toLowerCase().endsWith('.html')
      ) as Array<{ path: string; updated_at?: string }>;
      setSiteHtmlPages([...html].sort((a, b) => a.path.localeCompare(b.path)));
      const settingsRaw =
        pr.ok && pr.data?.project ? ((pr.data.project as Record<string, unknown>).site_settings ?? null) : null;
      const settings =
        settingsRaw && typeof settingsRaw === 'object' && !Array.isArray(settingsRaw) ? settingsRaw : null;
      const pp = settings ? (settings as Record<string, unknown>).page_publish : null;
      if (pp && typeof pp === 'object' && !Array.isArray(pp)) {
        const next: Record<string, 'draft' | 'published'> = {};
        for (const [k, v] of Object.entries(pp)) {
          if (v === 'draft' || v === 'published') next[k] = v;
        }
        setPagePublishByPath(next);
      } else {
        setPagePublishByPath({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, project?.deliveryFocus, project?.updatedAt]);

  const reloadFormSubmissions = useCallback(async () => {
    if (!projectId) return;
    setFormSubmissionsLoading(true);
    try {
      const r = await fetchProjectFormSubmissions(projectId);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setFormSubmissions(r.data.submissions ?? []);
    } finally {
      setFormSubmissionsLoading(false);
    }
  }, [projectId, toast]);

  const markFormRead = useCallback(
    async (submissionId: string, readFlag: boolean) => {
      if (!projectId) return;
      const r = await patchFormSubmissionReadFlag(projectId, submissionId, readFlag);
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setFormSubmissions((prev) =>
        prev.map((row) => (row.id === submissionId ? { ...row, read_flag: readFlag } : row))
      );
    },
    [projectId, toast]
  );

  const setHtmlPagePublishState = useCallback(
    async (filePath: string, state: 'draft' | 'published') => {
      if (!projectId || import.meta.env.VITE_USE_REAL_API !== '1') return;
      const nextPublish = { ...pagePublishByPath, [filePath]: state };
      const r = await patchAdminProject(projectId, {
        site_settings: { page_publish: nextPublish },
      });
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      setPagePublishByPath(nextPublish);
      toast(state === 'published' ? 'Page marked published.' : 'Page marked draft.', 'success');
    },
    [projectId, pagePublishByPath, toast]
  );

  const saveProjectHosting = useCallback(async () => {
    if (!projectId) return;
    if (import.meta.env.VITE_USE_REAL_API !== '1') {
      toast('Turn on VITE_USE_REAL_API to save hosting fields to the database.', 'error');
      return;
    }
    setHostingSaveBusy(true);
    try {
      const r = await patchAdminProject(projectId, {
        custom_domain: normalizeCustomDomainInput(hostDomainDraft) || null,
        railway_service_id_production: hostSvcDraft.trim() || null,
        site_settings: { ga4_measurement_id: ga4WorkspaceDraft.trim() || null },
      });
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      const row = r.data?.project;
      if (row && typeof row === 'object') mergeProjectRowFromServer(row as ApiProjectRow);
      toast('Hosting and analytics saved.', 'success');
    } finally {
      setHostingSaveBusy(false);
    }
  }, [projectId, hostDomainDraft, hostSvcDraft, ga4WorkspaceDraft, mergeProjectRowFromServer, toast]);

  const dnsCnameTarget = useMemo(
    () => railwayHostnameFromUrl(project?.railwayProductionUrl ?? null),
    [project?.railwayProductionUrl]
  );

  const nextAction = useMemo(() => {
    if (!projectId || !project) return null;
    const blocked = projectTasks.find((t) => t.status === 'Blocked');
    if (blocked) {
      return {
        title: 'Project blocked',
        body: `${blocked.title} needs client input.`,
        href: `/projects/${projectId}?tab=tasks`,
        tone: 'danger' as const,
      };
    }
    const threadQuietH = hoursSinceLastProjectThreadActivity(store, projectId);
    if (threadQuietH != null && threadQuietH >= 72) {
      return {
        title: 'Inbox has gone quiet',
        body: `About ${Math.round(threadQuietH / 24)} days without message motion — the client may be waiting on a nudge from you.`,
        href: '/messages',
        tone: 'warning' as const,
      };
    }
    const pendingSig = projectContracts.find((c) => c.status === 'Sent' || c.status === 'Viewed');
    if (pendingSig) {
      return {
        title: 'Contract awaiting signature',
        body: pendingSig.title,
        href: '/contracts',
        tone: 'warning' as const,
      };
    }
    const overdueInv = projectInvoices.find((i) => i.status === 'Overdue');
    if (overdueInv) {
      return {
        title: 'Invoice overdue',
        body: `${overdueInv.number} — follow up with ${client?.name ?? 'client'}.`,
        href: `/invoices/${overdueInv.id}`,
        tone: 'danger' as const,
      };
    }
    const milestones = milestoneRowsForProject(project);
    const nextMilestone = milestones.find((m) => !m.done);
    if (nextMilestone) {
      return {
        title: 'Milestone due soon',
        body: `Complete “${nextMilestone.label}” and update the client.`,
        href: `/projects/${projectId}?tab=timeline`,
        tone: 'info' as const,
      };
    }
    return {
      title: 'Needs approval',
      body: 'Move the project to the next phase when stakeholders sign off.',
      href: `/projects/${projectId}?tab=timeline`,
      tone: 'neutral' as const,
      primaryAction: 'advance_lifecycle' as const,
    };
  }, [projectId, project, projectTasks, projectContracts, projectInvoices, client?.name, store]);

  const homePreviewHtml = useMemo(() => {
    if (!projectId || !project || project.deliveryFocus !== 'client_site') return '';
    const k = siteProductionBundleKey(project.id, '/');
    const secs = [...(sectionsByBundle[k] ?? [])].sort((a, b) => a.order - b.order);
    return compileSectionsToPreviewHtml(secs, { pageTitle: 'Home', viewport: 'desktop' });
  }, [projectId, project, sectionsByBundle]);

  const primaryFocusLine = useMemo(() => {
    if (!project) return null;
    return primaryFocusFromTasks(projectTasks) ?? focusFallbackForPhase(lifecycleStageToOfferPhase(project.lifecycleStage));
  }, [project, projectTasks]);

  const liveFeed = useMemo(() => {
    if (!project) return { today: [] as string[], yesterday: [] as string[] };
    return buildProjectLiveActivityFeed(projectActivities, project.siteImprovements ?? null);
  }, [project, projectActivities]);

  if (!project) {
    return (
      <div className="rounded-3xl bg-white px-8 py-14 text-center shadow-sm ring-1 ring-slate-900/[0.06]">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Project not found</h1>
        <Link to="/projects" className={buttonClassName('primary', 'mt-6 inline-flex')}>
          Back to projects
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((project.spent / project.budget) * 100));

  const milestones = milestoneRowsForProject(project);

  const activityRows = projectActivities.slice(0, 12);
  const startLabel = new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const budgetRemaining = Math.max(0, project.budget - project.spent);
  const blockedCount = projectTasks.filter((t) => t.status === 'Blocked').length;
  const unreadProjectThreads = projectMessages.filter((m) => m.status === 'Unread').length;
  const atRisk = pct >= 88 || blockedCount > 0 || unreadProjectThreads > 0;
  const threadQuietH = hoursSinceLastProjectThreadActivity(store, project.id);
  const ph = projectHealthLevel(store, project.id);
  const tabParam = searchParams.get('tab');
  const tabsActiveId =
    tabParam && PROJECT_MAIN_TABS.has(tabParam) ? tabParam : 'timeline';

  const stalledSite =
    project.deliveryFocus === 'client_site' &&
    project.waitingOn !== 'client' &&
    ACTIVE_SITE_STAGES.includes(project.lifecycleStage) &&
    daysSinceIso(project.updatedAt) >= 6;
  const invoiceToRemind = projectInvoices.find((i) => i.status === 'Overdue' || i.status === 'Sent' || i.status === 'Draft');
  const clientFacingStatus = clientDeliveryStatusLabel(project.lifecycleStage);
  const offerPhase = lifecycleStageToOfferPhase(project.lifecycleStage);
  const phaseTitle = OFFER_PHASE_CLIENT[offerPhase].title;
  const focusHeadline = primaryFocusLine ?? focusFallbackForPhase(offerPhase);
  const nextLines = liveBuildNextLines(offerPhase, clientFacingStatus);

  return (
    <DetailPageLayout
      backHref="/projects"
      backLabel="Projects"
      title={project.name}
      meta={
        project.deliveryFocus === 'client_site' ? (
          <span>
            Website for <span className="font-semibold text-slate-900">{client?.company ?? 'Client'}</span> ·{' '}
            {clientFacingStatus} · Last studio touch {project.lastSiteUpdateLabel ?? '—'}
          </span>
        ) : (
          <span>
            Timeline {startLabel} → due {project.due} · {LIFECYCLE_LABELS[project.lifecycleStage]} · {client?.company} · Owner{' '}
            {owner?.name}
            {project.deliveryFocus === 'product_other' && <> · Retainer / product work</>}
          </span>
        )
      }
      badge={
        <span className="flex flex-wrap items-center gap-2">
          {project.deliveryFocus === 'client_site' ? (
            <Badge
              variant={
                clientFacingStatus === 'Live' ? 'success' : clientFacingStatus === 'Ready for review' ? 'info' : 'neutral'
              }
              className="text-xs font-bold"
            >
              {clientFacingStatus}
            </Badge>
          ) : (
            <>
              <Badge variant={projectStatusBadgeVariant(project.status)}>{project.status}</Badge>
              <Badge variant={projectHealthBadgeVariant(ph)}>{projectHealthLabel(ph)}</Badge>
            </>
          )}
          {project.waitingOn === 'client' && <Badge variant="warning">Waiting on client</Badge>}
          {project.waitingOn === 'agency' && (
            <Badge variant="neutral" className="border-amber-200 bg-amber-50 text-amber-950">
              On us
            </Badge>
          )}
        </span>
      }
      actions={
        <>
          <Button type="button" onClick={() => projectId && advanceProjectLifecycle(projectId)}>
            {project.deliveryFocus === 'client_site' ? 'Record next phase' : 'Advance lifecycle'}
          </Button>
          {project.deliveryFocus !== 'client_site' && (
            <Button type="button" variant="secondary" onClick={() => projectId && advanceProjectPhase(projectId)}>
              Advance legacy phase
            </Button>
          )}
          {project.deliveryFocus === 'client_site' && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => projectId && navigate(`/projects/${projectId}/site`)}
            >
              {CONVERSION_WORKSPACE_LABEL}
            </Button>
          )}
          {project.deliveryFocus === 'client_site' && (
            <Button type="button" variant="secondary" onClick={() => requestClientFeedback(project.id)}>
              Request client feedback
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast(
                'Update logged — your client sees this alongside their preview and status.',
                'success'
              )
            }
          >
            Log client update
          </Button>
          {invoiceToRemind && (
            <Button type="button" variant="secondary" onClick={() => sendInvoice(invoiceToRemind.id)}>
              Remind {invoiceToRemind.number}
            </Button>
          )}
          <Link to="/time-tracking" className={buttonClassName('primary', 'gap-2')}>
            Log time
          </Link>
        </>
      }
      sidebar={
        <>
          <Card variant="compact" className="bg-gradient-to-b from-violet-50/80 to-indigo-50/20 ring-violet-200/30">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900/90">Needs you</p>
            {nextAction ? (
              <>
                <p className="mt-2 text-sm font-bold text-slate-900">{nextAction.title}</p>
                <p className="mt-1 text-xs text-slate-600">{nextAction.body}</p>
                {'primaryAction' in nextAction && nextAction.primaryAction === 'advance_lifecycle' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 h-auto p-0 text-xs font-semibold text-violet-700 hover:bg-transparent hover:text-violet-900"
                    onClick={() => projectId && advanceProjectLifecycle(projectId)}
                  >
                    Take action →
                  </Button>
                ) : (
                  <Link
                    to={nextAction.href}
                    className="mt-3 inline-block text-xs font-semibold text-violet-700 transition-colors hover:text-violet-900"
                  >
                    {nextAction.tone === 'danger' ? 'Resolve now →' : 'Take action →'}
                  </Link>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Nothing urgent on this project right now.</p>
            )}
          </Card>
          {project.deliveryFocus !== 'client_site' && (
            <>
              <Card
                variant="compact"
                className={
                  ph === 'blocked'
                    ? 'bg-rose-50/70 ring-rose-200/50'
                    : ph === 'at_risk' || atRisk
                      ? 'bg-amber-50/50 ring-amber-200/40'
                      : ''
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Delivery health</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li className="flex justify-between gap-2">
                    <span>Budget burn</span>
                    <span className="font-semibold tabular-nums">{pct}%</span>
                  </li>
                  {threadQuietH != null && (
                    <li className="text-slate-600">
                      Last thread:{' '}
                      <span className="font-semibold text-slate-800">
                        {threadQuietH < 24 ? `${threadQuietH}h ago` : `${Math.round(threadQuietH / 24)} days ago`}
                      </span>
                    </li>
                  )}
                  {blockedCount > 0 && (
                    <li className="font-medium text-rose-700">{blockedCount} blocked task{blockedCount === 1 ? '' : 's'}</li>
                  )}
                </ul>
              </Card>
              <Card variant="compact">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Recent updates</p>
                <ul className="mt-2 space-y-2">
                  {projectActivities.slice(0, 4).map((a) => (
                    <li key={a.id} className="text-xs text-slate-700">
                      <span className="font-medium text-slate-800">{a.title}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{a.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
          {project.deliveryFocus === 'client_site' && project.clientPortalVisible === false && (
            <p className="rounded-xl bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950 ring-1 ring-amber-200/50">
              Clients don&apos;t see this project in the portal yet.
            </p>
          )}
        </>
      }
    >
      {project.deliveryFocus === 'client_site' && (
        <>
          <section className="mb-8 rounded-3xl bg-gradient-to-b from-white via-violet-50/[0.35] to-slate-50/30 px-6 py-8 shadow-[var(--app-shadow-card)] ring-1 ring-slate-900/[0.06] sm:px-8 sm:py-9">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700/90">Current focus</p>
            <p className="mt-3 text-[13px] font-medium text-slate-500">Right now we&apos;re working on</p>
            <p className="mt-1 text-2xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-3xl">{focusHeadline}</p>
            {stalledSite && (
              <p className="mt-4 rounded-xl bg-rose-50/90 px-4 py-3 text-sm font-medium leading-relaxed text-rose-950 ring-1 ring-rose-200/50">
                No studio touches in {daysSinceIso(project.updatedAt)}+ days — you&apos;re not marked waiting on the client.
              </p>
            )}
            <p className="mt-8 text-[11px] font-bold uppercase tracking-wide text-slate-400">Next</p>
            <p className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight text-slate-800">{nextLines.join(' → ')}</p>
          </section>

          <section className="mb-8 rounded-3xl bg-white px-6 py-7 shadow-[var(--app-shadow-card)] ring-1 ring-slate-900/[0.06] sm:px-8">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700/90">Offer & process</p>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-800">{OFFER_STATEMENT}</p>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-600">{DELIVERY_ADVANTAGE}</p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS_STEPS.map((step, i) => (
                <li key={step.id} className="rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-900/[0.04]">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {i + 1}. {step.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs leading-relaxed text-slate-600">{RISK_REVERSAL}</p>
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Engagement bands</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {OFFER_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="rounded-2xl bg-gradient-to-b from-slate-50/90 to-white px-4 py-4 ring-1 ring-slate-200/60">
                    <p className="text-sm font-bold text-slate-900">
                      {pkg.name}{' '}
                      <span className="font-semibold text-violet-700">{pkg.priceBand}</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{pkg.forWho}</p>
                    <p className="mt-2 text-[11px] font-medium leading-snug text-slate-700">{pkg.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-10 rounded-3xl bg-slate-50/40 px-6 py-7 ring-1 ring-slate-900/[0.04] sm:px-8">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Live activity</h3>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500">What shipped or changed on this site.</p>
            <div className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-12">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Today</p>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-slate-800">
                  {liveFeed.today.map((l) => (
                    <li key={l} className="flex gap-2.5">
                      <span className="shrink-0 font-medium text-emerald-600">→</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Yesterday</p>
                <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-slate-600">
                  {liveFeed.yesterday.map((l) => (
                    <li key={l} className="flex gap-2.5">
                      <span className="shrink-0 text-slate-400">→</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}

      {project.deliveryFocus === 'client_site' && (
        <div className="mb-10 overflow-hidden rounded-3xl bg-white shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.06]">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="space-y-6 p-6 sm:p-8 lg:bg-slate-50/35">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Live conversion rebuild</p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Phase <span className="font-semibold text-slate-900">{phaseTitle}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  Step {offerStepNumber(offerPhase)} of 4
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Status{' '}
                  <span className="font-semibold text-slate-900">{clientFacingStatus}</span>
                  {project.waitingOn === 'client' ? (
                    <span className="text-amber-800"> · Waiting on client</span>
                  ) : project.waitingOn === 'agency' ? (
                    <span className="text-violet-800"> · On us to ship</span>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-1.5">
                {OFFER_PHASE_ORDER.map((ph) => {
                  const curIdx = OFFER_PHASE_ORDER.indexOf(offerPhase);
                  const idx = OFFER_PHASE_ORDER.indexOf(ph);
                  const done = idx < curIdx;
                  const active = ph === offerPhase;
                  return (
                    <div
                      key={ph}
                      title={OFFER_PHASE_CLIENT[ph].title}
                      className={cn(
                        'h-2 flex-1 rounded-full transition-colors',
                        done && 'bg-emerald-500',
                        active && 'bg-violet-600 ring-2 ring-violet-300/70',
                        !done && !active && 'bg-slate-200'
                      )}
                    />
                  );
                })}
              </div>
              <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800/90">Production domain & DNS</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Stored on the project via <code className="text-slate-800">PATCH /api/admin/projects/:id</code>. Production deploy requires a saved domain.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Traffic</span>: When a visitor opens your saved hostname, this app matches{' '}
                  <code className="rounded bg-white px-1 text-slate-800">Host</code> to <code className="rounded bg-white px-1 text-slate-800">custom_domain</code> and serves HTML/CSS/JS from{' '}
                  <code className="rounded bg-white px-1 text-slate-800">site_files</code> (not the agency admin). At your DNS provider, point the apex with an{' '}
                  <strong>A record</strong> to the IP from <strong>Railway → Networking</strong>, or use a <strong>CNAME</strong> for <code className="text-slate-800">www</code> to your Railway hostname.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-500" htmlFor="pd-host-domain">
                      Custom domain
                    </label>
                    <Input
                      id="pd-host-domain"
                      value={hostDomainDraft}
                      onChange={(e) => setHostDomainDraft(e.target.value)}
                      placeholder="www.client.com"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-500" htmlFor="pd-railway-svc">
                      Railway service ID
                    </label>
                    <Input
                      id="pd-railway-svc"
                      value={hostSvcDraft}
                      onChange={(e) => setHostSvcDraft(e.target.value)}
                      placeholder="Optional — for API domain attach"
                      className="mt-1 h-9 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] font-semibold uppercase text-slate-500" htmlFor="pd-ga4-measure">
                    GA4 measurement ID (optional)
                  </label>
                  <Input
                    id="pd-ga4-measure"
                    value={ga4WorkspaceDraft}
                    onChange={(e) => setGa4WorkspaceDraft(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="mt-1 h-9 font-mono text-xs"
                    spellCheck={false}
                    disabled={import.meta.env.VITE_USE_REAL_API !== '1'}
                  />
                  {import.meta.env.VITE_USE_REAL_API !== '1' ? (
                    <p className="mt-1 text-[11px] text-slate-500">Enable real API mode to persist GA ID on this project.</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">Merged into project <code className="text-slate-700">site_settings</code> on save.</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-9 px-3 text-xs"
                    disabled={hostingSaveBusy || import.meta.env.VITE_USE_REAL_API !== '1'}
                    onClick={() => void saveProjectHosting()}
                  >
                    {hostingSaveBusy ? 'Saving…' : 'Save domain, Railway & GA'}
                  </Button>
                  <Link to={`/projects/${project.id}/site`} className={buttonClassName('secondary', 'h-9 px-3 text-xs')}>
                    Open site builder
                  </Link>
                </div>
                {dnsCnameTarget ? (
                  <p className="mt-3 text-xs text-slate-600">
                    Point a <strong>CNAME</strong> (or ALIAS for apex) at{' '}
                    <code className="rounded bg-white px-1 py-0.5 text-slate-800">{dnsCnameTarget}</code>
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    CNAME target appears once <code className="text-slate-700">railway_url_production</code> is set (e.g. after deploy with Railway credentials).
                  </p>
                )}
                {import.meta.env.VITE_USE_REAL_API === '1' ? (
                  <div className="mt-5 border-t border-violet-200/50 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800/90">Contact form inbox</p>
                      <Button type="button" variant="ghost" className="h-auto p-0 text-xs font-semibold text-violet-700" onClick={() => void reloadFormSubmissions()}>
                        Refresh
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Submissions from site HTML forms posting to /api/forms/… </p>
                    {formSubmissionsLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Loading…</p>
                    ) : formSubmissions.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">No submissions yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {formSubmissions.map((sub) => (
                          <li
                            key={sub.id}
                            className={cn(
                              'rounded-lg border bg-white px-3 py-2.5 text-xs ring-slate-900/[0.04]',
                              sub.read_flag ? 'border-slate-200/80' : 'border-violet-200/70 ring-2 ring-violet-100/50'
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </span>
                              {!sub.read_flag ? <Badge variant="info">New</Badge> : <Badge variant="neutral">Read</Badge>}
                            </div>
                            <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                              {(() => {
                                try {
                                  return JSON.stringify(sub.fields ?? {}, null, 2);
                                } catch {
                                  return String(sub.fields);
                                }
                              })()}
                            </pre>
                            <Button
                              type="button"
                              variant="ghost"
                              className="mt-2 h-auto p-0 text-xs font-semibold text-violet-700"
                              onClick={() => void markFormRead(sub.id, !sub.read_flag)}
                            >
                              Mark {sub.read_flag ? 'unread' : 'read'}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pages in this site</p>
                <p className="mt-1 text-[11px] text-slate-500">From live <code className="text-slate-700">site_files</code>. New pages default to published; mark draft to hide from “complete” in this list only (URLs still work until you remove the file).</p>
                <div className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-slate-900/[0.06]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">File</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/90 bg-white">
                      {sitePagesLoading ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                            Loading pages…
                          </td>
                        </tr>
                      ) : siteHtmlPages.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                            No HTML files on the server yet — open Site builder and save <code className="text-slate-700">index.html</code> or add pages.
                          </td>
                        </tr>
                      ) : (
                        siteHtmlPages.map((row) => {
                          const state = pagePublishByPath[row.path] === 'draft' ? 'draft' : 'published';
                          return (
                            <tr key={row.path} className="transition-colors duration-150 hover:bg-slate-50/60">
                              <td className="px-3 py-2 font-mono text-xs font-medium text-slate-900">{row.path}</td>
                              <td className="px-3 py-2 text-slate-700">{pageStatusDisplay(state === 'draft' ? 'draft' : 'published')}</td>
                              <td className="px-3 py-2 text-right">
                                {state === 'draft' ? (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="h-8 text-xs"
                                    onClick={() => void setHtmlPagePublishState(row.path, 'published')}
                                  >
                                    Mark published
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-8 text-xs text-slate-600"
                                    onClick={() => void setHtmlPagePublishState(row.path, 'draft')}
                                  >
                                    Mark draft
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-200/60 pt-5">
                <Button type="button" onClick={() => navigate(`/projects/${project.id}/site`)}>
                  {CONVERSION_WORKSPACE_LABEL}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => navigate(`/projects/${project.id}/site?fullscreen=1`)}
                >
                  Full-screen preview
                </Button>
                <Button type="button" variant="secondary" className="text-xs" onClick={() => void openWorkspacePreviewInNewTab()}>
                  Preview in new tab
                </Button>
                <Link
                  to={`/rbyan?project=${encodeURIComponent(project.id)}`}
                  className={buttonClassName('secondary', 'text-xs')}
                >
                  Build with AI
                </Link>
                {project.siteLiveUrl ? (
                  <a
                    href={project.siteLiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName('secondary', 'gap-2')}
                  >
                    Open live / staging
                  </a>
                ) : null}
                <Link to="/messages" className={buttonClassName('secondary', 'text-xs')}>
                  Messages
                </Link>
                <Link to="/invoices" className={buttonClassName('secondary', 'text-xs')}>
                  Invoices
                </Link>
                <Link to="/files" className={buttonClassName('secondary', 'text-xs')}>
                  Files
                </Link>
              </div>
            </div>
            <div className="flex flex-col bg-slate-950 p-6 text-white sm:p-7 lg:min-h-[320px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Live conversion preview — Home</p>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-white">{clientFacingStatus}</span>
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl bg-white shadow-inner ring-1 ring-white/10">
                <iframe
                  title="Live conversion preview"
                  srcDoc={homePreviewHtml}
                  className="h-[min(520px,62vh)] w-full bg-white"
                  sandbox="allow-scripts"
                />
              </div>
              <p className="mt-2 text-[10px] text-white/55">Same preview the client sees in their portal.</p>
              <p className="mt-2 text-[10px] text-white/50">Last studio touch: {project.lastSiteUpdateLabel ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {project.deliveryFocus !== 'client_site' && (
        <Card className="mb-8 p-6 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Step {offerStepNumber(offerPhase)} of 4 · {OFFER_PHASE_CLIENT[offerPhase].title}
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{OFFER_PHASE_CLIENT[offerPhase].title}</h2>
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600">{narrativeThisPhase(offerPhase)}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Focus </span>
            {primaryFocusLine}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Next </span>
            {narrativeWhatsNext(offerPhase)}
          </p>
        </Card>
      )}

      {project.deliveryFocus === 'client_site' && (
        <Card className="mb-10 p-6 sm:p-7">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">What we fixed</h3>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate-500">Before → after.</p>
          <ul className="mt-6 divide-y divide-slate-100/90">
            {(project.siteBeforeAfter?.length
              ? project.siteBeforeAfter
              : [
                  { id: 'd-ba-0', before: 'Unclear headline', after: 'Clear value statement' },
                  { id: 'd-ba-1', before: 'No primary CTA', after: 'Strong ask above the fold' },
                  { id: 'd-ba-2', before: 'Messy flow', after: 'Structured sections toward contact' },
                ]
            ).map((row) => (
              <li key={row.id} className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="text-sm text-rose-800 line-through decoration-rose-300/80">{row.before}</span>
                <span className="hidden text-slate-300 sm:inline" aria-hidden>
                  →
                </span>
                <span className="text-sm font-semibold text-emerald-900">{row.after}</span>
              </li>
            ))}
          </ul>
          {project.siteImprovements?.[0] && (
            <p className="mt-5 border-t border-slate-100/90 pt-5 text-[13px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-800">Why it matters </span>
              {project.siteImprovements.map((i) => i.expectedImpact).filter(Boolean).slice(0, 2).join(' ')}
            </p>
          )}
        </Card>
      )}

      {project.deliveryFocus === 'client_site' && project.siteStatus === 'live' && (
        <Card className="mb-10 bg-emerald-50/50 p-6 ring-emerald-200/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">Your site is live</p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-800">
            {project.siteLiveUrl ? (
              <>
                Address:{' '}
                <a href={project.siteLiveUrl} className="font-semibold text-emerald-900 underline decoration-emerald-300/80 underline-offset-2" target="_blank" rel="noreferrer">
                  {project.siteLiveUrl}
                </a>
              </>
            ) : (
              'Point your domain when you are ready — we can keep preview up until DNS is flipped.'
            )}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{AFTER_LIVE_LINE}</p>
        </Card>
      )}

      {project.lifecycleStage === 'post_launch' && project.deliveryFocus === 'client_site' && (
        <Card variant="compact" className="mb-10 bg-violet-50/40 ring-violet-200/35">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900">After launch</p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{POST_LAUNCH_CLIENT_LINE}</p>
        </Card>
      )}

      {project.deliveryFocus !== 'client_site' && (
        <Card variant="compact" className="mb-10 bg-violet-50/25 ring-violet-200/25">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900">Quick actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="text-xs" onClick={() => requestClientFeedback(project.id)}>
              Request client feedback
            </Button>
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setProjectWaitingOn(project.id, null)}>
              Mark on us
            </Button>
            {invoiceToRemind && (
              <Button type="button" className="text-xs" onClick={() => sendInvoice(invoiceToRemind.id)}>
                Invoice reminder · {invoiceToRemind.number}
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-7 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Overview</h3>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
              {project.deliveryFocus === 'client_site'
                ? `Home for ${client?.company ?? 'the client'}'s website — what changed, how it looks, and what happens next. Budget and invoices stay here.`
                : `Everything for ${client?.name ?? 'the client'} — scope, time, invoices, and files in one place.`}
            </p>
            <div className="mt-6 max-w-xl">
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Budget consumed</span>
                <span className="tabular-nums text-slate-600">
                  {formatCurrency(project.spent)} / {formatCurrency(project.budget)} ({pct}%)
                </span>
              </div>
              <ProgressBar value={pct} max={100} />
              <p className="mt-2.5 text-[12px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-700">{formatCurrency(budgetRemaining)}</span> remaining · next milestone{' '}
                <span className="font-medium text-slate-700">{milestones.find((m) => !m.done)?.label ?? 'Complete'}</span>
              </p>
            </div>
          </div>
          {client && (
            <div className="min-w-0 border-t border-slate-100 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Client</h3>
              <Link
                to={`/clients/${client.id}`}
                className="mt-2 block text-lg font-semibold tracking-tight text-violet-700 transition-colors hover:text-violet-900"
              >
                {client.name}
              </Link>
              <p className="mt-1 text-[13px] text-slate-500">{client.email}</p>
            </div>
          )}
        </div>
      </Card>

      <Tabs
        activeId={tabsActiveId}
        onActiveChange={(id) => {
          if (id === 'timeline') setSearchParams({}, { replace: true });
          else setSearchParams({ tab: id }, { replace: true });
        }}
        tabs={[
          {
            id: 'timeline',
            label: 'Timeline',
            content: (
              <div className="rounded-2xl bg-slate-50/50 px-4 py-2 ring-1 ring-slate-900/[0.04] sm:px-5 sm:py-3">
                <ul className="divide-y divide-slate-100/80">
                  {milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3.5 first:pt-2 last:pb-2">
                      <span
                        className={
                          m.done
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800'
                            : 'flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400'
                        }
                      >
                        {m.done ? '✓' : '·'}
                      </span>
                      <span className={m.done ? 'font-medium text-slate-900' : 'text-slate-500'}>{m.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
          {
            id: 'tasks',
            label: 'Tasks',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Task</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Assignee</TableHeadCell>
                    <TableHeadCell>Due</TableHeadCell>
                    <TableHeadCell className="text-right">Actions</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <p className="font-medium text-slate-700">No tasks on this engagement yet</p>
                        <p className="mt-1 max-w-md text-sm text-slate-500">
                          Add tasks from the task board so dates and owners stay tied to this client.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectTasks.flatMap((t) => {
                      const sub = Boolean(t.description || (t.checklist && t.checklist.length > 0));
                      const main = (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium text-slate-900">
                            <div>{t.title}</div>
                            {t.lifecycleStage && (
                              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {LIFECYCLE_LABELS[t.lifecycleStage]}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={taskStatusBadgeVariant(t.status)}>{t.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {t.assigneeId ? users[t.assigneeId]?.name ?? '—' : <span className="text-amber-800">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-slate-500">{t.due}</TableCell>
                          <TableCell className="text-right">
                            {t.status !== 'Done' ? (
                              <Button type="button" variant="secondary" className="text-xs" onClick={() => completeTask(t.id)}>
                                Mark complete
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">Done</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                      if (!sub) return [main];
                      const detail = (
                        <TableRow key={`${t.id}-detail`} className="bg-slate-50/80">
                          <TableCell colSpan={5} className="py-3 text-sm text-slate-600">
                            {t.description && <p className="mb-2 text-slate-700">{t.description}</p>}
                            {t.checklist && t.checklist.length > 0 && (
                              <ul className="space-y-1.5">
                                {t.checklist.map((c) => (
                                  <li key={c.id}>
                                    <label className="flex cursor-pointer items-start gap-2 text-xs">
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                                        checked={c.done}
                                        onChange={() => toggleTaskChecklistItem(t.id, c.id)}
                                      />
                                      <span className={c.done ? 'text-slate-400 line-through' : 'text-slate-800'}>{c.label}</span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                      return [main, detail];
                    })
                  )}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'files',
            label: 'Files',
            content:
              projectFiles.length === 0 ? (
                <Card className="border border-dashed border-slate-200/80 bg-slate-50/50 p-8 text-center shadow-none ring-0">
                  <p className="font-semibold text-slate-800">Upload work to this project</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Files you attach here land on this client and this project — use Files to upload with the right
                    project selected.
                  </p>
                  <Link
                    to={
                      project.clientId
                        ? `/files?project=${encodeURIComponent(project.id)}&client=${encodeURIComponent(project.clientId)}`
                        : `/files?project=${encodeURIComponent(project.id)}`
                    }
                    className={`${buttonClassName('primary', 'mt-4 inline-flex')}`}
                  >
                    Go to Files
                  </Link>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Name</TableHeadCell>
                      <TableHeadCell>Uploaded</TableHeadCell>
                      <TableHeadCell>Visibility</TableHeadCell>
                      <TableHeadCell className="text-right">Size</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-slate-500">{f.uploaded}</TableCell>
                        <TableCell>
                          <Badge variant={f.visibility === 'Client-visible' ? 'success' : 'neutral'}>{f.visibility}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-500">{f.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
          },
          {
            id: 'messages',
            label: 'Messages',
            content: (
              <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-900/[0.05]">
                {projectMessages.length === 0 ? (
                  <li className="px-4 py-6 text-[13px] text-slate-500">No threads on this project yet.</li>
                ) : (
                  projectMessages.map((m) => (
                    <li key={m.id}>
                      <Link
                        to="/messages"
                        className="block px-4 py-3.5 transition-colors duration-150 hover:bg-slate-50/80 sm:px-5"
                      >
                        <p className="font-semibold tracking-tight text-slate-900">{m.participant}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{m.preview}</p>
                        <p className="mt-2 text-[11px] font-semibold text-violet-700">Open in inbox →</p>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            ),
          },
          {
            id: 'contracts',
            label: 'Contracts',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Contract</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right">Value</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        No contracts linked to this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectContracts.map((ct) => (
                      <TableRow key={ct.id}>
                        <TableCell className="font-medium text-slate-900">{ct.title}</TableCell>
                        <TableCell>
                          <Badge variant={contractStatusBadgeVariant(ct.status)}>{ct.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">${ct.value.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'budget',
            label: 'Budget & invoices',
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Invoice</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right">Amount</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-500">
                        No invoices tied to this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectInvoices.map((inv) => (
                      <TableRow key={inv.id} clickable>
                        <TableCell>
                          <Link to={`/invoices/${inv.id}`} className="font-semibold text-violet-700 hover:text-violet-900">
                            {inv.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoiceStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">${inv.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ),
          },
          {
            id: 'activity',
            label: 'Activity',
            content: (
              <div className="rounded-2xl bg-slate-50/50 px-5 py-5 ring-1 ring-slate-900/[0.04]">
                {activityRows.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    Invoices, tasks, and files logged against this project show up here.
                  </p>
                ) : (
                  <ul className="space-y-3.5">
                    {activityRows.map((a) => (
                      <li key={a.id} className="text-[13px] leading-relaxed text-slate-700">
                        {a.title}
                        <span className="mt-0.5 block text-[11px] text-slate-400">{a.timeLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
        ]}
      />
    </DetailPageLayout>
  );
}
