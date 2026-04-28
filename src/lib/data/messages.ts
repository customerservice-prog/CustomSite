import type { Message, MessageThread } from '@/lib/types/entities';

export const messageThreadsSeed: MessageThread[] = [
  {
    id: 'm1',
    clientId: 'c2',
    projectId: 'p3',
    participant: 'Michael Lee',
    preview: 'Can we review the homepage copy?',
    status: 'Unread',
    updatedAt: '2026-04-25T08:48:00.000Z',
    lastActivityLabel: '12m ago',
  },
  {
    id: 'm2',
    clientId: 'c1',
    projectId: 'p1',
    participant: 'Sarah Johnson',
    preview: 'Contract signed, thanks!',
    status: 'Replied',
    updatedAt: '2026-04-25T07:00:00.000Z',
    lastActivityLabel: '2h ago',
  },
  {
    id: 'm3',
    clientId: 'c3',
    projectId: 'p4',
    participant: 'Taylor Brooks',
    preview: 'Uploading final assets now.',
    status: 'Unread',
    updatedAt: '2026-04-25T05:00:00.000Z',
    lastActivityLabel: '4h ago',
  },
  {
    id: 'm4',
    clientId: 'c5',
    projectId: 'p5',
    participant: 'Jordan Ellis',
    preview: 'Can we move kickoff to Tuesday?',
    status: 'Waiting',
    updatedAt: '2026-04-24T12:00:00.000Z',
    lastActivityLabel: '1d ago',
  },
];

export const messagesSeed: Message[] = [
  {
    id: 'cm1',
    threadId: 'm1',
    body: 'Can we review the homepage copy?',
    from: 'client',
    createdAt: '2026-04-25T08:12:00.000Z',
    timeLabel: '10:12 AM',
  },
  {
    id: 'cm2',
    threadId: 'm1',
    body: 'Yes — I’ll leave comments in Figma by EOD.',
    from: 'team',
    createdAt: '2026-04-25T08:18:00.000Z',
    timeLabel: '10:18 AM',
  },
  {
    id: 'cm3',
    threadId: 'm1',
    body: 'Perfect, thank you.',
    from: 'client',
    createdAt: '2026-04-25T08:22:00.000Z',
    timeLabel: '10:22 AM',
  },
];
