import type { RootState } from '@/store/root-state';
import * as sel from '@/store/selectors';
import { applyExecutionLoopLayer } from '@/lib/execution-engine';

export type PriorityTier = 'critical' | 'important' | 'normal';

export type PriorityQueueItem = {
  id: string;
  tier: PriorityTier;
  title: string;
  subtitle?: string;
  /** Who owes the next move — “you”, client, or both */
  ownership?: string;
  /** Cost of inaction — loss framing */
  impactLine?: string;
  /** Time as force — overdue by N days, due today, etc. */
  temporalLine?: string;
  /** One-tap execution on Pulse without hunting */
  quickAction?: PriorityQuickAction;
  /** Closed-loop execution — waiting vs escalating (Handled = item not in queue) */
  loopKind?: 'revenue' | 'communication' | 'delivery';
  executionPhase?: 'waiting' | 'escalating';
  loopTier?: 1 | 2 | 3;
  loopTimerLabel?: string;
  /** System-recognized advance step (resets tier clock in demo) */
  loopSystemActionLabel?: string;
  /** What happens if nobody touches the loop */
  autoNextLabel?: string;
  /** Imperative next step — “assistant” copy */
  suggestedAction: string;
  href: string;
};

export type ProjectHealthLevel = 'healthy' | 'at_risk' | 'blocked';
export type ClientHealthLevel = 'strong' | 'needs_attention' | 'at_risk';

export function daysSinceIso(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

export function hoursSinceIso(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 3600000);
}

/** Display due dates in seeds are often "Apr 12" — anchor to current calendar year. */
function parseLooseDueDate(display: string): Date | null {
  const d = display.trim();
  if (!d || d === '—') return null;
  const y = new Date().getFullYear();
  const t = Date.parse(`${d}, ${y}`);
  if (!Number.isNaN(t)) return new Date(t);
  const t2 = Date.parse(d);
  if (!Number.isNaN(t2)) return new Date(t2);
  return null;
}

/** Days past due for display strings; null if unparseable or not yet due. */
export function daysPastDueDisplay(dueDateDisplay: string): number | null {
  const due = parseLooseDueDate(dueDateDisplay);
  if (!due) return null;
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

export type PriorityQuickAction = { kind: 'complete_task'; taskId: string; label: string };

export function projectHealthLevel(state: RootState, projectId: string): ProjectHealthLevel {
  const p = state.projects[projectId];
  if (!p) return 'healthy';
  const tasks = sel.getTasksForProject(state, projectId);
  if (tasks.some((t) => t.status === 'Blocked')) return 'blocked';
  if (p.spent > p.budget) return 'blocked';
  const invs = sel.getInvoicesForProject(state, projectId);
  if (invs.some((i) => i.status === 'Overdue')) return 'blocked';
  const pct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
  const unread = sel.getThreadsForProject(state, projectId).some((th) => th.status === 'Unread');
  const dueTodayOpen = tasks.some((t) => t.status !== 'Done' && t.due === 'Today');
  if (pct >= 88 || unread || dueTodayOpen || p.status === 'On Hold') return 'at_risk';
  return 'healthy';
}

export function clientHealthLevel(state: RootState, clientId: string): ClientHealthLevel {
  const c = state.clients[clientId];
  if (!c) return 'strong';
  const overdue = sel.getInvoicesForClient(state, clientId).some((i) => i.status === 'Overdue');
  const projects = sel.getProjectsForClient(state, clientId);
  const anyBlocked = projects.some((p) => projectHealthLevel(state, p.id) === 'blocked');
  const anyAtRisk = projects.some((p) => projectHealthLevel(state, p.id) === 'at_risk');
  const unread = sel.getThreadsForClient(state, clientId).filter((t) => t.status === 'Unread').length;
  const stale = daysSinceIso(c.updatedAt) >= 10;
  if (overdue || anyBlocked || (c.balance > 0 && overdue)) return 'at_risk';
  if (c.balance > 0 || unread > 0 || anyAtRisk || stale) return 'needs_attention';
  return 'strong';
}

export function projectHealthLabel(level: ProjectHealthLevel): string {
  if (level === 'blocked') return 'Blocked';
  if (level === 'at_risk') return 'Needs care';
  return 'On track';
}

export function clientHealthLabel(level: ClientHealthLevel): string {
  if (level === 'at_risk') return 'Needs care';
  if (level === 'needs_attention') return 'Check in';
  return 'In good shape';
}

/** Longest quiet period across project threads (hours since last thread update). */
export function hoursSinceLastProjectThreadActivity(state: RootState, projectId: string): number | null {
  const threads = sel.getThreadsForProject(state, projectId);
  if (!threads.length) return null;
  let maxH = 0;
  for (const th of threads) {
    maxH = Math.max(maxH, hoursSinceIso(th.updatedAt));
  }
  return maxH;
}

export function buildPriorityQueue(state: RootState, limit = 14): PriorityQueueItem[] {
  const items: PriorityQueueItem[] = [];

  for (const inv of sel.getOverdueInvoices(state)) {
    const client = state.clients[inv.clientId];
    const daysLate = daysPastDueDisplay(inv.dueDate);
    const latePhrase =
      daysLate != null && daysLate > 0
        ? `Overdue by ${daysLate} day${daysLate === 1 ? '' : 's'}`
        : 'Past terms — clock is running';
    items.push({
      id: `crit-inv-${inv.id}`,
      tier: 'critical',
      title: `Let’s follow up on ${inv.number} — $${inv.amount.toLocaleString()} is waiting`,
      subtitle: client ? `${client.name} · ${client.company}` : undefined,
      ownership: 'You → client: collect payment',
      temporalLine: `${latePhrase} · due ${inv.dueDate}`,
      impactLine: `About $${inv.amount.toLocaleString()} loses leverage every idle day — write-offs and awkward calls start here.`,
      suggestedAction: 'Send a friendly payment reminder',
      href: `/invoices/${inv.id}`,
    });
  }

  const blocked = sel.getBlockedTasks(state);
  const byProj = new Map<string, typeof blocked>();
  for (const t of blocked) {
    const list = byProj.get(t.projectId) ?? [];
    list.push(t);
    byProj.set(t.projectId, list);
  }
  for (const [pid, tasks] of byProj) {
    const proj = state.projects[pid];
    if (!proj) continue;
    if (tasks.length >= 2) {
      items.push({
        id: `crit-block-bulk-${pid}`,
        tier: 'critical',
        title: `${tasks.length} tasks are stuck on “${proj.name}”`,
        subtitle: 'Delivery is probably waiting on the client',
        ownership: 'You + client: unblock inputs',
        temporalLine: `Blocked work — timeline slips while this waits`,
        impactLine: `Milestones on “${proj.name}” don’t pause politely; idle blockers become refund conversations.`,
        suggestedAction: 'Unblock together — message the client',
        href: `/projects/${pid}`,
      });
    } else {
      const t = tasks[0]!;
      items.push({
        id: `crit-block-${t.id}`,
        tier: 'critical',
        title: `“${t.title}” is blocked — ${proj.name} can’t move`,
        subtitle: proj.name,
        ownership: 'You + client: remove blocker',
        temporalLine: `Blocked — delivery is frozen until this clears`,
        impactLine: `Every day this stays blocked, downstream dates quietly lie to the client.`,
        suggestedAction: 'Escalate or get what you need from the client',
        href: `/projects/${pid}`,
      });
    }
  }

  for (const ct of sel.getPendingContracts(state)) {
    const client = state.clients[ct.clientId];
    const quiet = daysSinceIso(ct.updatedAt);
    items.push({
      id: `crit-ct-${ct.id}`,
      tier: 'critical',
      title: `Let’s get ${ct.title} signed`,
      subtitle: client?.company ? `${client.company}${ct.sentDate ? ` · sent ${ct.sentDate}` : ''}` : ct.sentDate ? `Sent ${ct.sentDate}` : undefined,
      ownership: 'Client → you: signature in flight',
      temporalLine: quiet >= 3 ? `No signature movement in ${quiet} days` : 'Awaiting signature — stall kills momentum',
      impactLine: `Without ink, scope and billing stay fuzzy — you absorb downside if work runs ahead of paper.`,
      suggestedAction: 'Nudge the signer or resend the packet',
      href: '/contracts',
    });
  }

  for (const th of sel.getUnreadThreads(state).slice(0, 6)) {
    const proj = state.projects[th.projectId];
    const h = hoursSinceIso(th.updatedAt);
    const timePush =
      h < 36
        ? `Waiting on you ~${Math.max(1, h)}h`
        : `No outbound reply in ${Math.max(1, Math.floor(h / 24))} day${Math.floor(h / 24) === 1 ? '' : 's'}`;
    items.push({
      id: `crit-msg-${th.id}`,
      tier: 'critical',
      title: `Client awaiting reply — ${th.participant}`,
      subtitle: proj ? proj.name : undefined,
      ownership: 'You owe: reply',
      temporalLine: timePush,
      impactLine: 'Slow replies read as deprioritized — trust erodes before you notice.',
      suggestedAction: 'Reply in inbox',
      href: '/messages',
    });
  }

  const dueToday = sel.getTasksDueToday(state).filter((t) => t.status !== 'Done');
  for (const t of dueToday.slice(0, 3)) {
    const proj = state.projects[t.projectId];
    items.push({
      id: `imp-due-${t.id}`,
      tier: 'important',
      title: `Needs attention today — “${t.title}”`,
      subtitle: proj?.name,
      ownership: 'You owe: ship or reset expectations',
      temporalLine: 'Due today — becomes tomorrow’s emergency if you defer',
      impactLine: 'Missed “today” promises compound — one slip reshapes how reliable you feel.',
      quickAction: { kind: 'complete_task', taskId: t.id, label: 'Mark done (if shipped)' },
      suggestedAction: 'Ship it or reset the deadline with the client',
      href: proj ? `/projects/${proj.id}` : '/tasks',
    });
  }

  for (const p of sel.projectsList(state)) {
    if (p.status === 'Live') continue;
    const pct = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
    if (pct >= 80 && pct < 88) {
      const client = state.clients[p.clientId];
      items.push({
        id: `imp-burn-${p.id}`,
        tier: 'important',
        title: `Scope may be tight — “${p.name}” at ${Math.round(pct)}% burn`,
        subtitle: client?.company,
        ownership: 'You owe: scope conversation',
        temporalLine: `${Math.round(pct)}% budget consumed — little buffer left`,
        impactLine: 'Silent burn turns into free work — margin dies before anyone says “change order.”',
        suggestedAction: 'Align on scope or a change order before it’s awkward',
        href: `/projects/${p.id}`,
      });
    }
  }

  for (const c of sel.clientsList(state)) {
    const quiet = daysSinceIso(c.updatedAt);
    if (quiet >= 10 && c.status === 'Active') {
      items.push({
        id: `imp-stale-${c.id}`,
        tier: 'important',
        title: `${c.company} hasn’t heard from you in ${quiet} days`,
        subtitle: 'Quiet accounts drift to competitors',
        ownership: 'You owe: touchpoint',
        temporalLine: `${quiet} days since meaningful touch — relationship cooling`,
        impactLine: 'Accounts go quiet before they churn — re‑engagement is cheaper now than after a surprise.',
        suggestedAction: 'Schedule a light check-in',
        href: `/clients/${c.id}`,
      });
    }
  }

  const proposalsWaiting = sel.leadsList(state).filter((l) => l.stage === 'Proposal Sent');
  for (const l of proposalsWaiting.slice(0, 2)) {
    const idle = daysSinceIso(l.updatedAt);
    items.push({
      id: `imp-prop-${l.id}`,
      tier: 'important',
      title: `Proposal out — ${l.company}`,
      subtitle: `$${l.value.toLocaleString()} · ${l.nextAction}`,
      ownership: 'You owe: decision call or nudge',
      temporalLine:
        idle >= 5
          ? `Deal untouched ${idle} days — proposals die in inbox`
          : idle >= 2
            ? `${idle} days since last move on this deal`
            : 'Decision pending — momentum is perishable',
      impactLine: `~$${l.value.toLocaleString()} in play — every silent week trains the client to say “not a priority.”`,
      suggestedAction: 'Follow up for decision',
      href: '/pipeline',
    });
  }

  const draftN = sel.getDraftInvoiceCount(state);
  if (draftN > 0) {
    items.push({
      id: 'norm-drafts',
      tier: 'normal',
      title: `${draftN} invoice${draftN === 1 ? '' : 's'} ready to send`,
      subtitle: 'Cash lands faster when bills go out the same day',
      ownership: 'You owe: bill for work done',
      temporalLine: 'Drafts age — clients pay slower when billing lags delivery',
      impactLine: 'Unsent invoices are interest‑free loans to your clients.',
      suggestedAction: 'Review and send while work is fresh',
      href: '/invoices',
    });
  }

  for (const p of sel.getOnHoldProjects(state).slice(0, 2)) {
    items.push({
      id: `norm-hold-${p.id}`,
      tier: 'normal',
      title: `“${p.name}” is on hold`,
      subtitle: 'Stalls quietly turn into awkward client conversations',
      ownership: 'You owe: status update',
      temporalLine: 'On hold — schedules drift unless you reset expectations',
      impactLine: 'Holds without narrative become “they ghosted us” stories on their side.',
      suggestedAction: 'Update the client or timeline',
      href: `/projects/${p.id}`,
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'ok',
      tier: 'normal',
      title: 'Nothing urgent in the queue',
      subtitle: 'Great moment to push pipeline or deepen a client',
      ownership: 'You: pick next growth move',
      temporalLine: 'No critical clock running right now',
      impactLine: 'Calm is temporary — feed the pipeline before urgency picks for you.',
      suggestedAction: 'Open pipeline and pick your next win',
      href: '/pipeline',
    });
  }

  const tierOrder = (t: PriorityTier) => (t === 'critical' ? 0 : t === 'important' ? 1 : 2);
  items.sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier));

  const seen = new Set<string>();
  const out: PriorityQueueItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out.map((it) => applyExecutionLoopLayer(state, it));
}

/** Tier counts for the dashboard “instant clarity” strip (uses same ranking as the queue). */
export function priorityQueueStats(state: RootState) {
  const q = buildPriorityQueue(state, 250);
  return {
    critical: q.filter((i) => i.tier === 'critical').length,
    important: q.filter((i) => i.tier === 'important').length,
    normal: q.filter((i) => i.tier === 'normal').length,
  };
}

export function buildAutomatedInsights(state: RootState): string[] {
  const lines: string[] = [];
  const overdue = sel.getOverdueInvoices(state);
  const overdueSum = overdue.reduce((s, i) => s + i.amount, 0);
  if (overdue.length > 0) {
    lines.push(
      `About $${overdueSum.toLocaleString()} is past due across ${overdue.length} invoice${overdue.length === 1 ? '' : 's'} — a gentle nudge usually beats silence.`
    );
  }

  const atRiskProjects = sel.projectsList(state).filter((p) => projectHealthLevel(state, p.id) !== 'healthy');
  if (atRiskProjects.length > 0) {
    lines.push(
      `${atRiskProjects.length} engagement${atRiskProjects.length === 1 ? '' : 's'} need a little extra care — small decisions now prevent big apologies later.`
    );
  }

  const paid = sel.invoicesList(state).filter((i) => i.status === 'Paid');
  const paidSum = paid.reduce((s, i) => s + i.amount, 0);
  const openLeads = sel.leadsList(state).filter((l) => l.stage !== 'Won' && l.stage !== 'Lost').length;
  if (paidSum > 0) {
    lines.push(`You’ve recognized $${paidSum.toLocaleString()} in paid work — ${openLeads} opportunit${openLeads === 1 ? 'y' : 'ies'} still in play.`);
  }

  const unread = sel.getUnreadThreads(state).length;
  if (unread > 0) {
    lines.push(`${unread} thread${unread === 1 ? '' : 's'} are emotionally “open loops” for clients — closing them builds trust.`);
  }

  if (lines.length === 0) {
    lines.push('Cash and delivery look steady — a good day to push one pipeline conversation or deepen a favorite client.');
  }

  return lines.slice(0, 5);
}

export type RevenueHealthSnapshot = {
  label: string;
  tone: 'healthy' | 'watch' | 'critical';
  detail: string;
};

export function revenueHealthSnapshot(state: RootState): RevenueHealthSnapshot {
  const overdue = sel.getOverdueInvoices(state);
  const outstanding = sel.getOutstandingInvoicesAmount(state);
  const paid = sel.getRevenueFromPaidInvoices(state);
  if (overdue.length >= 3 || overdue.reduce((s, i) => s + i.amount, 0) > 5000) {
    return {
      label: 'Cash deserves a focus block',
      tone: 'critical',
      detail: `${overdue.length} overdue · $${outstanding.toLocaleString()} still out — let’s work it kindly but consistently`,
    };
  }
  if (overdue.length > 0 || outstanding > paid * 0.25) {
    return {
      label: 'Keep an eye on collections',
      tone: 'watch',
      detail: `$${outstanding.toLocaleString()} open — staying ahead beats chasing later`,
    };
  }
  return {
    label: 'Revenue feels under control',
    tone: 'healthy',
    detail: `$${paid.toLocaleString()} collected — AR isn’t nagging you this week`,
  };
}
