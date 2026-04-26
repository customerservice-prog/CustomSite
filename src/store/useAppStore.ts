import { create } from 'zustand';
import type {
  Activity,
  ActivityType,
  AgencyFile,
  AppNotificationKind,
  Client,
  Expense,
  Invoice,
  Lead,
  Message,
  Project,
  Task,
} from '@/lib/types/entities';
import type { ClientStatus, PipelineStage, ProjectStatus } from '@/lib/statuses';
import { PIPELINE_STAGES } from '@/lib/statuses';
import { computeClientBalance, computeClientLifetimeValue } from '@/lib/domain-sync';
import { createBootstrapEntities, sortActivityIds } from '@/lib/data';
import { nextInvoiceNumber } from '@/lib/data/invoices';
import { formatRelativeShort } from '@/lib/format-relative';
import type { ActiveModal, RootState, ToastItem } from '@/store/root-state';
import { newId, isoNow } from '@/store/ids';

const DELIVERY_PHASE_FLOW: ProjectStatus[] = ['Planning', 'Design', 'Development', 'Review', 'Live'];

const PRE_WIN_PIPELINE = PIPELINE_STAGES.slice(0, PIPELINE_STAGES.indexOf('Won')) as PipelineStage[];

function nextClientsAfterInvoices(s: RootState, invoices: RootState['invoices'], clientId: string): RootState['clients'] {
  const c = s.clients[clientId];
  if (!c) return s.clients;
  const list = Object.values(invoices);
  const now = isoNow();
  return {
    ...s.clients,
    [clientId]: {
      ...c,
      balance: computeClientBalance(list, clientId),
      lifetimeValue: computeClientLifetimeValue(list, clientId),
      updatedAt: now,
    },
  };
}

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

  addClient: (
    input: {
      name: string;
      company: string;
      email: string;
      phone?: string;
      status?: ClientStatus;
      ownerId?: string;
    },
    options?: { silent?: boolean }
  ) => string;
  addProject: (
    input: {
      name: string;
      clientId: string;
      budget: number;
      due: string;
      status?: ProjectStatus;
      ownerId?: string;
    },
    options?: { silent?: boolean; skipStarterTasks?: boolean }
  ) => string;
  addInvoice: (input: {
    clientId: string;
    projectId: string | null;
    amount: number;
    dueDate: string;
  }) => string;
  addTask: (input: { projectId: string; title: string; due: string; assigneeId?: string }, options?: { silent?: boolean }) => string;
  addFile: (input: {
    name: string;
    projectId: string;
    clientId: string;
    size?: string;
    folder?: string;
    visibility: AgencyFile['visibility'];
  }) => string;
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

  advanceProjectPhase: (projectId: string) => void;
  advanceLeadStage: (leadId: string) => void;
  convertWonLead: (leadId: string) => string | null;
  addExpense: (input: {
    projectId: string;
    vendor: string;
    category: string;
    amount: number;
    reimbursable?: boolean;
    date: string;
  }) => string;
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
  closeModal: () =>
    set((s) => ({
      ui: {
        ...s.ui,
        activeModal: null,
        selectedClientId: null,
        selectedProjectId: null,
      },
    })),
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

  addClient: (input, options) => {
    const silent = options?.silent;
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
      title: `${client.name} added as ${client.status === 'Lead' ? 'lead' : 'client'} · ${client.company}`,
      metadata: { clientId: id },
    });
    if (!silent) {
      get().pushNotification({
        kind: 'system',
        title: 'New client',
        body: client.name,
        href: `/clients/${id}`,
        entityId: id,
      });
      get().toast(`${client.name} created`, 'success');
    }
    return id;
  },

  addProject: (input, options) => {
    const silent = options?.silent;
    const skipTasks = options?.skipStarterTasks;
    const client = get().clients[input.clientId];
    if (!client) {
      if (!silent) get().toast('Pick a valid client — projects always belong to a client.', 'error');
      return '';
    }
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
    const starterStubs = skipTasks
      ? []
      : [
          { title: 'Discovery checklist', due: 'This week' },
          { title: 'Stakeholder kickoff session', due: 'Next week' },
          { title: 'Scope sign-off', due: 'Next week' },
        ];
    const taskRows: Task[] = starterStubs.map((stub) => ({
      id: newId('task'),
      projectId: id,
      title: stub.title,
      status: 'Todo' as const,
      due: stub.due,
      assigneeId: ownerId,
      createdAt: now,
      updatedAt: now,
    }));
    const taskMap = Object.fromEntries(taskRows.map((t) => [t.id, t]));
    set((s) => ({
      projects: { ...s.projects, [id]: project },
      tasks: { ...s.tasks, ...taskMap },
      clients: {
        ...s.clients,
        [input.clientId]: {
          ...s.clients[input.clientId]!,
          lastActivityLabel: formatRelativeShort(now),
          updatedAt: now,
        },
      },
    }));
    for (const t of taskRows) {
      get().logActivity({
        type: 'task_created',
        entityKind: 'task',
        entityId: t.id,
        title: `Task “${t.title}” added to ${project.name}`,
        metadata: { projectId: id, clientId: input.clientId },
      });
    }
    get().logActivity({
      type: 'project_created',
      entityKind: 'project',
      entityId: id,
      title: `Project “${project.name}” opened for ${client.company}`,
      metadata: { clientId: input.clientId, projectId: id },
    });
    if (!silent) get().toast(`Project “${project.name}” created with starter tasks`, 'success');
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
    set((s) => {
      const invoices = { ...s.invoices, [id]: invoice };
      return {
        invoices,
        clients: nextClientsAfterInvoices(s, invoices, input.clientId),
      };
    });
    const client = get().clients[input.clientId];
    const proj = input.projectId ? get().projects[input.projectId] : undefined;
    get().logActivity({
      type: 'invoice_created',
      entityKind: 'invoice',
      entityId: id,
      title: `${number} drafted for ${client?.name ?? 'client'}${proj ? ` · ${proj.name}` : ''} · $${invoice.amount.toLocaleString()}`,
      metadata: {
        clientId: input.clientId,
        projectId: input.projectId ?? undefined,
      },
    });
    get().toast(`${number} created — client balance updated`, 'success');
    return id;
  },

  addTask: (input, options) => {
    const silent = options?.silent;
    const id = newId('task');
    const now = isoNow();
    const assigneeId = input.assigneeId ?? get().currentUserId;
    const project = get().projects[input.projectId];
    if (!project) {
      if (!silent) get().toast('Tasks must belong to a project.', 'error');
      return '';
    }
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
      title: `Task “${task.title}” on ${project.name}`,
      metadata: { projectId: input.projectId, clientId: project.clientId },
    });
    if (!silent) get().toast('Task added', 'success');
    return id;
  },

  addFile: (input) => {
    const id = newId('file');
    const now = isoNow();
    const uploaded = new Date(now).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const project = get().projects[input.projectId];
    const row: AgencyFile = {
      id,
      name: input.name.trim(),
      projectId: input.projectId,
      clientId: input.clientId,
      uploaded,
      size: input.size?.trim() || '—',
      createdAt: now,
      folder: input.folder?.trim() || 'General',
      visibility: input.visibility,
    };
    set((s) => ({
      files: { ...s.files, [id]: row },
      clients: s.clients[input.clientId]
        ? {
            ...s.clients,
            [input.clientId]: {
              ...s.clients[input.clientId]!,
              lastActivityLabel: formatRelativeShort(now),
              updatedAt: now,
            },
          }
        : s.clients,
    }));
    get().logActivity({
      type: 'file_uploaded',
      entityKind: 'file',
      entityId: id,
      title: `File “${row.name}” uploaded to ${project?.name ?? 'project'}`,
      metadata: { projectId: input.projectId, clientId: input.clientId },
    });
    get().toast('File added to library', 'success');
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
      convertedClientId: null,
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
    const wasDraft = inv.status === 'Draft';
    set((s) => {
      const invoices = {
        ...s.invoices,
        [invoiceId]: {
          ...inv,
          status: inv.status === 'Draft' ? ('Sent' as const) : inv.status,
          sentDate: inv.sentDate ?? sentLabel,
          updatedAt: now,
        },
      };
      return {
        invoices,
        clients: nextClientsAfterInvoices(s, invoices, inv.clientId),
      };
    });
    const client = get().clients[inv.clientId];
    get().logActivity({
      type: 'invoice_sent',
      entityKind: 'invoice',
      entityId: invoiceId,
      title: wasDraft
        ? `${inv.number} sent to ${client?.name ?? 'client'} — due ${inv.dueDate}`
        : `${inv.number} updated (delivery)`,
      metadata: {
        clientId: inv.clientId,
        projectId: inv.projectId ?? undefined,
      },
    });
    get().pushNotification({
      kind: 'invoice',
      title: 'Invoice sent',
      body: inv.number,
      href: `/invoices/${invoiceId}`,
      entityId: invoiceId,
    });
  },

  markInvoicePaid: (invoiceId) => {
    const inv = get().invoices[invoiceId];
    if (!inv || inv.status === 'Paid') return;
    const now = isoNow();
    const payId = newId('pay');
    const client = get().clients[inv.clientId];
    set((s) => {
      const invoices = {
        ...s.invoices,
        [invoiceId]: { ...inv, status: 'Paid' as const, updatedAt: now },
      };
      const payments = {
        ...s.payments,
        [payId]: {
          id: payId,
          invoiceId,
          clientId: inv.clientId,
          amount: inv.amount,
          status: 'completed' as const,
          method: 'Recorded',
          createdAt: now,
        },
      };
      return {
        invoices,
        payments,
        clients: nextClientsAfterInvoices({ ...s, invoices }, invoices, inv.clientId),
      };
    });
    get().logActivity({
      type: 'invoice_paid',
      entityKind: 'invoice',
      entityId: invoiceId,
      title: `${inv.number} marked paid · $${inv.amount.toLocaleString()}${client ? ` · ${client.company}` : ''}`,
      metadata: {
        clientId: inv.clientId,
        projectId: inv.projectId ?? undefined,
      },
    });
    get().toast(`${inv.number} marked paid — revenue recognized and client balance cleared.`, 'success');
  },

  completeTask: (taskId) => {
    const t = get().tasks[taskId];
    if (!t || t.status === 'Done') return;
    const now = isoNow();
    const project = get().projects[t.projectId];
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
      title: `Task done: “${t.title}”${project ? ` · ${project.name}` : ''}`,
      metadata: {
        projectId: t.projectId,
        clientId: project?.clientId,
      },
    });
    get().toast('Task marked complete — your delivery snapshot just updated.', 'success');
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
    set((s) => {
      const clientRow = s.clients[thread.clientId];
      return {
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
        clients: clientRow
          ? {
              ...s.clients,
              [thread.clientId]: {
                ...clientRow,
                lastActivityLabel: formatRelativeShort(now),
                updatedAt: now,
              },
            }
          : s.clients,
      };
    });
    const project = get().projects[thread.projectId];
    get().logActivity({
      type: 'message_received',
      entityKind: 'message',
      entityId: threadId,
      title: `Reply to ${thread.participant}${project ? ` · ${project.name}` : ''}`,
      metadata: {
        threadId,
        clientId: thread.clientId,
        projectId: thread.projectId,
      },
    });
  },

  advanceProjectPhase: (projectId) => {
    const p = get().projects[projectId];
    if (!p) return;
    let next: ProjectStatus | null = null;
    if (p.status === 'On Hold') {
      next = 'Development';
    } else {
      const i = DELIVERY_PHASE_FLOW.indexOf(p.status);
      if (i >= 0 && i < DELIVERY_PHASE_FLOW.length - 1) next = DELIVERY_PHASE_FLOW[i + 1]!;
    }
    if (!next) {
      get().toast('This project is already in its delivery end state.', 'info');
      return;
    }
    const prev = p.status;
    const now = isoNow();
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...p, status: next!, updatedAt: now },
      },
    }));
    get().logActivity({
      type: 'project_phase_changed',
      entityKind: 'project',
      entityId: projectId,
      title: `“${p.name}” moved ${prev} → ${next}`,
      metadata: { clientId: p.clientId, projectId, from: prev, to: next },
    });
    get().toast(`Phase updated: ${next}`, 'success');
  },

  advanceLeadStage: (leadId) => {
    const lead = get().leads[leadId];
    if (!lead) return;
    const idx = PRE_WIN_PIPELINE.indexOf(lead.stage);
    if (idx < 0 || idx >= PRE_WIN_PIPELINE.length - 1) {
      if (lead.stage === 'Contract Sent') {
        get().toast('Ready to win — use Mark won & create client.', 'info');
      } else if (lead.stage === 'Won' || lead.stage === 'Lost') {
        get().toast('This opportunity is already closed.', 'info');
      }
      return;
    }
    const nextStage = PRE_WIN_PIPELINE[idx + 1]!;
    const prev = lead.stage;
    const now = isoNow();
    set((s) => ({
      leads: {
        ...s.leads,
        [leadId]: { ...lead, stage: nextStage, updatedAt: now, lastActivityLabel: formatRelativeShort(now) },
      },
    }));
    get().logActivity({
      type: 'lead_stage_changed',
      entityKind: 'lead',
      entityId: leadId,
      title: `${lead.company}: ${prev} → ${nextStage}`,
      metadata: { from: prev, to: nextStage, clientId: lead.convertedClientId ?? undefined },
    });
    get().toast(`${lead.company} → ${nextStage}`, 'success');
  },

  convertWonLead: (leadId) => {
    const lead = get().leads[leadId];
    if (!lead) return null;
    if (lead.convertedClientId) {
      get().toast('This lead was already converted.', 'info');
      return lead.convertedClientId;
    }
    const email = `contact.${lead.id.replace(/[^a-z0-9]/gi, '').slice(0, 10)}@won.local`;
    const clientId = get().addClient(
      {
        name: lead.name,
        company: lead.company,
        email,
        phone: '',
        status: 'Active',
        ownerId: lead.ownerId,
      },
      { silent: true }
    );
    const kickoffBudget = Math.max(8000, Math.round(lead.value * 0.12));
    const projectId = get().addProject(
      {
        name: `Kickoff — ${lead.company}`,
        clientId,
        budget: kickoffBudget,
        due: '30 days',
        status: 'Planning',
        ownerId: lead.ownerId,
      },
      { silent: true }
    );
    const now = isoNow();
    set((s) => ({
      leads: {
        ...s.leads,
        [leadId]: {
          ...lead,
          stage: 'Won',
          convertedClientId: clientId,
          updatedAt: now,
          lastActivityLabel: 'Converted',
        },
      },
    }));
    get().logActivity({
      type: 'lead_won',
      entityKind: 'lead',
      entityId: leadId,
      title: `Won: ${lead.company} → client + kickoff project`,
      metadata: { clientId, projectId },
    });
    get().toast(`${lead.company} is now a client with a kickoff project.`, 'success');
    return clientId;
  },

  addExpense: (input) => {
    const project = get().projects[input.projectId];
    if (!project) {
      get().toast('Expenses must be tied to a project.', 'error');
      return '';
    }
    const id = newId('exp');
    const now = isoNow();
    const clientId = project.clientId;
    const row: Expense = {
      id,
      projectId: input.projectId,
      clientId,
      vendor: input.vendor.trim(),
      category: input.category.trim(),
      amount: Math.max(0, input.amount),
      reimbursable: input.reimbursable ?? false,
      date: input.date,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ expenses: { ...s.expenses, [id]: row } }));
    get().logActivity({
      type: 'expense_recorded',
      entityKind: 'project',
      entityId: input.projectId,
      title: `Expense · ${row.vendor} · $${row.amount.toLocaleString()} · ${project.name}`,
      metadata: { projectId: input.projectId, clientId, expenseId: id },
    });
    get().toast('Expense recorded on project', 'success');
    return id;
  },
}));
