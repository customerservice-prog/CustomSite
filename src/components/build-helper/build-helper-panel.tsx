import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  ListChecks,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button, buttonClassName } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  BUILD_HELPER_STEPS,
  EDIT_CHECK_LABELS,
  EDIT_CHECK_KEYS,
  FEEDBACK_MESSAGE,
  GOAL_OPTIONS,
  PAGE_OPTIONS,
  PUBLISH_CHECK_LABELS,
  PUBLISH_CHECK_KEYS,
  QA_CHECK_LABELS,
  QA_CHECK_KEYS,
  SITE_TYPE_OPTIONS,
} from '@/lib/build-helper/constants';
import {
  countDone,
  deriveBuildHelperStepDone,
  firstIncompleteStep,
  highlightStepForPath,
} from '@/lib/build-helper/derive-progress';
import {
  buildRbyanPrefillPrompt,
  RBYAN_PREFILL_STORAGE_KEY,
  useBuildHelperStore,
} from '@/store/use-build-helper-store';
import { useAppStore } from '@/store/useAppStore';
import { useClients, useProjects } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { useShell } from '@/context/shell-context';

export function BuildHelperPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useShell();

  const clients = useClients();
  const projects = useProjects();
  const projectsById = useAppStore((s) => s.projects);
  const clientsById = useAppStore((s) => s.clients);
  const invoices = useAppStore((s) => s.invoices);
  const selectedClientId = useAppStore((s) => s.ui.selectedClientId);
  const selectedProjectId = useAppStore((s) => s.ui.selectedProjectId);
  const setSelectedClientId = useAppStore((s) => s.setSelectedClientId);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const openModal = useAppStore((s) => s.openModal);

  const enabled = useBuildHelperStore((s) => s.enabled);
  const plansByProjectId = useBuildHelperStore((s) => s.plansByProjectId);
  const perProject = useBuildHelperStore((s) => s.perProject);
  const saveSitePlan = useBuildHelperStore((s) => s.saveSitePlan);
  const patchProjectFlags = useBuildHelperStore((s) => s.patchProjectFlags);
  const setQaCheck = useBuildHelperStore((s) => s.setQaCheck);
  const setPublishCheck = useBuildHelperStore((s) => s.setPublishCheck);
  const setEditCheck = useBuildHelperStore((s) => s.setEditCheck);
  const resetProgressForActiveProject = useBuildHelperStore((s) => s.resetProgressForActiveProject);
  const markAllCompleteForProject = useBuildHelperStore((s) => s.markAllCompleteForProject);
  const postCompletePromptPending = useBuildHelperStore((s) => s.postCompletePromptPending);
  const respondPostCompletePrompt = useBuildHelperStore((s) => s.respondPostCompletePrompt);
  const dismissPostCompletePrompt = useBuildHelperStore((s) => s.dismissPostCompletePrompt);

  const routeProject = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const effectiveProjectId =
    selectedProjectId ||
    (routeProject && routeProject !== 'site' ? routeProject : null) ||
    (pathname.includes('/projects/') ? pathname.split('/')[2] : null) ||
    '';
  const routeClient = pathname.match(/^\/clients\/([^/]+)/)?.[1];
  const effectiveClientId =
    selectedClientId ||
    routeClient ||
    (effectiveProjectId ? projectsById[effectiveProjectId]?.clientId : null) ||
    '';

  const clientProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site' && p.clientId === effectiveClientId),
    [projects, effectiveClientId]
  );

  const plan = effectiveProjectId ? plansByProjectId[effectiveProjectId] : undefined;
  const flags = effectiveProjectId ? perProject[effectiveProjectId] : undefined;

  const doneMap = useMemo(
    () =>
      deriveBuildHelperStepDone({
        pathname,
        selectedClientId: effectiveClientId || null,
        selectedProjectId: effectiveProjectId || null,
        clients: clientsById,
        projects: projectsById,
        invoices,
        plansByProjectId,
        perProject,
      }),
    [
      pathname,
      effectiveClientId,
      effectiveProjectId,
      clientsById,
      projectsById,
      invoices,
      plansByProjectId,
      perProject,
    ]
  );

  const highlight = highlightStepForPath(pathname);
  const completed = countDone(doneMap);
  const current = firstIncompleteStep(doneMap);
  const nextIdx = BUILD_HELPER_STEPS.findIndex((s) => s.id === current);
  const nextTitle = nextIdx >= 0 && nextIdx < BUILD_HELPER_STEPS.length - 1 ? BUILD_HELPER_STEPS[nextIdx + 1]!.title : '—';

  const siteTypeVal = plan?.siteType ?? '';
  const goalVal = plan?.goal ?? '';
  const pagesVal = new Set(plan?.pages ?? []);

  function previewUrl(pid: string) {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/projects/${encodeURIComponent(pid)}/site`;
  }

  function openRbyanPrefilled() {
    if (!effectiveProjectId) {
      toast('Select a project first.', 'info');
      return;
    }
    const c = effectiveClientId ? clientsById[effectiveClientId] : undefined;
    const text = buildRbyanPrefillPrompt(plan, c?.name ?? '', c?.company ?? '');
    try {
      sessionStorage.setItem(RBYAN_PREFILL_STORAGE_KEY, text);
    } catch {
      /* */
    }
    navigate(`/rbyan?project=${encodeURIComponent(effectiveProjectId)}`);
  }

  if (!enabled) return null;

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white shadow-[0_0_24px_rgba(15,23,42,0.06)]">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-900">Build Helper</h2>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Follow this checklist to complete your first client site.</p>
          <p className="mt-2 text-[11px] font-medium text-indigo-700">
            {completed} of {BUILD_HELPER_STEPS.length} complete
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${Math.round((100 * completed) / BUILD_HELPER_STEPS.length)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-600">
            Current: <span className="font-semibold text-slate-800">{BUILD_HELPER_STEPS.find((x) => x.id === current)?.title}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Next: <span className="font-medium text-slate-700">{nextTitle}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Collapse Build Helper"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Context</p>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Client</label>
          <Select
            className="mb-2 w-full text-sm"
            value={effectiveClientId || ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setSelectedClientId(id);
              setSelectedProjectId(null);
            }}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company} — {c.name}
              </option>
            ))}
          </Select>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Project</label>
          <Select
            className="w-full text-sm"
            value={effectiveProjectId || ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setSelectedProjectId(id);
              const p = id ? projectsById[id] : undefined;
              if (p) setSelectedClientId(p.clientId);
            }}
          >
            <option value="">Select project…</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          {BUILD_HELPER_STEPS.map((step) => (
            <StepBlock
              key={step.id}
              step={step}
              done={doneMap[step.id]}
              highlighted={highlight === step.id}
              effectiveClientId={effectiveClientId}
              effectiveProjectId={effectiveProjectId}
              siteTypeVal={siteTypeVal}
              goalVal={goalVal}
              pagesVal={pagesVal}
              flags={flags}
              onSavePlan={() => {
                if (!effectiveProjectId) {
                  toast('Select a project for the plan.', 'info');
                  return;
                }
                if (!siteTypeVal || !goalVal || pagesVal.size === 0) {
                  toast('Pick site type, goal, and at least one page.', 'info');
                  return;
                }
                saveSitePlan(effectiveProjectId, {
                  siteType: siteTypeVal,
                  goal: goalVal,
                  pages: [...pagesVal],
                });
                toast('Site plan saved for this project.', 'success');
              }}
              onTogglePage={(page) => {
                if (!effectiveProjectId) return;
                const next = new Set(pagesVal);
                if (next.has(page)) next.delete(page);
                else next.add(page);
                saveSitePlan(effectiveProjectId, {
                  siteType: siteTypeVal || 'service',
                  goal: goalVal || 'leads',
                  pages: [...next],
                });
              }}
              onSiteType={(v) => {
                if (!effectiveProjectId) return;
                saveSitePlan(effectiveProjectId, {
                  siteType: v,
                  goal: goalVal || 'leads',
                  pages: plan?.pages?.length ? plan.pages : ['Home'],
                });
              }}
              onGoal={(v) => {
                if (!effectiveProjectId) return;
                saveSitePlan(effectiveProjectId, {
                  siteType: siteTypeVal || 'service',
                  goal: v,
                  pages: plan?.pages?.length ? plan.pages : ['Home'],
                });
              }}
              openRbyanPrefilled={openRbyanPrefilled}
              previewUrl={previewUrl}
              patchProjectFlags={patchProjectFlags}
              setQaCheck={setQaCheck}
              setPublishCheck={setPublishCheck}
              setEditCheck={setEditCheck}
              openModal={openModal}
              setSelectedClientId={setSelectedClientId}
              navigate={navigate}
              toast={toast}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full text-xs"
            onClick={() => {
              if (!effectiveProjectId) {
                toast('Select a project to reset its helper progress.', 'info');
                return;
              }
              if (window.confirm('Reset Build Helper progress for this project?')) {
                resetProgressForActiveProject(effectiveProjectId);
                toast('Checklist reset for this project.', 'success');
              }
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restart checklist
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full text-xs"
            onClick={() => {
              if (!effectiveProjectId) {
                toast('Select a project first.', 'info');
                return;
              }
              markAllCompleteForProject(effectiveProjectId);
              toast('All steps marked complete (testing).', 'info');
            }}
          >
            Mark all complete
          </Button>
        </div>
      </div>

      {postCompletePromptPending ? (
        <div className="shrink-0 border-t border-indigo-100 bg-indigo-50/90 px-3 py-3">
          <p className="text-xs font-medium text-indigo-950">Keep Build Helper on for future projects?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" className="flex-1 text-xs" onClick={() => respondPostCompletePrompt(true)}>
              Keep on
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1 text-xs"
              onClick={() => respondPostCompletePrompt(false)}
            >
              Turn off
            </Button>
            <button
              type="button"
              className="rounded p-1 text-indigo-700 hover:bg-indigo-100"
              aria-label="Dismiss"
              onClick={() => dismissPostCompletePrompt()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepBlock({
  step,
  done,
  highlighted,
  effectiveClientId,
  effectiveProjectId,
  siteTypeVal,
  goalVal,
  pagesVal,
  flags,
  onSavePlan,
  onTogglePage,
  onSiteType,
  onGoal,
  openRbyanPrefilled,
  previewUrl,
  patchProjectFlags,
  setQaCheck,
  setPublishCheck,
  setEditCheck,
  openModal,
  setSelectedClientId,
  navigate,
  toast,
}: {
  step: (typeof BUILD_HELPER_STEPS)[number];
  done: boolean;
  highlighted: boolean;
  effectiveClientId: string;
  effectiveProjectId: string;
  siteTypeVal: string;
  goalVal: string;
  pagesVal: Set<string>;
  flags: ReturnType<typeof useBuildHelperStore.getState>['perProject'][string] | undefined;
  onSavePlan: () => void;
  onTogglePage: (page: string) => void;
  onSiteType: (v: string) => void;
  onGoal: (v: string) => void;
  openRbyanPrefilled: () => void;
  previewUrl: (pid: string) => string;
  patchProjectFlags: ReturnType<typeof useBuildHelperStore.getState>['patchProjectFlags'];
  setQaCheck: ReturnType<typeof useBuildHelperStore.getState>['setQaCheck'];
  setPublishCheck: ReturnType<typeof useBuildHelperStore.getState>['setPublishCheck'];
  setEditCheck: ReturnType<typeof useBuildHelperStore.getState>['setEditCheck'];
  openModal: ReturnType<typeof useAppStore.getState>['openModal'];
  setSelectedClientId: ReturnType<typeof useAppStore.getState>['setSelectedClientId'];
  navigate: ReturnType<typeof useNavigate>;
  toast: (m: string, v?: 'success' | 'error' | 'info') => void;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border p-3 transition',
        done ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-slate-200 bg-white',
        highlighted && !done ? 'ring-1 ring-indigo-300' : ''
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
            done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'
          )}
        >
          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : ' '}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-slate-900">{step.title}</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{step.short}</p>
          <StepActions
            stepId={step.id}
            effectiveClientId={effectiveClientId}
            effectiveProjectId={effectiveProjectId}
            siteTypeVal={siteTypeVal}
            goalVal={goalVal}
            pagesVal={pagesVal}
            flags={flags}
            onSavePlan={onSavePlan}
            onTogglePage={onTogglePage}
            onSiteType={onSiteType}
            onGoal={onGoal}
            openRbyanPrefilled={openRbyanPrefilled}
            previewUrl={previewUrl}
            patchProjectFlags={patchProjectFlags}
            setQaCheck={setQaCheck}
            setPublishCheck={setPublishCheck}
            setEditCheck={setEditCheck}
            openModal={openModal}
            setSelectedClientId={setSelectedClientId}
            navigate={navigate}
            toast={toast}
          />
        </div>
      </div>
    </section>
  );
}

function StepActions({
  stepId,
  effectiveClientId,
  effectiveProjectId,
  siteTypeVal,
  goalVal,
  pagesVal,
  flags,
  onSavePlan,
  onTogglePage,
  onSiteType,
  onGoal,
  openRbyanPrefilled,
  previewUrl,
  patchProjectFlags,
  setQaCheck,
  setPublishCheck,
  setEditCheck,
  openModal,
  setSelectedClientId,
  navigate,
  toast,
}: {
  stepId: (typeof BUILD_HELPER_STEPS)[number]['id'];
  effectiveClientId: string;
  effectiveProjectId: string;
  siteTypeVal: string;
  goalVal: string;
  pagesVal: Set<string>;
  flags: ReturnType<typeof useBuildHelperStore.getState>['perProject'][string] | undefined;
  onSavePlan: () => void;
  onTogglePage: (page: string) => void;
  onSiteType: (v: string) => void;
  onGoal: (v: string) => void;
  openRbyanPrefilled: () => void;
  previewUrl: (pid: string) => string;
  patchProjectFlags: ReturnType<typeof useBuildHelperStore.getState>['patchProjectFlags'];
  setQaCheck: ReturnType<typeof useBuildHelperStore.getState>['setQaCheck'];
  setPublishCheck: ReturnType<typeof useBuildHelperStore.getState>['setPublishCheck'];
  setEditCheck: ReturnType<typeof useBuildHelperStore.getState>['setEditCheck'];
  openModal: ReturnType<typeof useAppStore.getState>['openModal'];
  setSelectedClientId: ReturnType<typeof useAppStore.getState>['setSelectedClientId'];
  navigate: ReturnType<typeof useNavigate>;
  toast: (m: string, v?: 'success' | 'error' | 'info') => void;
}) {
  const pid = effectiveProjectId;

  if (stepId === 'setup_client') {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" variant="secondary" className="text-xs" onClick={() => navigate('/clients')}>
          Clients
        </Button>
        <Button type="button" className="text-xs" onClick={() => openModal('create-client')}>
          Add client
        </Button>
      </div>
    );
  }

  if (stepId === 'create_project') {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" variant="secondary" className="text-xs" onClick={() => navigate('/projects')}>
          Projects
        </Button>
        <Button
          type="button"
          className="text-xs"
          onClick={() => {
            if (!effectiveClientId) {
              toast('Pick a client in Context first.', 'info');
              return;
            }
            setSelectedClientId(effectiveClientId);
            openModal('create-project');
          }}
        >
          Create project
        </Button>
      </div>
    );
  }

  if (stepId === 'plan_site') {
    return (
      <div className="mt-2 space-y-2">
        <div>
          <label className="text-[10px] font-medium text-slate-500">Site type</label>
          <Select className="mt-0.5 w-full text-xs" value={siteTypeVal} onChange={(e) => onSiteType(e.target.value)}>
            <option value="">Choose…</option>
            {SITE_TYPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-medium text-slate-500">Goal</label>
          <Select className="mt-0.5 w-full text-xs" value={goalVal} onChange={(e) => onGoal(e.target.value)}>
            <option value="">Choose…</option>
            {GOAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-500">Pages</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {PAGE_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePage(p)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                  pagesVal.has(p) ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Button type="button" className="w-full text-xs" onClick={onSavePlan}>
          Save plan
        </Button>
      </div>
    );
  }

  if (stepId === 'rbyan') {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" className="h-9 px-3 text-xs" onClick={openRbyanPrefilled}>
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Open Rbyan (prefill)
        </Button>
        <Link
          className={cn(buttonClassName('secondary', 'h-9 px-3 text-xs font-semibold'))}
          to={pid ? `/rbyan?project=${encodeURIComponent(pid)}` : '/rbyan'}
        >
          Rbyan
        </Link>
      </div>
    );
  }

  if (stepId === 'site_builder') {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Link
            className={cn(
              buttonClassName('primary', 'h-9 px-3 text-xs'),
              !pid && 'pointer-events-none opacity-50'
            )}
            to={pid ? `/projects/${pid}/site` : '#'}
          >
            Open Site Builder
          </Link>
        </div>
        <p className="text-[10px] font-medium text-slate-500">Edit checklist</p>
        <div className="space-y-1">
          {EDIT_CHECK_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={flags?.editChecklist?.[k] === true}
                onChange={(e) => pid && setEditCheck(pid, k, e.target.checked)}
                className="rounded border-slate-300"
              />
              {EDIT_CHECK_LABELS[k]}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (stepId === 'preview_qa') {
    return (
      <div className="mt-2 space-y-2">
        <Link
          className={cn(buttonClassName('secondary', 'h-9 px-3 text-xs'), !pid && 'pointer-events-none opacity-50')}
          to={pid ? `/projects/${pid}/site` : '#'}
        >
          Open preview
        </Link>
        <div className="space-y-1">
          {QA_CHECK_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={flags?.qa?.[k] === true}
                onChange={(e) => pid && setQaCheck(pid, k, e.target.checked)}
                className="rounded border-slate-300"
              />
              {QA_CHECK_LABELS[k]}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (stepId === 'feedback') {
    return (
      <div className="mt-2 space-y-2">
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={!pid}
          onClick={() => {
            void navigator.clipboard.writeText(previewUrl(pid)).then(
              () => toast('Preview link copied.', 'success'),
              () => toast('Could not copy — copy manually.', 'error')
            );
          }}
        >
          <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
          Copy preview link
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(FEEDBACK_MESSAGE).then(
              () => toast('Message copied.', 'success'),
              () => toast('Could not copy.', 'error')
            );
          }}
        >
          Copy suggested message
        </Button>
        <Button
          type="button"
          className="text-xs"
          disabled={!pid}
          onClick={() => {
            patchProjectFlags(pid, { feedbackSent: true });
            toast('Marked feedback as sent.', 'success');
          }}
        >
          Mark feedback sent
        </Button>
      </div>
    );
  }

  if (stepId === 'publish') {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Link
            className={cn(buttonClassName('primary', 'h-9 px-3 text-xs'), !pid && 'pointer-events-none opacity-50')}
            to={pid ? `/projects/${pid}/site` : '#'}
          >
            Publish in Site Builder
          </Link>
          <Link
            className={cn(buttonClassName('secondary', 'h-9 px-3 text-xs'), !pid && 'pointer-events-none opacity-50')}
            to={pid ? `/projects/${pid}` : '#'}
          >
            Project <ExternalLink className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-1">
          {PUBLISH_CHECK_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={flags?.publishQa?.[k] === true}
                onChange={(e) => pid && setPublishCheck(pid, k, e.target.checked)}
                className="rounded border-slate-300"
              />
              {PUBLISH_CHECK_LABELS[k]}
            </label>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs"
          disabled={!pid}
          onClick={() => {
            patchProjectFlags(pid, { publishConfirmed: true });
            toast('Marked publish checklist done.', 'success');
          }}
        >
          Mark published (manual)
        </Button>
      </div>
    );
  }

  if (stepId === 'invoice_wrap') {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link className={buttonClassName('primary', 'h-9 px-3 text-xs')} to="/invoices">
          Invoices
        </Link>
        <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={() => openModal('create-invoice')}>
          Create invoice
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={!pid}
          onClick={() => {
            patchProjectFlags(pid, { wrapUpMarked: true });
            toast('Marked project wrap-up done.', 'success');
          }}
        >
          Mark wrap-up done
        </Button>
      </div>
    );
  }

  return null;
}
