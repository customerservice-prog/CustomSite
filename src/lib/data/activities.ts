import type { Activity } from '@/lib/types/entities';

export const activitiesSeed: Activity[] = [
  {
    id: 'a-evf-1',
    type: 'project_created',
    entityKind: 'project',
    entityId: 'pef1',
    title: 'Project “E-Commerce Site (Tables & Chairs)” opened for EventFurnish Co.',
    actorUserId: 'u1',
    createdAt: '2026-04-28T12:00:00.000Z',
    timeLabel: 'Just now',
  },
];
