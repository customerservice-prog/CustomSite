import { create } from 'zustand';
import type { Activity, ActivityType, AppNotificationKind, Client, Invoice, Lead, Message, Project, Task } from '@/lib/types/entities';
import type { ClientStatus, ProjectStatus } from '@/lib/statuses';
import { createBootstrapEntities, sortActivityIds } from '@/lib/data';
import { nextInvoiceNumber } from '@/lib/data/invoices';
import { formatRelativeShort } from '@/lib/format-relative';
import type { ActiveModal, RootState, ToastItem } from '@/store/root-state';
import { newId, isoNow } from '@/store/ids';

type LogActivityInput = {
  type: ActivityType;
  entityKind: Activity['entityKind'];
  entityId: string;
  title: string;
  actorUserId?: string;
  metadata?: Record<string, string | undefined>;
};

type PushNotificationInput = {
  kind: AppNotificationKind;
  title: string;
  body?: string;
  href?: string;
  entityId?: string;
  read?: boolean;
};

export interface AppStore extends RootState {
  setMobileSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openModal: (modal: Exclude<ActiveModal, null>) => void;
  closeModal: () => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setHydration: (status: RootState['hydration']['status'], error?: string) => void;

  toast: (message: string, variant?: ToastItem['variant']) => void;
  dismissToast: (id: string) => void;

  logActivity: (input: LogActivityInput) => void;
  pushNotification: (input: PushNotificationInput) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  addClient: (input: {
    name: string;
    company: string;
    email: string;
    phone?: string;
    status?: ClientStatus;
    ownerId?: string;
  }) => string;
  addProject: (input: {
    name: string;
    clientId: string;
    budget: number;
    due: string;
    status?: ProjectStatus;
    ownerId?: string;
  }) => string;
  addInvoice: (input: {
    clientId: string;
    projectId: string | null;
    amount: number;
    dueDate: string;
  }) => string;
  addTask: (input: { projectId: string; title: string; due: string; assigneeId?: string }) => string;
  addLead: (input: {
    name: string;
    company: string;
    value: number;
    ownerId: string;
    nextAction?: string;
  }) => string;

  sendInvoice: (invoiceId: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  completeTask: (taskId: string) => void;
  appendTeamMessage: (threadId: string, body: string) => void;
}

const boot = createBootstrapEntities();

export const useAppStore = create<AppStore>((set, get) => ({
  ...boot,
  currentUserId: 'u1',
  ui: {
    mobileSidebarOpen: false,
    commandPaletteOpen: false,
    activeModal: null,
    selectedClientId: null,
    selectedProjectId: null,
  },
  hydration: { status: 'ready' },
  toasts: [],

  setMobileSidebarOpen: (open) => set((s) => ({ ui: { ...s.ui, mobileSidebarOpen: open } })),
  setCommandPaletteOpen: (open) => set((s) => ({ ui: { ...s.ui, commandPaletteOpen: open } })),
  openModal: (modal) => set((s) => ({ ui: { ...s.ui, activeModal: modal } })),
  closeModal: () => set((s) => ({ ui: { ...s.ui, activeModal: null } })),
  setSelectedClientId: (id) => set((s) => ({ ui: { ...s.ui, selectedClientId: id } })),
  setSelectedProjectId: (id) => set((s) => ({ ui: { ...s.ui, selectedProjectId: id } })),
  setHydration: (status, error) => set({ hydration: { status, error } }),

  toast: (message, variant = 'success') => {
    const id = newId('toast');
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  logActivity: (input) => {
    const id = newId('act');
    const now = isoNow();
    const actorUserId = input.actorUserId ?? get().currentUserId;
    const row: Activity = {
      id,
      type: input.type,
      entityKind: input.entityKind,
      entityId: input.entityId,
      title: input.title,
      actorUserId,
      createdAt: now,
      timeLabel: formatRelativeShort(now),
      metadata: input.metadata,
    };
    set((s) => {
      const activities = { ...s.activities, [id]: row };
      return {
        activities,
        activityIds: sortActivityIds(activities),
      };
    });
  },

  pushNotification: (input) => {
    const id = newId('note');
    const now = isoNow();
    set((s) => ({
      notifications: {
        ...s.notifications,
        [id]: {
          id,
          kind: input.kind,
          title: input.title,
          body: input.body,
          read: input.read ?? false,
          createdAt: now,
          href: input.href,
          entityId: input.entityId,
        },
      },
      notificationIds: [id, ...s.notificationIds],
    }));
  },

  markNotificationRead: (nid) =>
    set((s) => {
      const n = s.notifications[nid];
      if (!n || n.read) return {};
      return {
        notifications: { ...s.notifications, [nid]: { ...n, read: true } },
      };
    }),

  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: Object.fromEntries(
        Object.entries(s.notifications).map(([k, v]) => [k, { ...v, read: true }])
      ),
    })),

  addClient: (input) => {
    const id = newId('client');
    const now = isoNow();
    const ownerId = input.ownerId ?? get().currentUserId;
    const client: Client = {
      id,
      name: input.name.trim(),
      company: input.company.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() ?? '',
      status: input.status ?? 'Lead',
      ownerId,
      lifetimeValue: 0,
      balance: 0,
      createdAt: now,
      updatedAt: now,
      lastActivityLabel: 'Just now',
    };
    set((s) => ({ clients: { ...s.clients, [id]: client } }));
    get().logActivity({
      type: 'client_created',
      entityKind: 'client',
      entityId: id,
      title: `${client.name} added to workspace`,
    });
    get().pushNotification({
      kind: 'system',
      title: 'New client',
      body: client.name,
      href: `/clients/${id}`,
      entityId: id,
    });
    get().toast(`${client.name} created`, 'success');
    return id;
  },

  addProject: (input) => {
    const id = newId('project');
    const now = isoNow();
    const ownerId = input.ownerId ?? get().currentUserId;
    const project: Project = {
      id,
      clientId: input.clientId,
      name: input.name.trim(),
      status: input.status ?? 'Planning',
      budget: input.budget,
      spent: 0,
      due: input.due.trim(),
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ projects: { ...s.projects, [id]: project } }));
    const client = get().clients[input.clientId];
    get().logActivity({
      type: 'project_created',
      entityKind: 'project',
      entityId: id,
      title: `Project “${project.name}” created${client ? ` for ${client.company}` : ''}`,
    });
    get().toast(`Project “${project.name}” created`, 'success');
    return id;
  },

  addInvoice: (input) => {
    const id = newId('inv');
    const now = isoNow();
    const number = nextInvoiceNumber(get().invoices);
    const invoice: Invoice = {
      id,
      number,
      clientId: input.clientId,
      projectId: input.projectId,
      status: 'Draft',
      amount: input.amount,
      dueDate: input.dueDate,
      sentDate: null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ invoices: { ...s.invoices, [id]: invoice } }));
    get().logActivity({
      type: 'invoice_created',
      entityKind: 'invoice',
      entityId: id,
      title: `${number} drafted`,
    });
    get().toast(`${number} created`, 'success');
    return id;
  },

  addTask: (input) => {
    const id = newId('task');
    const now = isoNow();
    const assigneeId = input.assigneeId ?? get().currentUserId;
    const task: Task = {
      id,
      projectId: input.projectId,
      title: input.title.trim(),
      status: 'Todo',
      due: input.due.trim(),
      assigneeId,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ tasks: { ...s.tasks, [id]: task } }));
    get().logActivity({
      type: 'task_created',
      entityKind: 'task',
      entityId: id,
      title: `Task: ${task.title}`,
    });
    get().toast('Task added', 'success');
    return id;
  },

  addLead: (input) => {
    const id = newId('lead');
    const now = isoNow();
    const lead: Lead = {
      id,
      name: input.name.trim(),
      company: input.company.trim(),
      stage: 'New Lead',
      value: input.value,
      nextAction: input.nextAction?.trim() || 'Schedule discovery',
      ownerId: input.ownerId,
      lastActivityLabel: 'Just now',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ leads: { ...s.leads, [id]: lead } }));
    get().logActivity({
      type: 'lead_created',
      entityKind: 'lead',
      entityId: id,
      title: `Lead ${lead.name} · ${lead.company}`,
    });
    get().toast('Lead added to pipeline', 'success');
    return id;
  },

  sendInvoice: (invoiceId) => {
    const inv = get().invoices[invoiceId];
    if (!inv || inv.status === 'Void') return;
    const now = isoNow();
    const sentLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    set((s) => ({
      invoices: {
        ...s.invoices,
        [invoiceId]: {
          ...inv,
          status: inv.status === 'Draft' ? 'Sent' : inv.status,
          sentDate: inv.sentDate ?? sentLabel,
          updatedAt: now,
        },
      },
    }));
    get().logActivity({
      type: 'invoice_sent',
      entityKind: 'invoice',
      entityId: invoiceId,
      title: `${inv.number} sent`,
    });
    get().pushNotification({
      kind: 'invoice',
      title: 'Invoice sent',
      body: inv.number,
      href: `/invoices/${invoiceId}`,
      entityId: invoiceId,
    });
    get().toast(`${inv.number} marked sent`, 'success');
  },

  markInvoicePaid: (invoiceId) => {
    const inv = get().invoices[invoiceId];
    if (!inv) return;
    const now = isoNow();
    set((s) => ({
      invoices: {
        ...s.invoices,
        [invoiceId]: { ...inv, status: 'Paid', updatedAt: now },
      },
    }));
    const payId = newId('pay');
    set((s) => ({
      payments: {
        ...s.payments,
        [payId]: {
          id: payId,
          invoiceId,
          clientId: inv.clientId,
          amount: inv.amount,
          status: 'completed',
          method: 'Recorded',
          createdAt: now,
        },
      },
    }));
    get().logActivity({
      type: 'invoice_paid',
      entityKind: 'invoice',
      entityId: invoiceId,
      title: `${inv.number} marked paid`,
    });
    get().toast(`${inv.number} paid`, 'success');
  },

  completeTask: (taskId) => {
    const t = get().tasks[taskId];
    if (!t) return;
    const now = isoNow();
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...t, status: 'Done', updatedAt: now },
      },
    }));
    get().logActivity({
      type: 'task_completed',
      entityKind: 'task',
      entityId: taskId,
      title: `Completed: ${t.title}`,
    });
    get().toast('Task completed', 'success');
  },

  appendTeamMessage: (threadId, body) => {
    const thread = get().messageThreads[threadId];
    if (!thread) return;
    const now = isoNow();
    const msgId = newId('msg');
    const timeLabel = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const msg: Message = {
      id: msgId,
      threadId,
      body: body.trim(),
      from: 'team',
      createdAt: now,
      timeLabel,
    };
    set((s) => ({
      messages: { ...s.messages, [msgId]: msg },
      messageThreads: {
        ...s.messageThreads,
        [threadId]: {
          ...thread,
          preview: body.trim().slice(0, 120),
          status: 'Replied',
          updatedAt: now,
          lastActivityLabel: formatRelativeShort(now),
        },
      },
    }));
    get().logActivity({
      type: 'message_received',
      entityKind: 'message',
      entityId: threadId,
      title: `Reply sent in thread with ${thread.participant}`,
      metadata: { threadId },
    });
  },
}));
