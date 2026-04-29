import type {
  Activity,
  AppNotification,
  Client,
  Contract,
  AgencyFile,
  Invoice,
  Message,
  MessageThread,
  Project,
  ProjectLifecycleStage,
  Task,
} from '@/lib/types/entities';
import { daysSinceIso } from '@/lib/days-since';
import { PIPELINE_STAGES } from '@/lib/statuses';
import type { RootState } from '@/store/root-state';

export function selectUser(state: RootState, id: string) {
  return state.users[id];
}

export function selectClient(state: RootState, id: string) {
  return state.clients[id];
}

export function selectProject(state: RootState, id: string) {
  return state.projects[id];
}

export function selectInvoice(state: RootState, id: string) {
  return state.invoices[id];
}

export function clientsList(state: RootState): Client[] {
  return Object.values(state.clients).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function projectsList(state: RootState): Project[] {
  return Object.values(state.projects);
}

export function leadsList(state: RootState) {
  return Object.values(state.leads);
}

export function tasksList(state: RootState): Task[] {
  return Object.values(state.tasks);
}

export function invoicesList(state: RootState): Invoice[] {
  return Object.values(state.invoices);
}

export function filesList(state: RootState): AgencyFile[] {
  return Object.values(state.files).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function paymentsList(state: RootState) {
  return Object.values(state.payments).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function contractsList(state: RootState): Contract[] {
  return Object.values(state.contracts).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function threadsList(state: RootState): MessageThread[] {
  return Object.values(state.messageThreads).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function activitiesListNewestFirst(state: RootState): Activity[] {
  return state.activityIds.map((id) => state.activities[id]).filter(Boolean);
}

/** Activity rows that belong to this project (strict relationship graph). */
export function getActivitiesForProject(state: RootState, projectId: string): Activity[] {
  const proj = state.projects[projectId];
  if (!proj) return [];
  return activitiesListNewestFirst(state).filter((a) => {
    if (a.metadata?.projectId === projectId) return true;
    if (a.entityKind === 'project' && a.entityId === projectId) return true;
    if (a.entityKind === 'task') {
      const t = state.tasks[a.entityId];
      return t?.projectId === projectId;
    }
    if (a.entityKind === 'invoice') {
      const inv = state.invoices[a.entityId];
      return inv?.projectId === projectId;
    }
    if (a.entityKind === 'file') {
      const f = state.files[a.entityId];
      return f?.projectId === projectId;
    }
    if (a.entityKind === 'contract') {
      const ct = state.contracts[a.entityId];
      return ct?.projectId === projectId;
    }
    if (a.entityKind === 'message') {
      const tid = a.metadata?.threadId;
      if (tid) return state.messageThreads[tid]?.projectId === projectId;
    }
    return false;
  });
}

/** Everything tied to this client across projects, billing, and comms. */
export function getActivitiesForClient(state: RootState, clientId: string): Activity[] {
  return activitiesListNewestFirst(state).filter((a) => {
    if (a.metadata?.clientId === clientId) return true;
    if (a.entityId === clientId && a.entityKind === 'client') return true;
    if (a.entityKind === 'project') {
      const p = state.projects[a.entityId];
      return p?.clientId === clientId;
    }
    if (a.entityKind === 'invoice') {
      const inv = state.invoices[a.entityId];
      return inv?.clientId === clientId;
    }
    if (a.entityKind === 'contract') {
      const ct = state.contracts[a.entityId];
      return ct?.clientId === clientId;
    }
    if (a.entityKind === 'message') {
      const tid = a.metadata?.threadId;
      if (tid) return state.messageThreads[tid]?.clientId === clientId;
    }
    if (a.entityKind === 'file') {
      const f = state.files[a.entityId];
      return f?.clientId === clientId;
    }
    if (a.entityKind === 'task') {
      const t = state.tasks[a.entityId];
      const p = t ? state.projects[t.projectId] : undefined;
      return p?.clientId === clientId;
    }
    if (a.entityKind === 'lead' && a.type === 'lead_won') {
      return a.metadata?.clientId === clientId;
    }
    return false;
  });
}

export function expensesList(state: RootState) {
  return Object.values(state.expenses).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getExpensesForProject(state: RootState, projectId: string) {
  return expensesList(state).filter((e) => e.projectId === projectId);
}

export function notificationsList(state: RootState): AppNotification[] {
  return state.notificationIds.map((id) => state.notifications[id]).filter(Boolean);
}

export function getUnreadNotificationCount(state: RootState): number {
  return notificationsList(state).filter((n) => !n.read).length;
}

export function getActiveClients(state: RootState): Client[] {
  return clientsList(state).filter((c) => c.status === 'Active');
}

export function getProjectsForClient(state: RootState, clientId: string): Project[] {
  return projectsList(state).filter((p) => p.clientId === clientId);
}

export function getProjectCountForClient(state: RootState, clientId: string): number {
  return getProjectsForClient(state, clientId).length;
}

export function getOverdueInvoices(state: RootState): Invoice[] {
  return invoicesList(state).filter((i) => i.status === 'Overdue');
}

export function getOverdueInvoicesAmount(state: RootState): number {
  return getOverdueInvoices(state).reduce((s, i) => s + i.amount, 0);
}

export function getPaymentsForInvoice(state: RootState, invoiceId: string) {
  return paymentsList(state).filter((p) => p.invoiceId === invoiceId);
}

export function getRevenueFromPaidInvoices(state: RootState): number {
  return invoicesList(state).filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
}

export function getOutstandingInvoicesAmount(state: RootState): number {
  return invoicesList(state)
    .filter((i) => !['Paid', 'Void'].includes(i.status))
    .reduce((s, i) => s + i.amount, 0);
}

export function getTasksDueToday(state: RootState): Task[] {
  return tasksList(state).filter((t) => t.due === 'Today');
}

export function getBlockedTasks(state: RootState): Task[] {
  return tasksList(state).filter((t) => t.status === 'Blocked');
}

export function getUnreadThreads(state: RootState): MessageThread[] {
  return threadsList(state).filter((t) => t.status === 'Unread');
}

export function getOpenProjects(state: RootState): Project[] {
  return projectsList(state).filter((p) => p.status !== 'Live' && p.status !== 'On Hold');
}

export function getOnHoldProjects(state: RootState): Project[] {
  return projectsList(state).filter((p) => p.status === 'On Hold');
}

export function getPipelineOpenValue(state: RootState): number {
  return leadsList(state)
    .filter((l) => l.stage !== 'Lost' && l.stage !== 'Won')
    .reduce((s, l) => s + l.value, 0);
}

export function getDraftInvoiceCount(state: RootState): number {
  return invoicesList(state).filter((i) => i.status === 'Draft').length;
}

export function getAttentionItemCount(state: RootState): number {
  return (
    getOverdueInvoices(state).length +
    getUnreadThreads(state).length +
    getOnHoldProjects(state).length +
    getBlockedTasks(state).length
  );
}

export function getPendingContracts(state: RootState) {
  return Object.values(state.contracts).filter((c) => c.status === 'Sent' || c.status === 'Viewed');
}

/** Dashboard pipeline columns — uses canonical stage order */
export function getPipelineColumnStats(state: RootState) {
  return PIPELINE_STAGES.map((stage) => {
    const col = leadsList(state).filter((l) => l.stage === stage);
    const value = col.reduce((s, l) => s + l.value, 0);
    return { stage, count: col.length, value };
  });
}

export function getInvoicesForClient(state: RootState, clientId: string): Invoice[] {
  return invoicesList(state).filter((i) => i.clientId === clientId);
}

export function getContractsForClient(state: RootState, clientId: string): Contract[] {
  return Object.values(state.contracts).filter((c) => c.clientId === clientId);
}

export function getContractsForProject(state: RootState, projectId: string): Contract[] {
  return Object.values(state.contracts).filter((c) => c.projectId === projectId);
}

export function getFilesForClient(state: RootState, clientId: string): AgencyFile[] {
  return Object.values(state.files).filter((f) => f.clientId === clientId);
}

export function getThreadsForClient(state: RootState, clientId: string): MessageThread[] {
  return threadsList(state).filter((t) => t.clientId === clientId);
}

export function getMessagesForThread(state: RootState, threadId: string): Message[] {
  return Object.values(state.messages)
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getTasksForProject(state: RootState, projectId: string): Task[] {
  return tasksList(state).filter((t) => t.projectId === projectId);
}

export function getFilesForProject(state: RootState, projectId: string): AgencyFile[] {
  return Object.values(state.files).filter((f) => f.projectId === projectId);
}

export function getInvoicesForProject(state: RootState, projectId: string): Invoice[] {
  return invoicesList(state).filter((i) => i.projectId === projectId);
}

export function getThreadsForProject(state: RootState, projectId: string): MessageThread[] {
  return threadsList(state).filter((t) => t.projectId === projectId);
}

/** Hash-router paths for deep links from the activity feed */
export function getActivityHref(state: RootState, a: Activity): string | null {
  switch (a.entityKind) {
    case 'client':
      return state.clients[a.entityId] ? `/clients/${a.entityId}` : null;
    case 'project':
      return state.projects[a.entityId] ? `/projects/${a.entityId}` : null;
    case 'invoice':
      return state.invoices[a.entityId] ? `/invoices/${a.entityId}` : null;
    case 'task': {
      const t = state.tasks[a.entityId];
      return t && state.projects[t.projectId] ? `/projects/${t.projectId}` : null;
    }
    case 'message':
      return '/messages';
    case 'lead':
      return '/pipeline';
    case 'contract':
      return '/contracts';
    case 'workspace':
      return '/dashboard';
    default:
      return null;
  }
}

/** Client-site projects that should be moving but have gone quiet (agency owes a nudge). */
export function getStalledSiteProjects(state: RootState, minQuietDays = 6): Project[] {
  const active: ProjectLifecycleStage[] = ['discovery', 'proposal_contract', 'build', 'review'];
  return Object.values(state.projects).filter((p) => {
    if (p.deliveryFocus !== 'client_site') return false;
    if (!active.includes(p.lifecycleStage)) return false;
    if (p.waitingOn === 'client') return false;
    return daysSinceIso(p.updatedAt) >= minQuietDays;
  });
}
