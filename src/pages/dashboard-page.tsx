import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  DollarSign,
  FolderKanban,
  Globe,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { clientHealthBadgeVariant, invoiceStatusBadgeVariant, projectHealthBadgeVariant } from '@/lib/statuses';
import {
  buildChainedNextSteps,
  buildClosureLines,
  buildDailyScoreboard,
  buildLifecyclePulse,
  buildProactivePrompts,
  buildSinceLastVisitLines,
  buildSmartPulseRollups,
  LIFECYCLE_PROGRESSION_NOTE,
  LIFECYCLE_STAGES,
  loadStudioSnapshot,
  pickSoftGuidance,
  revenueGoalProgress,
  saveStudioSnapshot,
  tasksCompletedTodayCount,
  weeklyProductivityNudgeTarget,
  weeklyTasksCompletedCount,
} from '@/lib/operating-layer';
import { buildOperatorPulseSummary } from '@/lib/autonomous-operator-cycle';
import { cn } from '@/lib/utils';
import type { PriorityTier } from '@/lib/system-intelligence';
import {
  clientHealthLabel,
  clientHealthLevel,
  priorityQueueStats,
  projectHealthLabel,
  projectHealthLevel,
} from '@/lib/system-intelligence';
import { DashboardLayout } from '@/components/layout/templates/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useShell } from '@/context/shell-context';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import {
  useDashboardMetrics,
  useClients,
  useProjects,
  useMessageThreads,
  useActivitiesFeed,
  usePipelineColumnStats,
  usePriorityQueue,
  useAutomatedInsights,
  useRevenueHealth,
  useTasks,
} from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

/** Hard cap — behavior engine shows top 3 until user explicitly expands */
const PRIORITY_PREVIEW = 3;
const INSIGHT_PREVIEW = 2;
const ACTIVITY_PREVIEW = 3;
const DEADLINE_PREVIEW = 3;
const MESSAGE_PREVIEW = 3;

function priorityTierCardClass(tier: PriorityTier) {
  if (tier === 'critical') return 'border-rose-200 bg-rose-50/80';
  if (tier === 'important') return 'border-amber-200 bg-amber-50/70';
  return 'border-slate-200 bg-slate-50/80';
}

function priorityTierGlyph(tier: PriorityTier) {
  if (tier === 'critical') return '🔴';
  if (tier === 'important') return '🟠';
  return '🟡';
}

function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 text-[10px] font-black text-slate-600">
        {n}
      </span>
      {children}
    </p>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { setCommandOpen } = useShell();
  const m = useDashboardMetrics();
  const pipelineCols = usePipelineColumnStats();
  const clients = useClients();
  const projects = useProjects();
  const threads = useMessageThreads();
  const activities = useActivitiesFeed();
  const tasks = useTasks();
  const priorityQueue = usePriorityQueue(14);
  const insights = useAutomatedInsights();
  const revenueHealth = useRevenueHealth();
  const deadlines = useAppStore((s) => s.deadlines);
  const store = useAppStore((s) => s);
  const completeTask = useAppStore((s) => s.completeTask);
  const advanceExecutionLoop = useAppStore((s) => s.advanceExecutionLoop);
  const undoOperatorEvent = useAppStore((s) => s.undoOperatorEvent);
  const invoices = useAppStore(useShallow((s) => sel.invoicesList(s)));
  const operatorEvents = store.operator.events;

  const [expandPriority, setExpandPriority] = useState(false);
  const [expandInsights, setExpandInsights] = useState(false);
  const [expandActivity, setExpandActivity] = useState(false);
  const [expandTasks, setExpandTasks] = useState(false);
  const [pulseExpanded, setPulseExpanded] = useState(false);
  const [continuityLines] = useState<string[]>(() => {
    const prev = loadStudioSnapshot();
    return buildSinceLastVisitLines(useAppStore.getState(), prev);
  });

  useEffect(() => {
    return () => saveStudioSnapshot(useAppStore.getState());
  }, []);

  useEffect(() => {
    useAppStore.getState().processAutonomousOperatorCycle();
  }, []);

  const operatorPulse = useMemo(() => buildOperatorPulseSummary(store), [store]);

  const overdue = m.overdueCount;
  const unreadThreads = m.unreadThreads;
  const onHold = m.onHoldProjects;
  const blockedTasks = m.blockedTasks;
  const paidMonth = m.paidRevenue;
  const outstanding = m.outstanding;
  const openInvoices = invoices.filter((i) => i.status !== 'Paid').slice(0, 3);

  const pStats = useMemo(() => priorityQueueStats(store), [store]);
  const mustFocus = pStats.critical > 0;
  const showFullPulse = !mustFocus || pulseExpanded;

  const healthRankedProjects = useMemo(() => {
    const rank = (h: ReturnType<typeof projectHealthLevel>) => (h === 'blocked' ? 0 : h === 'at_risk' ? 1 : 2);
    return [...projects]
      .sort((a, b) => rank(projectHealthLevel(store, a.id)) - rank(projectHealthLevel(store, b.id)))
      .slice(0, 4);
  }, [projects, store]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'Done'), [tasks]);
  const visibleTasks = expandTasks ? openTasks : openTasks.slice(0, 5);
  const visiblePriority = expandPriority ? priorityQueue : priorityQueue.slice(0, PRIORITY_PREVIEW);
  const visibleInsights = expandInsights ? insights : insights.slice(0, INSIGHT_PREVIEW);
  const visibleActivity = expandActivity ? activities : activities.slice(0, ACTIVITY_PREVIEW);

  const steady =
    pStats.critical === 0 &&
    pStats.important === 0 &&
    overdue === 0 &&
    unreadThreads === 0 &&
    blockedTasks === 0;

  const smartRollups = useMemo(() => buildSmartPulseRollups(store), [store]);
  const proactivePrompts = useMemo(() => buildProactivePrompts(store, 3), [store]);
  const closure = useMemo(() => buildClosureLines(store, pStats), [store, pStats]);
  const dailyBoard = useMemo(() => buildDailyScoreboard(store, pStats), [store, pStats]);
  const softHint = useMemo(() => pickSoftGuidance(store), [store]);
  const weeklyDone = useMemo(() => weeklyTasksCompletedCount(store), [store]);
  const weeklyTarget = weeklyProductivityNudgeTarget();
  const revGoal = useMemo(() => revenueGoalProgress(store), [store]);
  const tasksToday = useMemo(() => tasksCompletedTodayCount(store), [store]);
  const chainedSteps = useMemo(() => buildChainedNextSteps(store, 5), [store]);
  const lifecyclePulse = useMemo(() => buildLifecyclePulse(store), [store]);
  const startHere = useMemo(() => {
    const first = priorityQueue[0];
    if (first) {
      return {
        href: first.href,
        label: `Start here · ${first.suggestedAction}`,
        sub: first.title,
        impact: first.impactLine,
      };
    }
    if (unreadThreads > 0) {
      return {
        href: '/messages',
        label: 'Start here · Open Messages',
        sub: `${unreadThreads} conversation${unreadThreads === 1 ? '' : 's'} need your reply`,
        impact: 'Slow replies train clients you’re not their priority.',
      };
    }
    if (overdue > 0) {
      const inv = sel.getOverdueInvoices(store)[0];
      const sum = sel.getOverdueInvoices(store).reduce((s, i) => s + i.amount, 0);
      return {
        href: inv ? `/invoices/${inv.id}` : '/invoices',
        label: 'Start here · Follow up on overdue invoices',
        sub: `${overdue} invoice${overdue === 1 ? '' : 's'} past due`,
        impact: `~$${sum.toLocaleString()} past terms — leverage shrinks every day you don’t touch it.`,
      };
    }
    return {
      href: '/pipeline',
      label: 'Start here · Work the pipeline',
      sub: 'Nothing urgent in queue — pick your next win',
    };
  }, [priorityQueue, unreadThreads, overdue, store]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Studio Pulse"
        description="The operating system for client work — what needs attention now, what’s at risk, money still outstanding, replies you owe, and blocked delivery. Start with the priority queue; everything ties back to clients, projects, and revenue."
        actions={
          <>
            <Dropdown align="right" trigger={<DropdownChevronTrigger label="More" />}>
              <DropdownItem onClick={() => navigate('/pipeline')}>
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" /> Pipeline board
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => navigate('/client-portal')}>
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" /> Client portal preview
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => navigate('/reports')}>
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-500" /> Reports
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => navigate('/messages')}>
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" /> Inbox
                </span>
              </DropdownItem>
            </Dropdown>
            <Button type="button" className="gap-2 shadow-md shadow-indigo-900/10" onClick={() => setCommandOpen(true)}>
              <Plus className="h-4 w-4" />
              Quick create
            </Button>
          </>
        }
      />

      <div className="rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white p-4 shadow-md shadow-indigo-900/[0.06] ring-1 ring-indigo-900/[0.04] sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Recommended first move</p>
        <Link
          to={startHere.href}
          className="mt-2 flex items-start justify-between gap-3 rounded-xl text-left transition hover:opacity-90"
        >
          <span>
            <span className="block text-base font-bold text-slate-900 sm:text-lg">{startHere.label}</span>
            <span className="mt-1 block text-sm text-slate-600">{startHere.sub}</span>
            {startHere.impact && (
              <span className="mt-2 block border-l-2 border-rose-400 bg-rose-50/80 py-2 pl-3 pr-2 text-sm font-semibold leading-snug text-rose-950">
                Cost of waiting: {startHere.impact}
              </span>
            )}
          </span>
          <ChevronRight className="mt-1 h-6 w-6 shrink-0 text-indigo-600" aria-hidden />
        </Link>
      </div>

      <Card className="border-2 border-slate-900/10 bg-gradient-to-br from-slate-900/[0.03] to-indigo-50/50 p-4 shadow-md sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
              Autonomous operator
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">What we handled · what’s moving · where you step in</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              High confidence → the system acts by default. Medium → tighter templates. Everything gets a{' '}
              <span className="font-semibold text-slate-800">why</span> line and a reversible undo (counters / policy —
              not literal unsend in this demo).
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-3 py-3 ring-1 ring-emerald-900/[0.04]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">Autonomous coverage</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950">~{operatorPulse.pctHandledNarrative}%</p>
            <p className="text-xs text-emerald-900/85">
              High-confidence touches: {operatorPulse.autonomousHigh} · medium: {operatorPulse.autonomousMedium}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 px-3 py-3 ring-1 ring-amber-900/[0.04]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">In motion</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-950">~{operatorPulse.pctProgressNarrative}%</p>
            <p className="text-xs text-amber-900/85">Critical loops open: {operatorPulse.criticalOpen}</p>
          </div>
          <div className="rounded-xl border border-rose-200/90 bg-rose-50/70 px-3 py-3 ring-1 ring-rose-900/[0.04]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-900">Needs human judgment</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-rose-950">~{operatorPulse.pctHumanNarrative}%</p>
            <p className="text-xs text-rose-900/85">Escalating loops: {operatorPulse.escalatingLoops}</p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-200/80 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Transparency log · recent touches</p>
          <ul className="mt-2 space-y-2">
            {operatorEvents
              .filter((e) => !e.undone)
              .slice(0, 6)
              .map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white/95 px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={e.confidence === 'high' ? 'success' : e.confidence === 'medium' ? 'warning' : 'neutral'}
                        className="text-[9px] font-bold"
                      >
                        {e.confidence} confidence
                      </Badge>
                      <span className="font-semibold text-slate-900">{e.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{e.detail}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      <span className="font-semibold text-slate-700">Why: </span>
                      {e.rationale}
                    </p>
                  </div>
                  {e.reversible && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 shrink-0 self-start text-xs font-bold text-rose-700 hover:bg-rose-50"
                      onClick={() => undoOperatorEvent(e.id)}
                    >
                      Undo
                    </Button>
                  )}
                </li>
              ))}
          </ul>
          {operatorEvents.filter((e) => !e.undone).length === 0 && (
            <p className="mt-2 text-sm text-slate-500">
              No operator touches yet — when loops cross policy thresholds, actions appear here automatically.
            </p>
          )}
        </div>
      </Card>

      {mustFocus && !showFullPulse && (
        <div className="rounded-2xl border-2 border-rose-300/90 bg-rose-50/90 px-4 py-4 shadow-sm sm:px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800">Operator mode</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Critical items are live — secondary dashboards stay hidden so you don’t browse instead of act.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full border-slate-200 font-bold sm:w-auto"
            onClick={() => setPulseExpanded(true)}
          >
            Show full Studio Pulse (context &amp; metrics)
          </Button>
        </div>
      )}

      {showFullPulse && (
        <>
      <div className="os-card rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Daily loop (non-negotiable)</p>
        <ol className="mt-2 flex flex-col gap-2 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
          <li>
            <span className="font-bold text-indigo-700">1 · Priorities</span> — urgent + what moved since you left
          </li>
          <li>
            <span className="font-bold text-indigo-700">2 · Actions</span> — reply, complete, send, approve
          </li>
          <li>
            <span className="font-bold text-indigo-700">3 · Work</span> — projects, tasks, pipeline
          </li>
          <li>
            <span className="font-bold text-indigo-700">4 · Money</span> — revenue + invoices
          </li>
          <li>
            <span className="font-bold text-indigo-700">5 · Close</span> — leave with confidence
          </li>
        </ol>
      </div>

      <Card className="border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Revenue lifecycle — where the chain is stuck</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Lifecycle stages">
          {LIFECYCLE_STAGES.map((s, i) => {
            const active = i === lifecyclePulse.activeStageIndex;
            return (
              <span
                key={s.id}
                role="listitem"
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-tight',
                  active
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/60'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                {s.label}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-sm leading-snug text-slate-700">{lifecyclePulse.summary}</p>
        <Link
          to={lifecyclePulse.cta.href}
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          {lifecyclePulse.cta.label}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="mt-3 border-t border-slate-200/80 pt-3 text-xs leading-relaxed text-slate-600">{LIFECYCLE_PROGRESSION_NOTE}</p>
      </Card>

      <SectionLabel n="1">Priority — nothing gets past this</SectionLabel>

      <Card
        className={`os-card border p-4 shadow-sm ring-1 ring-indigo-900/[0.04] ${
          dailyBoard.tone === 'rose'
            ? 'border-rose-200 bg-rose-50/50'
            : dailyBoard.tone === 'amber'
              ? 'border-amber-200 bg-amber-50/40'
              : dailyBoard.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-indigo-100 bg-indigo-50/35'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Daily scoreboard</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{dailyBoard.headline}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{dailyBoard.subline}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              dailyBoard.tone === 'rose'
                ? 'bg-rose-600 text-white'
                : dailyBoard.tone === 'amber'
                  ? 'bg-amber-600 text-white'
                  : dailyBoard.tone === 'emerald'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-600 text-white'
            }`}
          >
            {dailyBoard.badge}
          </span>
        </div>
      </Card>

      <Card className="os-card border-indigo-100 bg-indigo-50/35 p-4 shadow-sm ring-1 ring-indigo-900/[0.04]">
        <h2 className="text-sm font-bold text-indigo-950">Since you were last here</h2>
        <p className="mt-0.5 text-xs text-indigo-900/70">
          So you never start cold — here’s what moved while you were away.
        </p>
        <ul className="mt-3 space-y-2">
          {continuityLines.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-indigo-950/90">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <div className="os-card-interactive rounded-2xl border-2 border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 p-5 shadow-lg shadow-slate-900/[0.06] sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Urgency snapshot</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {steady
            ? 'You are in control — billing, delivery, and inbox look steady from this snapshot.'
            : 'Work top to bottom: clear urgent, then attention items — no guessing what matters.'}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div
            className={`rounded-2xl border-2 px-4 py-4 transition ${
              pStats.critical > 0
                ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200/60'
                : 'border-slate-200/90 bg-white/80'
            }`}
          >
            <p
              className={`text-3xl font-black tabular-nums sm:text-4xl ${
                pStats.critical > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {pStats.critical}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">Urgent — handle first</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              Overdue AR, blocked work, unsigned contracts, clients waiting on you
            </p>
          </div>
          <div
            className={`rounded-2xl border-2 px-4 py-4 transition ${
              pStats.important > 0
                ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200/50'
                : 'border-slate-200/90 bg-white/80'
            }`}
          >
            <p
              className={`text-3xl font-black tabular-nums sm:text-4xl ${
                pStats.important > 0 ? 'text-amber-700' : 'text-slate-400'
              }`}
            >
              {pStats.important}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">Needs attention — schedule next</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              Due today, scope risk, quiet accounts, proposals waiting — tackle after urgent is calm
            </p>
          </div>
          <div
            className={`rounded-2xl border-2 px-4 py-4 transition ${
              steady ? 'border-emerald-300 bg-emerald-50/90 ring-2 ring-emerald-200/50' : 'border-slate-200/90 bg-white/80'
            }`}
          >
            <p className={`text-3xl font-black tabular-nums sm:text-4xl ${steady ? 'text-emerald-600' : 'text-slate-400'}`}>
              {steady ? '✓' : '···'}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{steady ? 'On track' : 'Steady state'}</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">
              {steady
                ? 'Keep routing work — nothing critical is competing for your attention.'
                : 'Routine work can wait until urgent and attention queues are calmer.'}
            </p>
          </div>
        </div>
        {smartRollups.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 border-t border-slate-200/80 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Grouped intelligence</p>
            <ul className="space-y-1.5">
              {smartRollups.map((line, i) => (
                <li key={i} className="text-sm font-medium leading-snug text-slate-800">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Card className="border border-emerald-100/90 bg-emerald-50/35 p-4 shadow-sm ring-1 ring-emerald-900/[0.06]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Today&apos;s wins</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {tasksToday === 0
            ? 'No tasks closed yet today — finish one to start a completion streak.'
            : `${tasksToday} task${tasksToday === 1 ? '' : 's'} closed today — small wins compound.`}
        </p>
        <Link to="/tasks" className="mt-2 inline-flex text-xs font-bold text-indigo-600 hover:text-indigo-800">
          Work the task list →
        </Link>
      </Card>

      {proactivePrompts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Do these now — tap to execute</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {proactivePrompts.map((p) => (
              <Link
                key={p.id}
                to={p.href}
                className="os-card-interactive rounded-xl border-2 border-indigo-200 bg-white px-3 py-3 text-sm font-bold leading-snug text-indigo-950 shadow-sm transition hover:border-indigo-400"
              >
                {p.prompt}
                <span className="mt-1 block text-[11px] font-semibold text-indigo-600">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

        </>
      )}

      <section className="space-y-3">
        <SectionLabel n="2">Actions — reply, complete, send, approve</SectionLabel>
        <p className="-mt-1 mb-2 max-w-3xl text-xs leading-relaxed text-slate-600">
          Open loops only: each card shows <span className="font-semibold text-slate-800">waiting vs escalating</span>{' '}
          (T+24h reminder tier · T+72h escalation). System actions log progress and reset the clock — same thresholds a
          job runner would use server-side.
        </p>
        <div className={cn('grid gap-4', showFullPulse ? 'xl:grid-cols-12' : 'xl:grid-cols-1')}>
          <Card
            className={cn(
              'os-card p-5 shadow-md ring-1 ring-slate-900/[0.04] duration-200 xl:ring-2 xl:ring-indigo-900/[0.06]',
              showFullPulse ? 'xl:col-span-8' : 'xl:col-span-1'
            )}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {expandPriority ? 'Full priority queue' : 'Top 3 — non-negotiable'}
                </h2>
                <p className="text-sm text-slate-500">
                  Impact and time pressure first — then one primary action. Use quick actions when the work is already
                  done.
                </p>
              </div>
              <Badge variant="neutral" className="font-bold">
                {expandPriority ? `Showing all ${priorityQueue.length}` : `Top ${Math.min(PRIORITY_PREVIEW, priorityQueue.length)} of ${priorityQueue.length}`}
              </Badge>
            </div>
            <ul className={cn('grid gap-2', mustFocus && !showFullPulse ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
              {visiblePriority.map((item) => (
                <li
                  key={item.id}
                  className={`flex h-full flex-col rounded-xl border p-3 transition hover:shadow-md ${priorityTierCardClass(item.tier)}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {priorityTierGlyph(item.tier)}{' '}
                    {item.tier === 'critical' ? 'Urgent' : item.tier === 'important' ? 'Attention' : 'Routine'}
                  </span>
                  <span className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">{item.title}</span>
                  {item.subtitle && <span className="mt-0.5 text-xs text-slate-600">{item.subtitle}</span>}
                  {item.temporalLine && (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-amber-900/90">{item.temporalLine}</p>
                  )}
                  {item.impactLine && (
                    <p className="mt-1.5 text-xs font-semibold leading-snug text-rose-900/95">
                      <span className="text-rose-700">If you do nothing: </span>
                      {item.impactLine}
                    </p>
                  )}
                  {item.ownership && (
                    <span className="mt-2 block rounded-lg bg-white/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                      Who owes what: {item.ownership}
                    </span>
                  )}
                  {item.loopKind && (
                    <div className="mt-2 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-2 ring-1 ring-slate-900/[0.03]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={item.executionPhase === 'escalating' ? 'danger' : 'warning'}
                          className="text-[10px] font-bold"
                        >
                          {item.executionPhase === 'escalating' ? 'Escalating loop' : 'Waiting loop'} · tier{' '}
                          {item.loopTier}
                        </Badge>
                        {item.loopTimerLabel && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {item.loopTimerLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] font-semibold capitalize text-slate-700">
                        Loop: {item.loopKind}
                      </p>
                      {item.autoNextLabel && (
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">{item.autoNextLabel}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {item.quickAction?.kind === 'complete_task' && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full shrink-0 border-slate-200 text-xs font-bold sm:w-auto"
                        onClick={() => completeTask(item.quickAction!.taskId)}
                      >
                        {item.quickAction.label}
                      </Button>
                    )}
                    {item.loopSystemActionLabel && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full shrink-0 border-indigo-200 bg-indigo-50/80 text-xs font-bold text-indigo-950 sm:w-auto"
                        onClick={() => advanceExecutionLoop(item.id)}
                      >
                        {item.loopSystemActionLabel}
                      </Button>
                    )}
                    <Link
                      to={item.href}
                      className={cn(
                        'inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700',
                        item.quickAction && 'sm:min-w-[140px]'
                      )}
                    >
                      {item.suggestedAction}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            {priorityQueue.length > PRIORITY_PREVIEW && (
              <button
                type="button"
                onClick={() => setExpandPriority((e) => !e)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {expandPriority ? 'Show fewer items' : `View all ${priorityQueue.length} queued items`}
              </button>
            )}
          </Card>
          {showFullPulse && (
          <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.03] xl:col-span-4">
            <h2 className="text-base font-bold text-slate-900">Briefing</h2>
            <p className="mt-1 text-xs text-slate-500">Auto-generated from live delivery and billing signals.</p>
            <ul className="mt-4 space-y-3">
              {visibleInsights.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {insights.length > INSIGHT_PREVIEW && (
              <button
                type="button"
                onClick={() => setExpandInsights((e) => !e)}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {expandInsights ? 'Show less' : 'Read full briefing'}
              </button>
            )}
          </Card>
          )}
        </div>
        {showFullPulse && (
        <p className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-800">Soft guidance · </span>
          {softHint}
        </p>
        )}
      </section>

      {showFullPulse && (
        <>
      <section className="space-y-3">
        <SectionLabel n="3">Work overview — projects, tasks, pipeline</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">Engagements at risk</h2>
              <Link to="/projects" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                All projects
              </Link>
            </div>
            <p className="text-xs text-slate-500">Sorted by delivery health — scope, burn, and client replies.</p>
            <ul className="mt-4 space-y-3">
              {healthRankedProjects.map((p) => {
                const pct = Math.min(100, (p.spent / p.budget) * 100);
                const hl = projectHealthLevel(store, p.id);
                return (
                  <li key={p.id}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-slate-800">
                      <Link to={`/projects/${p.id}`} className="truncate text-indigo-700 hover:text-indigo-900">
                        {p.name}
                      </Link>
                      <span className="flex items-center gap-2">
                        <Badge variant={projectHealthBadgeVariant(hl)} className="shrink-0 text-[10px]">
                          {projectHealthLabel(hl)}
                        </Badge>
                        <span className="tabular-nums text-slate-500">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <ProgressBar value={pct} max={100} />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">Next on your task list</h2>
              <Link to="/tasks" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                Open tasks
              </Link>
            </div>
            <p className="text-xs text-slate-500">Clear work in place — mark done without leaving the pulse view.</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {visibleTasks.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">No open tasks — nice, or add one from Quick create.</li>
              ) : (
                visibleTasks.map((t) => {
                  const proj = store.projects[t.projectId];
                  return (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                        <p className="text-xs text-slate-500">
                          {proj ? (
                            <Link to={`/projects/${proj.id}`} className="text-indigo-600 hover:underline">
                              {proj.name}
                            </Link>
                          ) : (
                            'Project'
                          )}{' '}
                          · due {t.due}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 text-xs font-semibold"
                        onClick={() => completeTask(t.id)}
                      >
                        Mark complete
                      </Button>
                    </li>
                  );
                })
              )}
            </ul>
            {openTasks.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandTasks((e) => !e)}
                className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {expandTasks ? 'Show top 5 only' : `View all ${openTasks.length} open tasks`}
              </button>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Pipeline</h3>
              <Link to="/pipeline" className="text-xs font-semibold text-indigo-600">
                Board
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {pipelineCols.slice(0, 4).map(({ stage, count, value }) => (
                <div key={stage} className="min-w-[100px] flex-1 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{stage}</p>
                  <p className="text-sm font-bold text-slate-900">{count}</p>
                  <p className="text-[10px] text-slate-500">${(value / 1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Client threads</h3>
              <Link to="/messages" className="text-xs font-semibold text-indigo-600">
                Reply
              </Link>
            </div>
            <ul className="space-y-2">
              {threads.slice(0, MESSAGE_PREVIEW).map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-100 px-2 py-1.5">
                  <Link to="/messages" className="block text-xs hover:bg-slate-50/80">
                    <span className="font-semibold text-slate-900">{t.participant}</span>
                    <span className="mt-0.5 block line-clamp-1 text-slate-500">{t.preview}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Milestones</h3>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Internal</span>
            </div>
            <ul className="space-y-1.5">
              {deadlines.slice(0, DEADLINE_PREVIEW).map((d) => (
                <li key={d.id} className="flex justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800">{d.title}</span>
                  <Badge variant="neutral" className="shrink-0 text-[10px]">
                    {d.when}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel n="4">Money — cash & receivables</SectionLabel>
        <Card className="os-card border-slate-200/90 p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-base font-bold text-slate-900">Progress you can feel</h2>
          <p className="mt-1 text-xs text-slate-500">
            Finish lines, not just fields — small wins here make tomorrow’s login lighter.
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                <span>This week — tasks completed</span>
                <span className="tabular-nums">
                  {weeklyDone} closed this week · soft benchmark {weeklyTarget}
                </span>
              </div>
              <ProgressBar value={Math.min(weeklyDone, weeklyTarget)} max={weeklyTarget || 1} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                <span>Recognized cash vs. soft monthly goal</span>
                <span className="tabular-nums">{revGoal.pct}%</span>
              </div>
              <ProgressBar
                value={Math.min(revGoal.collected, revGoal.goal)}
                max={revGoal.goal || 1}
                barClassName="from-emerald-500 to-teal-400"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                ${revGoal.collected.toLocaleString()} of ~${revGoal.goal.toLocaleString()} — celebrate when the bar crosses.
              </p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            tone="revenue"
            label="Collected"
            value={`$${paidMonth.toLocaleString()}`}
            hint="Cash you’ve already banked"
            icon={DollarSign}
          />
          <MetricCard
            tone="risk"
            label="Outstanding AR"
            value={`$${outstanding.toLocaleString()}`}
            hint={
              overdue > 0
                ? `Follow up on ${overdue} past-due invoice${overdue === 1 ? '' : 's'}`
                : 'Nothing overdue — stay ahead of AR'
            }
            icon={DollarSign}
          />
          <MetricCard
            label="Pipeline"
            value={`$${(m.pipelineValue / 1000).toFixed(0)}k`}
            hint={`${m.leadCount} opps in play`}
            icon={TrendingUp}
          />
          <MetricCard
            label="Ready to invoice"
            value={String(m.draftInvoices)}
            hint="Drafts waiting to send"
            icon={FolderKanban}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.04]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Revenue health</h2>
                <p className="text-sm text-slate-500">Collected vs. still outstanding on your books.</p>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    revenueHealth.tone === 'critical' ? 'danger' : revenueHealth.tone === 'watch' ? 'warning' : 'success'
                  }
                  className="font-bold"
                >
                  {revenueHealth.label}
                </Badge>
                <p className="mt-1 max-w-[220px] text-xs text-slate-600">{revenueHealth.detail}</p>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                  <span>Collected</span>
                  <span>${paidMonth.toLocaleString()}</span>
                </div>
                <ProgressBar value={paidMonth} max={paidMonth + outstanding || 1} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                  <span>Outstanding</span>
                  <span>${outstanding.toLocaleString()}</span>
                </div>
                <ProgressBar
                  value={outstanding}
                  max={paidMonth + outstanding || 1}
                  barClassName="from-amber-500 to-amber-400"
                />
              </div>
            </div>
            {(unreadThreads > 0 || blockedTasks > 0 || onHold > 0) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                {unreadThreads > 0 && (
                  <Link
                    to="/messages"
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 font-semibold text-indigo-800 hover:bg-indigo-100"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Reply to {unreadThreads} thread{unreadThreads === 1 ? '' : 's'}
                  </Link>
                )}
                {blockedTasks > 0 && (
                  <Link
                    to="/tasks"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Unblock {blockedTasks} task{blockedTasks === 1 ? '' : 's'}
                  </Link>
                )}
                {onHold > 0 && (
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Review {onHold} on-hold project{onHold === 1 ? '' : 's'}
                  </Link>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-md ring-1 ring-slate-900/[0.04]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">Accounts & billing</h2>
              <Link to="/clients" className="text-sm font-semibold text-indigo-600">
                All clients
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Health</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.slice(0, 5).map((c) => {
                    const ch = clientHealthLevel(store, c.id);
                    return (
                      <tr key={c.id} className="transition hover:bg-slate-50/80">
                        <td className="px-3 py-2">
                          <Link to={`/clients/${c.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-slate-500">{c.company}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={clientHealthBadgeVariant(ch)} className="text-[10px]">
                            {clientHealthLabel(ch)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {c.balance > 0 ? `$${c.balance.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Open invoices</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {openInvoices.map((i) => (
                  <Link
                    key={i.id}
                    to={`/invoices/${i.id}`}
                    className="flex min-w-[160px] flex-1 items-center justify-between rounded-xl border border-slate-100 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{i.number}</p>
                      <p className="text-xs text-slate-500">${i.amount.toLocaleString()}</p>
                    </div>
                    <Badge variant={invoiceStatusBadgeVariant(i.status)}>{i.status}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel n="+">Chain the next move</SectionLabel>
        <Card className="border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm ring-1 ring-indigo-900/[0.04]">
          <p className="text-sm text-slate-700">
            One action should lead to the next — pick what keeps delivery and cash moving.
          </p>
          <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {chainedSteps.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.href}
                  className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80"
                >
                  {s.label}
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionLabel n="5">Close — leave with confidence</SectionLabel>
        <Card
          className={`os-card p-5 shadow-md ring-1 transition duration-200 ${
            closure.allClear
              ? 'border-emerald-200 bg-emerald-50/70 ring-emerald-900/10'
              : 'border-slate-200 bg-white ring-slate-900/[0.04]'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {closure.allClear ? 'You’re clear — nothing critical is open' : 'Exit check — a few signals still need you'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {closure.allClear
                  ? 'The studio isn’t hiding fires. You can step away or spend time on growth instead of firefighting.'
                  : 'Resolve or schedule the amber items so your next login feels like continuity, not Groundhog Day.'}
              </p>
            </div>
            {closure.allClear && (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">All caught up</span>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {closure.lines.map((line, i) => (
              <li
                key={i}
                className={`flex gap-2 text-sm ${line.ok ? 'font-medium text-emerald-900' : 'font-medium text-amber-900'}`}
              >
                <span className="shrink-0">{line.ok ? '✓' : '·'}</span>
                {line.text}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionLabel n="·">Activity — supporting context</SectionLabel>
        <Card className="os-card p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">Recent workspace moves</h2>
            <button
              type="button"
              onClick={() => setExpandActivity((e) => !e)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {expandActivity ? 'Show less' : 'Show full history'}
            </button>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {visibleActivity.map((a) => (
              <li key={a.id} className="py-2 text-sm text-slate-600 first:pt-0">
                <span className="font-medium text-slate-800">{a.title}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{a.timeLabel}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
        </>
      )}
    </DashboardLayout>
  );
}
