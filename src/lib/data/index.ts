import type {
  Activity,
  AgencyFile,
  AppNotification,
  Client,
  Contract,
  EntityMap,
  Expense,
  Invoice,
  Lead,
  Message,
  MessageThread,
  Payment,
  Project,
  Task,
  User,
} from '@/lib/types/entities';
import { computeClientBalance, computeClientLifetimeValue } from '@/lib/domain-sync';
import { activitiesSeed } from '@/lib/data/activities';
import { clientsSeed } from '@/lib/data/clients';
import { contractsSeed } from '@/lib/data/contracts';
import { deadlinesSeed } from '@/lib/data/deadlines';
import { filesSeed } from '@/lib/data/files';
import { expensesSeed } from '@/lib/data/expenses';
import { invoicesSeed } from '@/lib/data/invoices';
import { leadsSeed } from '@/lib/data/leads';
import { messageThreadsSeed, messagesSeed } from '@/lib/data/messages';
import { paymentsSeed } from '@/lib/data/payments';
import { projectsSeed } from '@/lib/data/projects';
import { tasksSeed } from '@/lib/data/tasks';
import { usersSeed, workspaceSeed } from '@/lib/data/workspace';

export function toMap<T extends { id: string }>(list: T[]): EntityMap<T> {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export { deadlinesSeed } from '@/lib/data/deadlines';

/** Ordered newest-first for activity feed */
export function sortActivityIds(activities: EntityMap<Activity>): string[] {
  return Object.values(activities)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((a) => a.id);
}

function initialNotifications(): AppNotification[] {
  const now = '2026-04-25T09:00:00.000Z';
  return [
    {
      id: 'n1',
      kind: 'message',
      title: 'Client awaiting reply — Michael Lee',
      body: 'Homepage copy is waiting on your feedback',
      read: false,
      createdAt: now,
      href: '/messages',
      entityId: 'm1',
    },
    {
      id: 'n2',
      kind: 'invoice',
      title: 'Send reminder — invoice past due',
      body: 'INV-1041 · BrightPath Labs',
      read: false,
      createdAt: '2026-04-25T08:00:00.000Z',
      href: '/invoices/i2',
      entityId: 'i2',
    },
    {
      id: 'n3',
      kind: 'contract',
      title: 'Contract needs signature — follow up',
      body: 'SOW — Storefront',
      read: false,
      createdAt: '2026-04-24T14:00:00.000Z',
      href: '/clients/c5',
      entityId: 'ct2',
    },
    {
      id: 'n4',
      kind: 'task',
      title: 'Due today — ship or reschedule',
      body: 'QA accessibility pass',
      read: true,
      createdAt: '2026-04-23T12:00:00.000Z',
      href: '/tasks',
      entityId: 't2',
    },
  ];
}

export type BootstrapEntities = {
  workspace: typeof workspaceSeed;
  users: EntityMap<User>;
  clients: EntityMap<Client>;
  projects: EntityMap<Project>;
  leads: EntityMap<Lead>;
  tasks: EntityMap<Task>;
  invoices: EntityMap<Invoice>;
  payments: EntityMap<Payment>;
  contracts: EntityMap<Contract>;
  messageThreads: EntityMap<MessageThread>;
  messages: EntityMap<Message>;
  files: EntityMap<AgencyFile>;
  expenses: EntityMap<Expense>;
  activities: EntityMap<Activity>;
  activityIds: string[];
  notifications: EntityMap<AppNotification>;
  notificationIds: string[];
  deadlines: typeof deadlinesSeed;
};

function reconcileClientsWithInvoices(clients: EntityMap<Client>, invoices: EntityMap<Invoice>): EntityMap<Client> {
  const list = Object.values(invoices);
  const next: EntityMap<Client> = { ...clients };
  for (const id of Object.keys(next)) {
    const c = next[id];
    next[id] = {
      ...c,
      balance: computeClientBalance(list, id),
      lifetimeValue: computeClientLifetimeValue(list, id),
    };
  }
  return next;
}

export function createBootstrapEntities(): BootstrapEntities {
  const activities = toMap(activitiesSeed);
  const notificationList = initialNotifications();
  const notifications = toMap(notificationList);
  const invoices = toMap(invoicesSeed);
  const clients = reconcileClientsWithInvoices(toMap(clientsSeed), invoices);
  return {
    workspace: workspaceSeed,
    users: toMap(usersSeed),
    clients,
    projects: toMap(projectsSeed),
    leads: toMap(leadsSeed),
    tasks: toMap(tasksSeed),
    invoices,
    payments: toMap(paymentsSeed),
    contracts: toMap(contractsSeed),
    messageThreads: toMap(messageThreadsSeed),
    messages: toMap(messagesSeed),
    files: toMap(filesSeed),
    expenses: toMap(expensesSeed),
    activities,
    activityIds: sortActivityIds(activities),
    notifications,
    notificationIds: notificationList.map((n) => n.id),
    deadlines: deadlinesSeed,
  };
}
