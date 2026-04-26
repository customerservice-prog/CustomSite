import type { Contract } from '@/lib/types/entities';

export const contractsSeed: Contract[] = [
  {
    id: 'ct1',
    clientId: 'c1',
    title: 'Master Services Agreement',
    status: 'Signed',
    value: 120000,
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    updatedLabel: 'Mar 1',
  },
  {
    id: 'ct2',
    clientId: 'c5',
    title: 'SOW — Storefront',
    status: 'Sent',
    value: 92000,
    createdAt: '2026-04-10T12:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    updatedLabel: 'Apr 10',
  },
  {
    id: 'ct3',
    clientId: 'c2',
    title: 'NDA & retainer',
    status: 'Viewed',
    value: 36000,
    createdAt: '2026-04-14T12:00:00.000Z',
    updatedAt: '2026-04-14T12:00:00.000Z',
    updatedLabel: 'Apr 14',
  },
];
