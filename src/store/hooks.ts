import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { PIPELINE_STAGES } from '@/lib/statuses';
import { buildTodayActions } from '@/lib/command-center';
import { buildAutomatedInsights, buildPriorityQueue, revenueHealthSnapshot } from '@/lib/system-intelligence';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function useClients() {
  return useAppStore(useShallow((s) => sel.clientsList(s)));
}

export function useProjects() {
  return useAppStore(useShallow((s) => sel.projectsList(s)));
}

export function useLeads() {
  return useAppStore(useShallow((s) => sel.leadsList(s)));
}

export function useTasks() {
  return useAppStore(useShallow((s) => sel.tasksList(s)));
}

export function useInvoices() {
  return useAppStore(useShallow((s) => sel.invoicesList(s)));
}

export function useFiles() {
  return useAppStore(useShallow((s) => sel.filesList(s)));
}

export function usePayments() {
  return useAppStore(useShallow((s) => sel.paymentsList(s)));
}

export function useContracts() {
  return useAppStore(useShallow((s) => sel.contractsList(s)));
}

export function useMessageThreads() {
  return useAppStore(useShallow((s) => sel.threadsList(s)));
}

export function useActivitiesFeed() {
  return useAppStore(useShallow((s) => sel.activitiesListNewestFirst(s)));
}

export function useNotifications() {
  return useAppStore(useShallow((s) => sel.notificationsList(s)));
}

export function useUnreadNotificationCount() {
  return useAppStore((s) => sel.getUnreadNotificationCount(s));
}

/** Derived from leads with useMemo — avoids useShallow + fresh row objects (would infinite-loop). */
export function usePipelineColumnStats() {
  const leads = useLeads();
  return useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => {
        const col = leads.filter((l) => l.stage === stage);
        const value = col.reduce((s, l) => s + l.value, 0);
        return { stage, count: col.length, value };
      }),
    [leads]
  );
}

export function useTodayActions(limit = 8) {
  const state = useAppStore((s) => s);
  return useMemo(() => buildTodayActions(state, limit), [state, limit]);
}

/** Derived queue must be memoized: a plain selector that allocates a new array breaks useSyncExternalStore (React #185). */
export function usePriorityQueue(limit = 14) {
  const state = useAppStore((s) => s);
  return useMemo(() => buildPriorityQueue(state, limit), [state, limit]);
}

export function useAutomatedInsights() {
  return useAppStore(useShallow((s) => buildAutomatedInsights(s)));
}

export function useRevenueHealth() {
  return useAppStore(useShallow((s) => revenueHealthSnapshot(s)));
}

export function useExpenses() {
  return useAppStore(useShallow((s) => sel.expensesList(s)));
}

export function useProjectActivities(projectId: string | undefined) {
  return useAppStore(useShallow((s) => (projectId ? sel.getActivitiesForProject(s, projectId) : [])));
}

export function useClientActivityFeed(clientId: string | undefined) {
  return useAppStore(useShallow((s) => (clientId ? sel.getActivitiesForClient(s, clientId) : [])));
}

export function useDashboardMetrics() {
  return useAppStore(
    useShallow((s) => ({
      activeClients: sel.getActiveClients(s).length,
      openProjects: sel.getOpenProjects(s).length,
      onHoldProjects: sel.getOnHoldProjects(s).length,
      pipelineValue: sel.getPipelineOpenValue(s),
      paidRevenue: sel.getRevenueFromPaidInvoices(s),
      outstanding: sel.getOutstandingInvoicesAmount(s),
      overdueCount: sel.getOverdueInvoices(s).length,
      unreadThreads: sel.getUnreadThreads(s).length,
      blockedTasks: sel.getBlockedTasks(s).length,
      draftInvoices: sel.getDraftInvoiceCount(s),
      leadCount: sel.leadsList(s).length,
      attentionCount: sel.getAttentionItemCount(s),
    }))
  );
}

export function useClient(id: string | undefined) {
  return useAppStore((s) => (id ? s.clients[id] : undefined));
}

export function useProject(id: string | undefined) {
  return useAppStore((s) => (id ? s.projects[id] : undefined));
}

export function useInvoice(id: string | undefined) {
  return useAppStore((s) => (id ? s.invoices[id] : undefined));
}
