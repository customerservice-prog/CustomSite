import type { Invoice } from '@/lib/types/entities';
import type { RootState } from '@/store/root-state';

/** Unpaid invoice statuses that count toward client open balance. */
export function invoiceCountsTowardBalance(i: Invoice): boolean {
  return !['Paid', 'Void'].includes(i.status);
}

export function computeClientBalance(invoices: Invoice[], clientId: string): number {
  return invoices.filter((i) => i.clientId === clientId && invoiceCountsTowardBalance(i)).reduce((s, i) => s + i.amount, 0);
}

export function computeClientLifetimeValue(invoices: Invoice[], clientId: string): number {
  return invoices.filter((i) => i.clientId === clientId && i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
}

export function clientFinancialsPatch(state: RootState, clientId: string) {
  const c = state.clients[clientId];
  if (!c) return null;
  const list = Object.values(state.invoices);
  const balance = computeClientBalance(list, clientId);
  const lifetimeValue = computeClientLifetimeValue(list, clientId);
  return {
    ...c,
    balance,
    lifetimeValue,
  };
}
