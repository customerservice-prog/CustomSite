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
    return [
      'Starting fresh — from this visit onward we’ll remember what moved so your next login opens with “here’s what you missed.”',
      'Run the loop below once; the next time you land, we’ll lead with concrete counts (messages, cash, delivery).',
    ];
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
    return {
      headline: "Today's status: Urgent — handle these first",
      subline: `${pStats.critical} decision${pStats.critical === 1 ? '' : 's'} could cost cash or trust if they wait overnight.`,
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
      prompt: `Send a payment reminder for ${inv.number}${c ? ` to ${c.company}` : ''}?`,
      href: `/invoices/${inv.id}`,
      tier: 'critical',
    });
  }

  for (const th of sel.getUnreadThreads(state).slice(0, 2)) {
    out.push({
      id: `prompt-th-${th.id}`,
      prompt: `Reply to ${th.participant} before the thread goes stale?`,
      href: '/messages',
      tier: 'critical',
    });
  }

  const proposalLeads = sel.leadsList(state).filter((l) => l.stage === 'Proposal Sent').slice(0, 1);
  for (const l of proposalLeads) {
    out.push({
      id: `prompt-lead-${l.id}`,
      prompt: `Schedule a decision call on ${l.company}’s proposal?`,
      href: '/pipeline',
      tier: 'important',
    });
  }

  const stale = sel.clientsList(state).filter((c) => daysSinceIso(c.updatedAt) >= 10 && c.status === 'Active').slice(0, 1);
  for (const c of stale) {
    out.push({
      id: `prompt-stale-${c.id}`,
      prompt: `${c.company} hasn’t heard from you in ${daysSinceIso(c.updatedAt)} days — want to check in?`,
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
