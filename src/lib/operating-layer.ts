import type { RootState } from '@/store/root-state';
import type { Invoice, MessageThread, Task } from '@/lib/types/entities';
import * as sel from '@/store/selectors';
import { daysSinceIso, projectHealthLevel, type PriorityTier } from '@/lib/system-intelligence';

const SNAPSHOT_KEY = 'studio:lastPulseSession';

export type StudioSessionSnapshot = {
  savedAt: string;
  projectStatusById: Record<string, string>;
};

export function loadStudioSnapshot(): StudioSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StudioSessionSnapshot;
    if (!p.savedAt || typeof p.projectStatusById !== 'object') return null;
    return p;
  } catch {
    return null;
  }
}

export function saveStudioSnapshot(state: RootState) {
  if (typeof window === 'undefined') return;
  const projectStatusById = Object.fromEntries(Object.values(state.projects).map((p) => [p.id, p.status]));
  const snap: StudioSessionSnapshot = {
    savedAt: new Date().toISOString(),
    projectStatusById,
  };
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota */
  }
}

/** FOMO + continuity — explicit “since you were last here” hooks. */
export function buildSinceLastVisitLines(state: RootState, prev: StudioSessionSnapshot | null): string[] {
  if (!prev) {
    return ['First session logged — next login will highlight what moved since you left.', 'Run money and inbox once today so the baseline is honest.'];
  }
  const since = new Date(prev.savedAt).getTime();
  const lines: string[] = [];

  const threadsTouched = sel.threadsList(state).filter((t) => new Date(t.updatedAt).getTime() > since);
  if (threadsTouched.length > 0) {
    const unreadMoved = threadsTouched.filter((t) => t.status === 'Unread').length;
    if (unreadMoved > 0) {
      lines.push(
        `${unreadMoved} client thread${unreadMoved === 1 ? '' : 's'} may need your reply — most agencies answer within 48 hours.`
      );
    } else {
      lines.push(
        `${threadsTouched.length} conversation${threadsTouched.length === 1 ? '' : 's'} had new activity — skim inbox so you don’t miss a decision.`
      );
    }
  }

  const teamTasksDone = Object.values(state.tasks).filter(
    (t) => t.status === 'Done' && new Date(t.updatedAt).getTime() > since
  ).length;
  if (teamTasksDone > 0) {
    lines.push(`${teamTasksDone} task${teamTasksDone === 1 ? '' : 's'} completed since you left — your delivery story is moving.`);
  }

  const newlyOverdue = sel.invoicesList(state).filter(
    (i) => i.status === 'Overdue' && new Date(i.updatedAt).getTime() > since
  );
  if (newlyOverdue.length > 0) {
    const sum = newlyOverdue.reduce((s, i) => s + i.amount, 0);
    lines.push(
      `${newlyOverdue.length} invoice${newlyOverdue.length === 1 ? '' : 's'} crossed into overdue — $${sum.toLocaleString()} is now worth a friendly follow-up.`
    );
  }

  for (const p of sel.projectsList(state)) {
    const was = prev.projectStatusById[p.id];
    if (was && was !== p.status) {
      lines.push(`Project “${p.name}” moved ${was} → ${p.status} — clients notice when phases shift; a short note builds trust.`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      'Since you were last here, nothing loud changed on the board — still worth sixty seconds on priorities so “quiet” isn’t hiding risk.'
    );
  }

  return lines.slice(0, 6);
}

export type DailyScoreboard = {
  headline: string;
  subline: string;
  tone: 'rose' | 'amber' | 'emerald';
  badge: string;
};

/** Single headline people can internalize — habit + clarity. */
export function buildDailyScoreboard(
  state: RootState,
  pStats: { critical: number; important: number }
): DailyScoreboard {
  const overdue = sel.getOverdueInvoices(state).length;
  const unread = sel.getUnreadThreads(state).length;
  const blocked = sel.getBlockedTasks(state).length;
  const attentionish = pStats.important > 0 || overdue > 0 || unread > 0 || blocked > 0;

  if (pStats.critical === 0 && !attentionish) {
    return {
      headline: "Today's status: You're all caught up",
      subline:
        'Nothing critical is competing for your headspace — you can lean into growth work or step away without FOMO.',
      tone: 'emerald',
      badge: 'Clear runway',
    };
  }

  if (pStats.critical > 0) {
    const overdueInv = sel.getOverdueInvoices(state);
    const atRisk = overdueInv.reduce((s, i) => s + i.amount, 0);
    const moneyBit =
      overdueInv.length > 0
        ? ` About $${atRisk.toLocaleString()} is already past terms — each idle day trades leverage for awkward recovery.`
        : '';
    return {
      headline: "Today's status: Urgent — handle these first",
      subline: `${pStats.critical} decision${pStats.critical === 1 ? '' : 's'} could cost cash or trust if they wait overnight.${moneyBit}`,
      tone: 'rose',
      badge: 'Needs you now',
    };
  }

  return {
    headline: "Today's status: Needs attention",
    subline: `A few things will get expensive emotionally or financially if they drift — ${pStats.important} queued plus inbox and AR to keep honest.`,
    tone: 'amber',
    badge: 'Stay sharp',
  };
}

const MS_DAY = 86400000;

export function weeklyTasksCompletedCount(state: RootState): number {
  const weekAgo = Date.now() - 7 * MS_DAY;
  return Object.values(state.tasks).filter(
    (t) => t.status === 'Done' && new Date(t.updatedAt).getTime() >= weekAgo
  ).length;
}

/** Soft benchmark — not a rule, a nudge. */
export function weeklyProductivityNudgeTarget(): number {
  return 12;
}

/** Demo “monthly recognition goal” from collected cash — feels like a finish line. */
export function revenueGoalProgress(state: RootState): { collected: number; goal: number; pct: number } {
  const collected = sel.getRevenueFromPaidInvoices(state);
  const goal = Math.max(42000, Math.round(collected * 1.12) || 42000);
  const pct = Math.min(100, Math.round((collected / goal) * 100));
  return { collected, goal, pct };
}

/** One rotating nudge — helpful, not bossy. */
export function pickSoftGuidance(state: RootState): string {
  const unread = sel.getUnreadThreads(state).length;
  const overdue = sel.getOverdueInvoices(state).length;
  const drafts = sel.getDraftInvoiceCount(state);
  const hints = [
    'Most agencies follow up within 48 hours — speed reads as care.',
    'Invoices sent the same day as approval tend to get paid faster.',
    'Weekly client updates keep scope creep visible before it’s expensive.',
  ];
  if (unread > 0) return hints[0]!;
  if (overdue > 0) return hints[1]!;
  if (drafts > 0) return hints[1]!;
  return hints[2]!;
}

/** Tasks marked Done since local midnight — micro-reward / habit signal. */
export function tasksCompletedTodayCount(state: RootState): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t0 = start.getTime();
  return Object.values(state.tasks).filter(
    (t) => t.status === 'Done' && new Date(t.updatedAt).getTime() >= t0
  ).length;
}

/** One continuous chain: lead → proposal → contract → delivery → invoice → paid */
export const LIFECYCLE_STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'contract', label: 'Contract' },
  { id: 'project', label: 'Project' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'paid', label: 'Paid' },
] as const;

/** Why order matters — consequence framing, not a dark pattern */
export const LIFECYCLE_PROGRESSION_NOTE =
  'Skipping contract → delivery → invoice → payment is how scope fights and bad debt show up. The chain is the minimum safe sequence.';

export type LifecyclePulse = {
  summary: string;
  cta: { label: string; href: string };
  /** Index into LIFECYCLE_STAGES — where the business is stuck right now */
  activeStageIndex: number;
};

export function buildLifecyclePulse(state: RootState): LifecyclePulse {
  if (sel.getOverdueInvoices(state).length > 0) {
    return {
      summary: 'Cash is stuck in the invoice leg — overdue AR breaks the whole chain.',
      cta: { label: 'Collect overdue invoices', href: '/invoices' },
      activeStageIndex: 4,
    };
  }
  if (sel.getUnreadThreads(state).length > 0) {
    return {
      summary: 'Open replies stall the lifecycle — clients assume silence means deprioritized.',
      cta: { label: 'Clear Messages', href: '/messages' },
      activeStageIndex: 3,
    };
  }
  if (sel.getBlockedTasks(state).length > 0) {
    return {
      summary: 'Delivery can’t advance until blockers clear — the project leg owns the bottleneck.',
      cta: { label: 'Unblock work', href: '/tasks' },
      activeStageIndex: 3,
    };
  }
  if (sel.getPendingContracts(state).length > 0) {
    return {
      summary: 'Signatures gate everything after — paper has to move before work bills cleanly.',
      cta: { label: 'Close pending contracts', href: '/contracts' },
      activeStageIndex: 2,
    };
  }
  const proposalLeads = sel.leadsList(state).filter((l) => l.stage === 'Proposal Sent');
  if (proposalLeads.length > 0) {
    return {
      summary: 'A proposal is in the wild — without a decision, revenue stays hypothetical.',
      cta: { label: 'Drive proposal decisions', href: '/pipeline' },
      activeStageIndex: 1,
    };
  }
  const openLeads = sel.leadsList(state).filter((l) => l.stage !== 'Won' && l.stage !== 'Lost');
  if (openLeads.length > 0) {
    return {
      summary: 'New work still lives in the pipeline — qualify and advance before it goes cold.',
      cta: { label: 'Advance a lead', href: '/pipeline' },
      activeStageIndex: 0,
    };
  }
  if (sel.getDraftInvoiceCount(state) > 0) {
    return {
      summary: 'Draft invoices are uncaptured revenue — billing is the handoff from delivery to cash.',
      cta: { label: 'Send draft invoices', href: '/invoices' },
      activeStageIndex: 4,
    };
  }
  const inReview = sel.projectsList(state).filter((p) => p.status === 'Review');
  if (inReview.length > 0) {
    return {
      summary: 'Review is the last gate before you bill with confidence — don’t let it idle.',
      cta: { label: 'Finish review', href: `/projects/${inReview[0]!.id}` },
      activeStageIndex: 3,
    };
  }
  const awaitingPayment = sel.invoicesList(state).filter((i) => i.status === 'Sent').length;
  if (awaitingPayment > 0) {
    return {
      summary: 'Invoices are out — the chain completes when money hits the bank.',
      cta: { label: 'Record payments & follow up', href: '/payments' },
      activeStageIndex: 5,
    };
  }
  return {
    summary: 'No obvious bottleneck — either deepen an account or feed the top of the funnel.',
    cta: { label: 'Open Studio Pulse', href: '/dashboard' },
    activeStageIndex: 0,
  };
}

export type ChainedStep = { id: string; label: string; href: string };

/** Default paths after common wins — reduces dead ends and browsing. */
export function buildChainedNextSteps(state: RootState, limit = 5): ChainedStep[] {
  const out: ChainedStep[] = [];
  const push = (c: ChainedStep) => {
    if (out.length >= limit) return;
    if (out.some((x) => x.id === c.id)) return;
    out.push(c);
  };

  const overdue = sel.getOverdueInvoices(state);
  if (overdue.length) {
    push({
      id: 'chain-ar',
      label: `Follow up on ${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`,
      href: `/invoices/${overdue[0]!.id}`,
    });
  }

  const unread = sel.getUnreadThreads(state);
  if (unread.length) {
    push({
      id: 'chain-msg',
      label: `Reply in Messages (${unread.length} open loop${unread.length === 1 ? '' : 's'})`,
      href: '/messages',
    });
  }

  const blocked = sel.getBlockedTasks(state);
  if (blocked.length) {
    const t = blocked[0]!;
    push({ id: 'chain-bl', label: 'Unblock a stuck task on delivery', href: `/projects/${t.projectId}` });
  }

  const drafts = sel.getDraftInvoiceCount(state);
  if (drafts > 0) {
    push({
      id: 'chain-inv',
      label: `Send ${drafts} draft invoice${drafts === 1 ? '' : 's'}`,
      href: '/invoices',
    });
  }

  const inReview = sel.projectsList(state).filter((p) => p.status === 'Review');
  if (inReview.length) {
    push({
      id: 'chain-rev',
      label: 'Advance a project out of review',
      href: `/projects/${inReview[0]!.id}`,
    });
  }

  const proposals = sel.leadsList(state).filter((l) => l.stage === 'Proposal Sent');
  if (proposals.length) {
    push({ id: 'chain-prop', label: 'Chase a decision on an open proposal', href: '/pipeline' });
  }

  if (out.length === 0) {
    push({ id: 'chain-pipe', label: 'Work the pipeline for your next win', href: '/pipeline' });
  }

  return out.slice(0, limit);
}

/** One-line “business impact” rollups for the pulse strip. */
export function buildSmartPulseRollups(state: RootState): string[] {
  const staleClients = sel.clientsList(state).filter((c) => daysSinceIso(c.updatedAt) >= 10 && c.status === 'Active');
  const atRiskProjects = sel.projectsList(state).filter((p) => projectHealthLevel(state, p.id) !== 'healthy');
  const overdue = sel.getOverdueInvoices(state);
  const overdueSum = overdue.reduce((s, i) => s + i.amount, 0);
  const unread = sel.getUnreadThreads(state).length;

  const lines: string[] = [];
  if (staleClients.length > 0) {
    lines.push(
      `${staleClients.length} client account${staleClients.length === 1 ? '' : 's'} gone quiet — follow-up protects renewals.`
    );
  }
  if (atRiskProjects.length > 0) {
    lines.push(
      `${atRiskProjects.length} engagement${atRiskProjects.length === 1 ? '' : 's'} off track — delivery or scope may slip without a decision.`
    );
  }
  if (overdue.length > 0) {
    lines.push(
      `$${overdueSum.toLocaleString()} in overdue AR — every day without a touch increases write-off risk.`
    );
  }
  if (unread > 0) {
    lines.push(
      `${unread} thread${unread === 1 ? '' : 's'} awaiting your reply — slow responses read as deprioritized clients.`
    );
  }
  return lines.slice(0, 4);
}

export type ProactivePrompt = {
  id: string;
  prompt: string;
  href: string;
  tier: PriorityTier;
};

/** Assistant-style suggested next moves (question form). */
export function buildProactivePrompts(state: RootState, limit = 5): ProactivePrompt[] {
  const out: ProactivePrompt[] = [];

  for (const inv of sel.getOverdueInvoices(state).slice(0, 2)) {
    const c = state.clients[inv.clientId];
    out.push({
      id: `prompt-inv-${inv.id}`,
      prompt: `Send a payment reminder for ${inv.number}${c ? ` to ${c.company}` : ''}`,
      href: `/invoices/${inv.id}`,
      tier: 'critical',
    });
  }

  for (const th of sel.getUnreadThreads(state).slice(0, 2)) {
    out.push({
      id: `prompt-th-${th.id}`,
      prompt: `Reply to ${th.participant} now — close the loop`,
      href: '/messages',
      tier: 'critical',
    });
  }

  const proposalLeads = sel.leadsList(state).filter((l) => l.stage === 'Proposal Sent').slice(0, 1);
  for (const l of proposalLeads) {
    out.push({
      id: `prompt-lead-${l.id}`,
      prompt: `Schedule a decision call on ${l.company}’s proposal`,
      href: '/pipeline',
      tier: 'important',
    });
  }

  const stale = sel.clientsList(state).filter((c) => daysSinceIso(c.updatedAt) >= 10 && c.status === 'Active').slice(0, 1);
  for (const c of stale) {
    out.push({
      id: `prompt-stale-${c.id}`,
      prompt: `Check in with ${c.company} — ${daysSinceIso(c.updatedAt)} days quiet`,
      href: `/clients/${c.id}`,
      tier: 'important',
    });
  }

  const seen = new Set<string>();
  const deduped: ProactivePrompt[] = [];
  for (const p of out) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    deduped.push(p);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

export type ClosureLine = { ok: boolean; text: string };

export function buildClosureLines(
  state: RootState,
  stats: { critical: number; important: number }
): { lines: ClosureLine[]; allClear: boolean } {
  const overdue = sel.getOverdueInvoices(state).length;
  const unread = sel.getUnreadThreads(state).length;
  const blocked = sel.getBlockedTasks(state).length;
  const pendingContracts = sel.getPendingContracts(state).length;

  const lines: ClosureLine[] = [
    {
      ok: stats.critical === 0,
      text:
        stats.critical === 0
          ? 'All clear on urgent work — nothing will surprise you tomorrow morning.'
          : `${stats.critical} urgent item${stats.critical === 1 ? '' : 's'} still deserve you today.`,
    },
    {
      ok: overdue === 0,
      text:
        overdue === 0
          ? 'Cash side is calm — no overdue invoices nagging your brain.'
          : `Let’s follow up on ${overdue} overdue invoice${overdue === 1 ? '' : 's'} before AR gets emotional.`,
    },
    {
      ok: unread === 0,
      text:
        unread === 0
          ? 'Every thread has a reply from you — clients feel prioritized.'
          : `${unread} client${unread === 1 ? '' : 's'} may be waiting on you — a quick note protects the relationship.`,
    },
    {
      ok: blocked === 0,
      text:
        blocked === 0
          ? 'Delivery isn’t blocked — milestones can keep moving.'
          : `${blocked} blocked task${blocked === 1 ? '' : 's'} could quietly push deadlines — unblock or reset expectations.`,
    },
    {
      ok: pendingContracts === 0,
      text:
        pendingContracts === 0
          ? 'Signatures are caught up — revenue isn’t stuck in legal limbo.'
          : `${pendingContracts} contract${pendingContracts === 1 ? '' : 's'} still need ink — nudge while it’s fresh.`,
    },
  ];

  const allClear = lines.every((l) => l.ok) && stats.important === 0;
  return { lines, allClear };
}

// --- Smart list grouping helpers (tasks / invoices / threads) ---

export type TaskDueBucket = 'blocked_or_risk' | 'today' | 'soon' | 'later';

export function taskDueBucket(task: Task): TaskDueBucket {
  if (task.status === 'Blocked') return 'blocked_or_risk';
  const d = task.due.trim().toLowerCase();
  if (d === 'today' || d === 'yesterday') return 'today';
  if (d === 'tomorrow' || d.includes('this week')) return 'soon';
  return 'later';
}

export const TASK_BUCKET_ORDER: TaskDueBucket[] = ['blocked_or_risk', 'today', 'soon', 'later'];

export const TASK_BUCKET_LABEL: Record<TaskDueBucket, string> = {
  blocked_or_risk: 'Needs attention now — delivery may slip if this waits',
  today: 'Needs attention today — ship or reset expectations together',
  soon: 'Due soon — keep momentum before it feels urgent',
  later: 'On the horizon — watch for quiet scope creep',
};

export type InvoiceLedgerGroup = 'overdue' | 'open' | 'settled';

export function invoiceLedgerGroup(inv: Invoice): InvoiceLedgerGroup {
  if (inv.status === 'Overdue') return 'overdue';
  if (inv.status === 'Paid' || inv.status === 'Void') return 'settled';
  return 'open';
}

export const INVOICE_GROUP_ORDER: InvoiceLedgerGroup[] = ['overdue', 'open', 'settled'];

export const INVOICE_GROUP_LABEL: Record<InvoiceLedgerGroup, string> = {
  overdue: 'Overdue — cash at risk until you follow up',
  open: 'Open — send, collect, or reconcile',
  settled: 'Settled — paid or void',
};

export type MessageInboxGroup = 'awaiting_you' | 'waiting_on_client' | 'recent';

export function messageInboxGroup(t: MessageThread): MessageInboxGroup {
  if (t.status === 'Unread') return 'awaiting_you';
  if (t.status === 'Waiting') return 'waiting_on_client';
  return 'recent';
}

export const MESSAGE_GROUP_ORDER: MessageInboxGroup[] = ['awaiting_you', 'waiting_on_client', 'recent'];

export const MESSAGE_GROUP_LABEL: Record<MessageInboxGroup, string> = {
  awaiting_you: 'Client may be waiting on you — reply while it’s warm',
  waiting_on_client: 'Ball is in their court — nudge if it goes quiet',
  recent: 'Cooling off — no immediate move from you',
};
