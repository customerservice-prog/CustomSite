import type { Expense } from '@/lib/types/entities';

/** Every expense is tied to a project (and client via project). */
export const expensesSeed: Expense[] = [
  {
    id: 'ex1',
    projectId: 'p1',
    clientId: 'c1',
    vendor: 'Adobe Creative Cloud',
    category: 'Software',
    amount: 79.99,
    reimbursable: false,
    date: '2026-04-22',
    status: 'Approved',
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T12:00:00.000Z',
  },
  {
    id: 'ex2',
    projectId: 'p2',
    clientId: 'c1',
    vendor: 'United Airlines',
    category: 'Travel',
    amount: 412.5,
    reimbursable: true,
    date: '2026-04-19',
    status: 'Pending',
    createdAt: '2026-04-19T12:00:00.000Z',
    updatedAt: '2026-04-19T12:00:00.000Z',
  },
  {
    id: 'ex3',
    projectId: 'p1',
    clientId: 'c1',
    vendor: 'WeWork',
    category: 'Facilities',
    amount: 890,
    reimbursable: false,
    date: '2026-04-01',
    status: 'Approved',
    createdAt: '2026-04-01T12:00:00.000Z',
    updatedAt: '2026-04-01T12:00:00.000Z',
  },
];
