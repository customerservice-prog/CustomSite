import type { RootState } from '@/store/root-state';
import * as sel from '@/store/selectors';
import { formatCurrency } from '@/lib/format-display';
import { daysPastDueDisplay, daysSinceIso } from '@/lib/system-intelligence';

export type CommandStackRow = {
  id: string;
  rank: number;
  typeLabel: string;
  title: string;
  /** One line the operator needs to decide — no meta labels in UI */
  detail: string;
  href: string;
  actionLabel: string;
  /** Pulse primary button can open a create flow */
  pulseAction?: 'create-invoice';
};

function sortOverdueWorstFirst(state: RootState) {
  const overdue = sel.getOverdueInvoices(state);
  return [...overdue].sort((a, b) => {
    const da = daysPastDueDisplay(a.dueDate) ?? 0;
    const db = daysPastDueDisplay(b.dueDate) ?? 0;
    return db - da || b.amount - a.amount;
  });
}

/** Signed agreement on a project that still has zero invoices — happens constantly in agencies. */
function signedContractNeedingInvoice(state: RootState) {
  for (const c of Object.values(state.contracts)) {
    if (c.status !== 'Signed' || !c.projectId) continue;
    const anyForProject = sel.invoicesList(state).some((i) => i.projectId === c.projectId);
    if (!anyForProject) return c;
  }
  return undefined;
}

/** Ranked “you’re dropping balls” list: cash → inbox → blockers → bill gaps → signatures → dates. */
export function buildCommandStackRows(state: RootState): CommandStackRow[] {
  const rows: CommandStackRow[] = [];

  const overdueSorted = sortOverdueWorstFirst(state);
  if (overdueSorted.length > 0) {
    const inv = overdueSorted[0];
    const c = state.clients[inv.clientId];
    const sum = overdueSorted.reduce((s, i) => s + i.amount, 0);
    const days = daysPastDueDisplay(inv.dueDate);
    const worstLate = days != null ? `${days} day${days === 1 ? '' : 's'} late on oldest` : 'past due on oldest';
    rows.push({
      id: `rev-${inv.id}`,
      rank: 1,
      typeLabel: 'Cash you’re sitting on',
      title:
        overdueSorted.length > 1
          ? `${formatCurrency(sum)} at risk — ${overdueSorted.length} invoices overdue`
          : `${formatCurrency(sum)} at risk — ${inv.number} overdue`,
      detail: `${c?.company ?? 'Client'} · ${worstLate} (${formatCurrency(inv.amount)} on ${inv.number}).`,
      href: `/invoices/${inv.id}`,
      actionLabel: 'Send reminders',
    });
  }

  const unreadThreads = sel
    .getUnreadThreads(state)
    .slice()
    .sort((a, b) => daysSinceIso(b.updatedAt) - daysSinceIso(a.updatedAt));
  if (unreadThreads[0]) {
    const t = unreadThreads[0];
    const c = state.clients[t.clientId];
    const n = unreadThreads.length;
    const quiet = daysSinceIso(t.updatedAt);
    const quietLine = quiet >= 1 ? `No reply in ${quiet} day${quiet === 1 ? '' : 's'}. ` : '';
    rows.push({
      id: `msg-${t.id}`,
      rank: 2,
      typeLabel: 'Client waiting on you',
      title: n > 1 ? `${n} threads need your reply` : `${t.participant} is waiting on you`,
      detail: `${quietLine}${c?.company ?? 'Client'} — ${t.preview.slice(0, 72)}${t.preview.length > 72 ? '…' : ''}`,
      href: '/messages',
      actionLabel: 'Reply now',
    });
  }

  const blocked = sel.getBlockedTasks(state);
  if (blocked[0]) {
    const task = blocked[0];
    const proj = state.projects[task.projectId];
    const c = proj ? state.clients[proj.clientId] : undefined;
    const reason = task.blockerReason ? ` — ${task.blockerReason}` : '';
    rows.push({
      id: `task-${task.id}`,
      rank: 3,
      typeLabel: 'Delivery stopped',
      title: `Blocked: ${task.title}`,
      detail: `${proj?.name ?? 'Project'} · ${c?.company ?? 'Client'}${reason}`,
      href: '/tasks',
      actionLabel: 'Unblock',
    });
  }

  const stalledSites = sel.getStalledSiteProjects(state, 6);
  if (stalledSites[0]) {
    const p = stalledSites[0];
    const c = state.clients[p.clientId];
    const quiet = daysSinceIso(p.updatedAt);
    rows.push({
      id: `stall-${p.id}`,
      rank: 3.5,
      typeLabel: 'Site delivery stalled',
      title: `${p.name} — no studio touches ${quiet}+ days`,
      detail: `${c?.company ?? 'Client'} · build should be moving — you’re not marked waiting on the client.`,
      href: `/projects/${p.id}`,
      actionLabel: 'Unstick delivery',
    });
  }

  const billGap = signedContractNeedingInvoice(state);
  if (billGap) {
    const cl = state.clients[billGap.clientId];
    rows.push({
      id: `bill-${billGap.id}`,
      rank: 4,
      typeLabel: 'Billable gap',
      title: `Signed “${billGap.title}” — no invoice yet`,
      detail: `${cl?.company ?? 'Client'} · ${formatCurrency(billGap.value)} not on the ledger.`,
      href: '/invoices',
      actionLabel: 'Bill it',
      pulseAction: 'create-invoice',
    });
  }

  const pendingContracts = sel.getPendingContracts(state);
  if (pendingContracts[0]) {
    const ct = pendingContracts[0];
    const c = state.clients[ct.clientId];
    rows.push({
      id: `ct-${ct.id}`,
      rank: 5,
      typeLabel: 'Signature stuck',
      title: ct.title,
      detail: `${c?.company ?? 'Client'} — you can’t bill until this is signed.`,
      href: '/contracts',
      actionLabel: 'Chase signature',
    });
  }

  const dl = state.deadlines[0];
  if (dl) {
    rows.push({
      id: `dl-${dl.id}`,
      rank: 6,
      typeLabel: 'Date coming hard',
      title: dl.title,
      detail: `Due ${dl.when} — align the client and the team.`,
      href: '/calendar',
      actionLabel: 'Open calendar',
    });
  }

  return rows.slice(0, 5);
}
