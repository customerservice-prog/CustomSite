import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  ListChecks,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button, buttonClassName } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FEEDBACK_MESSAGE, GOAL_OPTIONS, PAGE_OPTIONS, SITE_TYPE_OPTIONS } from '@/lib/build-helper/constants';
import { BUILD_STEPS, countCompleted, MANUAL_STEP_IDS, type ManualStepId } from '@/lib/build-helper/build-steps';
import {
  buildRbyanPrefillPrompt,
  RBYAN_PREFILL_STORAGE_KEY,
  useBuildHelperStore,
  type BuildHelperSitePlan,
} from '@/store/use-build-helper-store';
import { useAppStore } from '@/store/useAppStore';
import { useClients, useProjects } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { useShell } from '@/context/shell-context';

const STEP_HINT: Record<string, string> = {
  client: 'Add the business you are building for.',
  project: 'Create a website project for this client.',
  plan: 'Decide site type, pages, and conversion goal.',
    rbyan: 'Generate the first version with AI Builder.',
  edit: 'Review and customize files in Site Builder.',
  qa: 'Preview desktop/tablet/mobile and verify behavior.',
  feedback: 'Share preview link and collect client notes.',
  publish: 'Ship when the site is production-ready.',
  invoice: 'Invoice and mark the engagement complete.',
  complete: 'All steps done for this checklist.',
};

export function BuildHelperPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { toast } = useShell();

  const enabled = useBuildHelperStore((s) => s.enabled);
  const activeClientId = useBuildHelperStore((s) => s.activeClientId);
  const activeProjectId = useBuildHelperStore((s) => s.activeProjectId);
  const currentStep = useBuildHelperStore((s) => s.currentStep);
  const completedSteps = useBuildHelperStore((s) => s.completedSteps);
  const sitePlan = useBuildHelperStore((s) => s.sitePlan);
  const setActiveClientId = useBuildHelperStore((s) => s.setActiveClientId);
  const setActiveProjectId = useBuildHelperStore((s) => s.setActiveProjectId);
  const setSitePlan = useBuildHelperStore((s) => s.setSitePlan);
  const markManualStep = useBuildHelperStore((s) => s.markManualStep);
  const restartChecklist = useBuildHelperStore((s) => s.restartChecklist);
  const postCompletePromptPending = useBuildHelperStore((s) => s.postCompletePromptPending);
  const respondPostCompletePrompt = useBuildHelperStore((s) => s.respondPostCompletePrompt);
  const dismissPostCompletePrompt = useBuildHelperStore((s) => s.dismissPostCompletePrompt);

  const clients = useClients();
  const projects = useProjects();
  const projectsById = useAppStore((s) => s.projects);
  const clientsById = useAppStore((s) => s.clients);
  const setSelectedClientId = useAppStore((s) => s.setSelectedClientId);
  const setSelectedProjectId = useAppStore((s) => s.setSelectedProjectId);
  const openModal = useAppStore((s) => s.openModal);
  const pendingNewClientId = useAppStore((s) => s.pendingNewClientId);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.deliveryFocus === 'client_site' && p.clientId === activeClientId),
    [projects, activeClientId]
  );

  const doneSet = useMemo(() => new Set(completedSteps), [completedSteps]);
  const total = BUILD_STEPS.length;
  const completed = countCompleted(completedSteps);
  const pct = Math.round((100 * completed) / total);

  const [siteType, setSiteType] = useState(sitePlan?.siteType ?? '');
  const [goal, setGoal] = useState(sitePlan?.goal ?? '');
  const [pages, setPages] = useState<Set<string>>(() => new Set(sitePlan?.pages ?? []));

  useEffect(() => {
    if (sitePlan) {
      setSiteType(sitePlan.siteType);
      setGoal(sitePlan.goal);
      setPages(new Set(sitePlan.pages));
    } else {
      setSiteType('');
      setGoal('');
      setPages(new Set());
    }
  }, [sitePlan]);

  useEffect(() => {
    if (!pendingNewClientId) return;
    setActiveClientId(pendingNewClientId);
    setSelectedClientId(pendingNewClientId);
    setActiveProjectId(null);
    setSelectedProjectId(null);
    useAppStore.setState({ pendingNewClientId: null });
  }, [pendingNewClientId, setActiveClientId, setSelectedClientId, setActiveProjectId, setSelectedProjectId]);

  if (!enabled) return null;

  const activeClient = activeClientId ? clientsById[activeClientId] : undefined;
  const activeProject = activeProjectId ? projectsById[activeProjectId] : undefined;

  function openRbyan() {
    if (!activeProjectId) {
      toast('Select a project first.', 'info');
      return;
    }
    const text = buildRbyanPrefillPrompt(sitePlan, activeClient?.name ?? '', activeClient?.company ?? '');
    try {
      sessionStorage.setItem(RBYAN_PREFILL_STORAGE_KEY, text);
    } catch {
      /* */
    }
    navigate(`/rbyan?project=${encodeURIComponent(activeProjectId)}`);
  }

  function previewUrl() {
    if (!activeProjectId) return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/projects/${encodeURIComponent(activeProjectId)}/site`;
  }

  const cur = BUILD_STEPS.find((s) => s.id === currentStep);

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white shadow-[0_0_24px_rgba(15,23,42,0.06)]">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-900">Build Helper</h2>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Step-by-step guidance for your first client build.</p>
          <p className="mt-2 text-[11px] font-medium text-indigo-700">
            {completed} of {total} complete
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            Current:{' '}
            <span className="font-semibold text-slate-800">
              {currentStep === 'complete' ? 'All complete' : (cur?.title ?? currentStep)}
            </span>
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
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Context</p>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Client</label>
          <div className="mb-2 flex flex-wrap items-stretch gap-2">
            <Select
              className="min-w-0 flex-1 text-sm"
              value={activeClientId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                setActiveClientId(id);
                setSelectedClientId(id);
                setActiveProjectId(null);
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
            <button
              type="button"
              onClick={() => openModal('create-client', { pickContext: true })}
              className={buttonClassName('secondary', 'h-9 shrink-0 gap-1 px-2.5 text-xs')}
              title="Add a new client"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New
            </button>
          </div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">Project</label>
          <Select
            className="w-full text-sm"
            value={activeProjectId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setActiveProjectId(id);
              setSelectedProjectId(id);
              const p = id ? projectsById[id] : undefined;
              if (p) {
                setActiveClientId(p.clientId);
                setSelectedClientId(p.clientId);
              }
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

        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Steps</p>
        <ul className="mb-4 space-y-1">
          {BUILD_STEPS.map((s) => {
            const done = doneSet.has(s.id);
            const active = s.id === currentStep;
            return (
              <li
                key={s.id}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition',
                  done ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950' : 'border-slate-100 bg-white text-slate-700',
                  active && !done ? 'ring-1 ring-indigo-300' : ''
                )}
              >
                <button
                  type="button"
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] outline-none transition hover:ring-2 hover:ring-indigo-300/50 focus-visible:ring-2 focus-visible:ring-indigo-400',
                    done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                  )}
                  aria-label={done ? `${s.title} completed` : `Mark ${s.title}`}
                  disabled={done}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (done) return;
                    if (MANUAL_STEP_IDS.includes(s.id as ManualStepId)) {
                      markManualStep(s.id as ManualStepId);
                      toast(`Marked “${s.title}” complete.`, 'success');
                      return;
                    }
                    if (s.id === 'plan') {
                      toast(
                        'Plan site: in Current step, pick site type, goal, and pages — then Save site plan. Earlier steps must be done first.',
                        'info'
                      );
                    }
                  }}
                >
                  {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </button>
                <span className={cn('font-medium', active && 'text-indigo-900')}>{s.title}</span>
              </li>
            );
          })}
        </ul>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800/80">Current step</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            {currentStep === 'complete' ? 'Pipeline complete' : (cur?.title ?? currentStep)}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{STEP_HINT[currentStep] ?? ''}</p>

          <div className="mt-3">
            {currentStep === 'complete' ? (
              <p className="text-xs text-slate-700">You have finished every Build Helper step for this run.</p>
            ) : null}

            {currentStep === 'client' ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={() => navigate('/clients')}>
                  Clients
                </Button>
                <Button
                  type="button"
                  className="h-9 px-3 text-xs"
                  onClick={() => openModal('create-client', { pickContext: true })}
                >
                  Add client
                </Button>
              </div>
            ) : null}

            {currentStep === 'project' ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={() => navigate('/projects')}>
                  Projects
                </Button>
                <Button
                  type="button"
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    if (!activeClientId) {
                      toast('Select a client first.', 'info');
                      return;
                    }
                    setSelectedClientId(activeClientId);
                    openModal('create-project');
                  }}
                >
                  Create project
                </Button>
              </div>
            ) : null}

            {currentStep === 'plan' ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Site type</label>
                  <Select className="mt-0.5 w-full text-xs" value={siteType} onChange={(e) => setSiteType(e.target.value)}>
                    <option value="">Choose…</option>
                    {SITE_TYPE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Goal</label>
                  <Select className="mt-0.5 w-full text-xs" value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">Choose…</option>
                    {GOAL_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-600">Pages</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {PAGE_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const n = new Set(pages);
                          if (n.has(p)) n.delete(p);
                          else n.add(p);
                          setPages(n);
                        }}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
                          pages.has(p) ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-9 w-full text-xs"
                  onClick={() => {
                    if (!siteType || !goal || pages.size === 0) {
                      toast('Choose site type, goal, and at least one page.', 'info');
                      return;
                    }
                    const next: BuildHelperSitePlan = { siteType, goal, pages: [...pages] };
                    setSitePlan(next);
                    toast('Site plan saved.', 'success');
                  }}
                >
                  Save site plan
                </Button>
              </div>
            ) : null}

            {currentStep === 'rbyan' ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="h-9 px-3 text-xs" onClick={openRbyan}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Open AI Builder
                </Button>
                <Link
                  className={cn(
                    buttonClassName('secondary', 'h-9 px-3 text-xs font-semibold'),
                    !activeProjectId && 'pointer-events-none opacity-50'
                  )}
                  to={activeProjectId ? `/rbyan?project=${encodeURIComponent(activeProjectId)}` : '#'}
                >
                  AI Builder (no prefill)
                </Link>
              </div>
            ) : null}

            {currentStep === 'edit' ? (
              <Link
                className={cn(
                  buttonClassName('primary', 'h-9 px-3 text-xs'),
                  !activeProjectId && 'pointer-events-none opacity-50'
                )}
                to={activeProjectId ? `/projects/${activeProjectId}/site` : '#'}
              >
                Open Site Builder
              </Link>
            ) : null}

            {currentStep === 'qa' ? (
              <div className="flex flex-col gap-2">
                <Link
                  className={cn(
                    buttonClassName('secondary', 'h-9 px-3 text-xs'),
                    !activeProjectId && 'pointer-events-none opacity-50'
                  )}
                  to={activeProjectId ? `/projects/${activeProjectId}/site` : '#'}
                >
                  Open preview
                </Link>
                <Button type="button" className="h-9 px-3 text-xs" onClick={() => markManualStep('qa')}>
                  Mark QA complete
                </Button>
              </div>
            ) : null}

            {currentStep === 'feedback' ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={!activeProjectId}
                  onClick={() => {
                    void navigator.clipboard.writeText(previewUrl()).then(
                      () => toast('Preview link copied.', 'success'),
                      () => toast('Could not copy.', 'error')
                    );
                  }}
                >
                  <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                  Copy preview link
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(FEEDBACK_MESSAGE).then(
                      () => toast('Message copied.', 'success'),
                      () => toast('Could not copy.', 'error')
                    );
                  }}
                >
                  Copy suggested message
                </Button>
                <Button type="button" className="h-9 px-3 text-xs" onClick={() => markManualStep('feedback')}>
                  Mark feedback sent
                </Button>
              </div>
            ) : null}

            {currentStep === 'publish' ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-slate-600">
                  Detected when project <code className="rounded bg-white/80 px-1">siteStatus</code> is live. Use your
                  normal publish flow in Site Builder / project settings.
                </p>
                <Link
                  className={cn(
                    buttonClassName('primary', 'h-9 px-3 text-xs'),
                    !activeProjectId && 'pointer-events-none opacity-50'
                  )}
                  to={activeProjectId ? `/projects/${activeProjectId}/site` : '#'}
                >
                  Publish site
                </Link>
                {activeProject ? (
                  <Link
                    className={buttonClassName('secondary', 'inline-flex h-9 items-center px-3 text-xs')}
                    to={activeProjectId ? `/projects/${activeProjectId}` : '#'}
                  >
                    Project <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {currentStep === 'invoice' ? (
              <div className="flex flex-wrap gap-2">
                <Link className={buttonClassName('secondary', 'h-9 px-3 text-xs')} to="/invoices">
                  Invoices
                </Link>
                <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={() => openModal('create-invoice')}>
                  Create invoice
                </Button>
                <Button type="button" className="h-9 px-3 text-xs" onClick={() => markManualStep('invoice')}>
                  Mark complete
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full text-xs"
            onClick={() => {
              if (window.confirm('Restart checklist? This clears completed steps and the site plan.')) {
                restartChecklist();
                toast('Checklist restarted.', 'success');
              }
            }}
          >
            <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
            Restart checklist
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
            <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => respondPostCompletePrompt(false)}>
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
