import type { Invoice } from '@/lib/types/entities';

export const invoicesSeed: Invoice[] = [
  {
    id: 'i6',
    number: 'INV-1028',
    clientId: 'c5',
    projectId: 'p5',
    status: 'Paid',
    amount: 22400,
    dueDate: 'Feb 10',
    sentDate: 'Jan 22',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-02-10T12:00:00.000Z',
  },
  {
    id: 'i1',
    number: 'INV-1042',
    clientId: 'c5',
    projectId: 'p5',
    status: 'Sent',
    amount: 4200,
    dueDate: 'May 5',
    sentDate: 'Apr 18',
    createdAt: '2026-04-10T12:00:00.000Z',
    updatedAt: '2026-04-18T12:00:00.000Z',
  },
  {
    id: 'i2',
    number: 'INV-1041',
    clientId: 'c4',
    projectId: null,
    status: 'Overdue',
    amount: 1100,
    dueDate: 'Apr 12',
    sentDate: 'Mar 28',
    createdAt: '2026-03-20T12:00:00.000Z',
    updatedAt: '2026-03-28T12:00:00.000Z',
  },
  {
    id: 'i3',
    number: 'INV-1040',
    clientId: 'c2',
    projectId: 'p3',
    status: 'Paid',
    amount: 3600,
    dueDate: 'Apr 1',
    sentDate: 'Mar 15',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
  {
    id: 'i4',
    number: 'INV-1039',
    clientId: 'c3',
    projectId: 'p4',
    status: 'Paid',
    amount: 2400,
    dueDate: 'Mar 20',
    sentDate: 'Mar 1',
    createdAt: '2026-02-15T12:00:00.000Z',
    updatedAt: '2026-03-20T12:00:00.000Z',
  },
  {
    id: 'i5',
    number: 'INV-1038',
    clientId: 'c1',
    projectId: 'p2',
    status: 'Draft',
    amount: 950,
    dueDate: '—',
    sentDate: null,
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-24T12:00:00.000Z',
  },
];

/** Next invoice number from existing records (demo). */
export function nextInvoiceNumber(invoices: Record<string, Invoice>): string {
  let max = 1000;
  for (const inv of Object.values(invoices)) {
    const m = /^INV-(\d+)$/.exec(inv.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `INV-${max + 1}`;
}
