import type { Payment } from '@/lib/types/entities';

export const paymentsSeed: Payment[] = [
  {
    id: 'pay1',
    invoiceId: 'i3',
    clientId: 'c2',
    amount: 3600,
    status: 'completed',
    method: 'ACH',
    createdAt: '2026-04-01T14:00:00.000Z',
    processorStatus: 'settled',
    payoutStatus: 'paid_out',
  },
  {
    id: 'pay2',
    invoiceId: 'i4',
    clientId: 'c3',
    amount: 2400,
    status: 'completed',
    method: 'Card',
    createdAt: '2026-03-20T16:00:00.000Z',
    processorStatus: 'settled',
    payoutStatus: 'paid_out',
  },
  {
    id: 'pay3',
    invoiceId: 'i1',
    clientId: 'c5',
    amount: 4200,
    status: 'pending',
    method: 'Card',
    createdAt: '2026-04-24T11:00:00.000Z',
    processorStatus: 'processing',
    payoutStatus: 'scheduled',
  },
];
