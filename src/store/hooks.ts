import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

/** Future: replace with `useClients()` that fetches from API and hydrates the store. */
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
      pipelineCols: sel.getPipelineColumnStats(s),
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
