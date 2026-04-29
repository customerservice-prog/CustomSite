import type { Activity } from '@/lib/types/entities';
import { DEMO_PROJECT_ID } from '@/lib/data/demo-ids';

export const activitiesSeed: Activity[] = [
  {
    id: 'a-evf-1',
    type: 'project_created',
    entityKind: 'project',
    entityId: DEMO_PROJECT_ID,
    title: 'Project “E-Commerce Site (Tables & Chairs)” opened for EventFurnish Co.',
    actorUserId: 'u1',
    createdAt: '2026-04-28T12:00:00.000Z',
    timeLabel: 'Just now',
  },
];
