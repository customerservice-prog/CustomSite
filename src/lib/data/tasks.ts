import type { Task } from '@/lib/types/entities';

export const tasksSeed: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Homepage wireframes',
    status: 'In Progress',
    due: 'Tomorrow',
    assigneeId: 'u1',
    createdAt: '2026-04-20T12:00:00.000Z',
    updatedAt: '2026-04-24T12:00:00.000Z',
  },
  {
    id: 't2',
    projectId: 'p2',
    title: 'QA accessibility pass',
    status: 'Todo',
    due: 'Today',
    assigneeId: 'u2',
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-24T12:00:00.000Z',
  },
  {
    id: 't3',
    projectId: 'p3',
    title: 'Design system tokens',
    status: 'Blocked',
    due: 'Apr 30',
    assigneeId: 'u3',
    createdAt: '2026-04-18T12:00:00.000Z',
    updatedAt: '2026-04-23T12:00:00.000Z',
  },
  {
    id: 't4',
    projectId: 'p5',
    title: 'Discovery workshop deck',
    status: 'Done',
    due: 'Apr 20',
    assigneeId: 'u1',
    createdAt: '2026-04-10T12:00:00.000Z',
    updatedAt: '2026-04-20T12:00:00.000Z',
  },
];
