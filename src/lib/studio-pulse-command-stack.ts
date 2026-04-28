import type { RootState } from '@/store/root-state';
import * as sel from '@/store/selectors';
import { formatCurrency } from '@/lib/format-display';
import { daysPastDueDisplay } from '@/lib/system-intelligence';

export type CommandStackRow = {
  id: string;
  rank: number;
  typeLabel: string;
  title: string;
  why: string;
  href: string;
  actionLabel: string;
};

/** Five ranked “start here” items: revenue → client reply → delivery block → contract → deadline. */
export function buildCommandStackRows(state: RootState): CommandStackRow[] {
  const rows: CommandStackRow[] = [];

  const overdue = sel.getOverdueInvoices(state);
  if (overdue[0]) {
    const inv = overdue[0];
    const c = state.clients[inv.clientId];
    const days = daysPastDueDisplay(inv.dueDate);
    const dayLabel = days != null ? `${days} day${days === 1 ? '' : 's'}` : 'past';
    rows.push({
      id: `rev-${inv.id}`,
      rank: 1,
      typeLabel: 'Revenue risk',
      title: `${c?.company ?? 'Client'} · ${inv.number} is ${dayLabel} overdue`,
      why: `${formatCurrency(inv.amount)} is still open.`,
      href: `/invoices/${inv.id}`,
      actionLabel: 'Send reminder',
    });
  }

  const unreadThreads = sel.getUnreadThreads(state);
  if (unreadThreads[0]) {
    const t = unreadThreads[0];
    const c = state.clients[t.clientId];
    rows.push({
      id: `msg-${t.id}`,
      rank: 2,
      typeLabel: 'Client waiting',
      title: `${t.participant} (${c?.company ?? 'Client'}) needs a reply`,
      why: 'Unread thread — revenue and trust stall when you go quiet.',
      href: '/messages',
      actionLabel: 'Open thread',
    });
  }

  const blocked = sel.getBlockedTasks(state);
  if (blocked[0]) {
    const task = blocked[0];
    const proj = state.projects[task.projectId];
    const c = proj ? state.clients[proj.clientId] : undefined;
    rows.push({
      id: `task-${task.id}`,
      rank: 3,
      typeLabel: 'Delivery blocker',
      title: `Unblock: ${task.title}`,
      why: `${proj?.name ?? 'Project'} · ${c?.company ?? 'Client'} — delivery is stuck.`,
      href: '/tasks',
      actionLabel: 'Resolve blocker',
    });
  }

  const pendingContracts = sel.getPendingContracts(state);
  if (pendingContracts[0]) {
    const ct = pendingContracts[0];
    const c = state.clients[ct.clientId];
    rows.push({
      id: `ct-${ct.id}`,
      rank: 4,
      typeLabel: 'Contract awaiting signature',
      title: `${ct.title}`,
      why: `${c?.company ?? 'Client'} — signed agreement unlocks billing.`,
      href: '/contracts',
      actionLabel: 'Review contract',
    });
  }

  const dl = state.deadlines[0];
  if (dl) {
    rows.push({
      id: `dl-${dl.id}`,
      rank: 5,
      typeLabel: 'Upcoming deadline',
      title: dl.title,
      why: `Due ${dl.when} — keep the team aligned.`,
      href: '/calendar',
      actionLabel: 'View calendar',
    });
  }

  return rows.slice(0, 5);
}
