import type { Client } from '@/lib/types/entities';

const t = '2026-04-28T12:00:00.000Z';

/** Single real workspace client — all former c1–c5 demo clients removed. */
export const clientsSeed: Client[] = [
  {
    id: 'cef1',
    name: 'EventFurnish',
    company: 'EventFurnish Co.',
    email: 'orders@eventfurnish.com',
    phone: '',
    status: 'Active',
    ownerId: 'u1',
    lifetimeValue: 0,
    balance: 0,
    createdAt: t,
    updatedAt: t,
    lastActivityLabel: 'Just now',
  },
];
