import { create } from 'zustand';
import type {
  Activity,
  ActivityType,
  AgencyFile,
  AppNotificationKind,
  Client,
  Contract,
  Expense,
  Invoice,
  Lead,
  Message,
  Payment,
  Project,
  ProjectDeliveryFocus,
  ProjectLifecycleStage,
  ServicePackageId,
  SiteBuildArchetypeId,
  Task,
  TaskChecklistItem,
} from '@/lib/types/entities';
import type { ClientStatus, PipelineStage, ProjectStatus } from '@/lib/statuses';
import { PIPELINE_STAGES } from '@/lib/statuses';
import { computeClientBalance, computeClientLifetimeValue } from '@/lib/domain-sync';
import { createBootstrapEntities, sortActivityIds } from '@/lib/data';
import { nextInvoiceNumber } from '@/lib/data/invoices';
import { formatRelativeShort } from '@/lib/format-relative';
import type { ActiveModal, RootState, ToastItem } from '@/store/root-state';
import { newId, isoNow } from '@/store/ids';
import { planAutonomousActions } from '@/lib/autonomous-operator-cycle';
import type { OperatorEvent } from '@/store/operator-state';
import type { DeadlineSeed } from '@/lib/data/deadlines';
import { getProjectTemplate, instantiateTemplateTasks } from '@/lib/project-templates';
import { LIFECYCLE_LABELS, nextLifecycleStage, projectStatusForLifecycle } from '@/lib/project-lifecycle';
import { useSiteProductionStore } from '@/store/useSiteProductionStore';

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
      /** When set, seeds lifecycle, delivery focus, and full task system from template. */
      templateId?: string | null;
      /** Conversion site voice for builder templates (client_site). */
      siteBuildArchetype?: SiteBuildArchetypeId | null;
      deliveryFocus?: ProjectDeliveryFocus;
      servicePackage?: ServicePackageId | null;
    },
    options?: { silent?: boolean; skipStarterTasks?: boolean }
  ) => string;
  addInvoice: (input: {
    clientId: string;
    projectId: string | null;
    amount: number;
    dueDate: string;
  }) => string;
  addTask: (
    input: {
      projectId: string;
      title: string;
      due: string;
      assigneeId?: string;
      description?: string;
      checklist?: TaskChecklistItem[];
      lifecycleStage?: ProjectLifecycleStage;
    },
    options?: { silent?: boolean }
  ) => string;
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
  /** Advance a closed execution loop (mirrors scheduled jobs server-side). */
  advanceExecutionLoop: (priorityItemId: string) => void;
  /** Run confidence-gated autonomous touches (default-on; user can undo). */
  processAutonomousOperatorCycle: () => void;
  undoOperatorEvent: (eventId: string) => void;

  advanceProjectPhase: (projectId: string) => void;
  /** Standardized website lifecycle (inquiry → post-launch). */
  advanceProjectLifecycle: (projectId: string) => void;
  toggleTaskChecklistItem: (taskId: string, itemId: string) => void;
  setProjectWaitingOn: (projectId: string, waiting: 'client' | 'agency' | null) => void;
  /** Builder: conversion template voice (service / ecommerce / landing / agency). */
  setProjectSiteBuildArchetype: (projectId: string, siteBuildArchetype: SiteBuildArchetypeId | null) => void;
  requestClientFeedback: (projectId: string) => void;
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
  addPayment: (input: {
    invoiceId: string;
    amount: number;
    method: string;
    status?: Payment['status'];
  }) => string;
  addContract: (input: {
    clientId: string;
    projectId?: string | null;
    title: string;
    value: number;
  }) => string;
  addDeadline: (input: { title: string; when: string; type: DeadlineSeed['type'] }) => void;
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
    const tmpl = input.templateId ? getProjectTemplate(input.templateId) : undefined;
    if (input.templateId && !tmpl) {
      if (!silent) get().toast('Unknown template — pick a standard template or leave blank.', 'error');
      return '';
    }
    const deliveryFocus: ProjectDeliveryFocus = tmpl?.deliveryFocus ?? input.deliveryFocus ?? 'client_site';
    const skipStarterStubs = options?.skipStarterTasks || Boolean(tmpl);
    const client = get().clients[input.clientId];
    if (!client) {
      if (!silent) get().toast('Pick a valid client — projects always belong to a client.', 'error');
      return '';
    }
    const id = newId('project');
    const now = isoNow();
    const ownerId = input.ownerId ?? get().currentUserId;
    const lifecycleStage: ProjectLifecycleStage = tmpl
      ? tmpl.initialLifecycleStage
      : deliveryFocus === 'product_other'
        ? 'inquiry'
        : 'discovery';
    const budget = tmpl ? tmpl.defaultBudget : input.budget;
    const dueStr = (tmpl ? tmpl.defaultDue : input.due).trim();
    const nameInput = input.name.trim();
    const name = nameInput || (tmpl ? `${tmpl.name} — ${client.company}` : '');
    if (!name) {
      if (!silent) get().toast('Enter a project name (or pick a template to auto-name).', 'error');
      return '';
    }
    const status = input.status ?? projectStatusForLifecycle(lifecycleStage);
    const project: Project = {
      id,
      clientId: input.clientId,
      name,
      status,
      budget,
      spent: 0,
      due: dueStr,
      ownerId,
      createdAt: now,
      updatedAt: now,
      lifecycleStage,
      templateId: tmpl ? tmpl.id : null,
      siteBuildArchetype: input.siteBuildArchetype ?? null,
      waitingOn: null,
      deliveryFocus,
      siteStatus: deliveryFocus === 'client_site' ? 'draft' : undefined,
      siteLiveUrl: null,
      lastSiteUpdateLabel: deliveryFocus === 'client_site' ? 'Not launched yet' : undefined,
      sitePageCount: deliveryFocus === 'client_site' ? 5 : undefined,
      clientPortalVisible: deliveryFocus === 'client_site' ? true : undefined,
      servicePackage: input.servicePackage ?? null,
    };
    const starterStubs = skipStarterStubs
      ? []
      : [
          { title: 'Discovery checklist', due: 'This week' },
          { title: 'Stakeholder kickoff session', due: 'Next week' },
          { title: 'Scope sign-off', due: 'Next week' },
        ];
    const stubTasks: Task[] = starterStubs.map((stub) => ({
      id: newId('task'),
      projectId: id,
      title: stub.title,
      status: 'Todo' as const,
      due: stub.due,
      assigneeId: ownerId,
      lifecycleStage: 'discovery' as const,
      createdAt: now,
      updatedAt: now,
    }));
    const templateTasks = tmpl ? instantiateTemplateTasks(id, ownerId, tmpl.id, () => newId('task'), now) : [];
    const allTaskRows = [...stubTasks, ...templateTasks];
    const taskMap = Object.fromEntries(allTaskRows.map((t) => [t.id, t]));
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
    for (const t of allTaskRows) {
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
    if (deliveryFocus === 'client_site') {
      useSiteProductionStore.getState().ensurePagesForProject(id);
    }
    if (!silent) {
      get().toast(
        tmpl
          ? `Project “${name}” created — ${templateTasks.length} template tasks + default pages.`
          : `Project “${name}” created with starter tasks`,
        'success'
      );
    }
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
      description: input.description?.trim() || undefined,
      checklist: input.checklist,
      lifecycleStage: input.lifecycleStage,
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
    get().toast(`${inv.number} collected — out of AR and off your chase list.`, 'success');
  },

  completeTask: (taskId) => {
    const t = get().tasks[taskId];
    if (!t || t.status === 'Done') return;
    const now = isoNow();
    const project = get().projects[t.projectId];
    set((s) => {
      const nextTasks = {
        ...s.tasks,
        [taskId]: { ...t, status: 'Done' as const, updatedAt: now },
      };
      const proj = project ? { ...project, updatedAt: now } : null;
      return {
        tasks: nextTasks,
        ...(proj ? { projects: { ...s.projects, [t.projectId]: proj } } : {}),
      };
    });
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
    get().toast('Task closed — it leaves blocked / due-soon queues immediately.', 'success');
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
            /** Team replied — ball is with the client until they write back. */
            status: 'Waiting',
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

  advanceExecutionLoop: (priorityItemId) => {
    const s = get();
    if (priorityItemId.startsWith('crit-block-bulk-')) {
      const projectId = priorityItemId.slice('crit-block-bulk-'.length);
      const p = s.projects[projectId];
      if (!p) return;
      const now = isoNow();
      set((st) => ({
        projects: { ...st.projects, [projectId]: { ...p, updatedAt: now } },
      }));
      get().logActivity({
        type: 'other',
        entityKind: 'project',
        entityId: projectId,
        title: `Delivery loop · stall nudge logged on “${p.name}”`,
        metadata: { clientId: p.clientId, projectId },
      });
      get().toast('Stall logged — delivery loop clock reset.', 'success');
      return;
    }
    if (priorityItemId.startsWith('crit-block-')) {
      const taskId = priorityItemId.slice('crit-block-'.length);
      const t = s.tasks[taskId];
      if (!t) return;
      const now = isoNow();
      set((st) => ({
        tasks: { ...st.tasks, [taskId]: { ...t, updatedAt: now } },
      }));
      get().logActivity({
        type: 'other',
        entityKind: 'task',
        entityId: taskId,
        title: `Delivery loop · client nudge logged on “${t.title}”`,
        metadata: { projectId: t.projectId },
      });
      get().toast('Nudge logged — blocker loop clock reset.', 'success');
      return;
    }
    if (priorityItemId.startsWith('crit-inv-')) {
      const invoiceId = priorityItemId.slice('crit-inv-'.length);
      const inv = s.invoices[invoiceId];
      if (!inv) return;
      const now = isoNow();
      set((st) => {
        const invoices = { ...st.invoices, [invoiceId]: { ...inv, updatedAt: now } };
        return { invoices, clients: nextClientsAfterInvoices(st, invoices, inv.clientId) };
      });
      get().logActivity({
        type: 'other',
        entityKind: 'invoice',
        entityId: invoiceId,
        title: `Revenue loop · collection touch logged · ${inv.number}`,
        metadata: { clientId: inv.clientId, projectId: inv.projectId ?? undefined },
      });
      get().toast('Collection touch logged — revenue loop clock reset.', 'success');
      return;
    }
    if (priorityItemId.startsWith('crit-msg-')) {
      const threadId = priorityItemId.slice('crit-msg-'.length);
      get().appendTeamMessage(
        threadId,
        'Thanks for your note — I’m on this and will follow up with specifics shortly.'
      );
      get().toast('Holding reply sent — communication loop advanced.', 'success');
      return;
    }
    if (priorityItemId.startsWith('imp-due-')) {
      const taskId = priorityItemId.slice('imp-due-'.length);
      const t = s.tasks[taskId];
      if (!t) return;
      const now = isoNow();
      set((st) => ({
        tasks: { ...st.tasks, [taskId]: { ...t, updatedAt: now } },
      }));
      get().logActivity({
        type: 'other',
        entityKind: 'task',
        entityId: taskId,
        title: `Delivery loop · due-today item acknowledged · “${t.title}”`,
        metadata: { projectId: t.projectId },
      });
      get().toast('Due-today loop advanced — clock reset.', 'success');
      return;
    }
    if (priorityItemId.startsWith('imp-burn-')) {
      const projectId = priorityItemId.slice('imp-burn-'.length);
      const p = s.projects[projectId];
      if (!p) return;
      const now = isoNow();
      set((st) => ({
        projects: { ...st.projects, [projectId]: { ...p, updatedAt: now } },
      }));
      get().logActivity({
        type: 'other',
        entityKind: 'project',
        entityId: projectId,
        title: `Delivery loop · scope check-in logged · “${p.name}”`,
        metadata: { clientId: p.clientId, projectId },
      });
      get().toast('Scope check-in logged — burn loop clock reset.', 'success');
    }
  },

  processAutonomousOperatorCycle: () => {
    const planned = planAutonomousActions(get());
    for (const p of planned) {
      if (p.type === 'invoice_reminder') {
        const inv = get().invoices[p.invoiceId];
        if (!inv) continue;
        const now = isoNow();
        const evId = newId('ope');
        const prev = get().operator.autonomy.invoiceReminders[p.invoiceId] ?? { count: 0, lastAutoAt: null };
        const nextCount = prev.count + 1;
        set((s) => {
          const invoices = { ...s.invoices, [p.invoiceId]: { ...inv, updatedAt: now } };
          const event: OperatorEvent = {
            id: evId,
            createdAt: now,
            kind: 'auto_invoice_reminder',
            title: `Payment reminder recorded · ${inv.number}`,
            detail: `Client nudged ${nextCount} of 2 by the operator — next escalation queues if cash stays idle.`,
            rationale: p.rationale,
            confidence: p.confidence,
            entityKind: 'invoice',
            entityId: p.invoiceId,
            priorityItemId: p.priorityItemId,
            reversible: true,
            undone: false,
          };
          return {
            invoices,
            clients: nextClientsAfterInvoices(s, invoices, inv.clientId),
            operator: {
              events: [event, ...s.operator.events],
              autonomy: {
                ...s.operator.autonomy,
                invoiceReminders: {
                  ...s.operator.autonomy.invoiceReminders,
                  [p.invoiceId]: { count: nextCount, lastAutoAt: now },
                },
              },
            },
          };
        });
        get().pushNotification({
          kind: 'invoice',
          title: 'Operator · reminder recorded',
          body: inv.number,
          href: `/invoices/${p.invoiceId}`,
          entityId: p.invoiceId,
        });
        get().logActivity({
          type: 'other',
          entityKind: 'invoice',
          entityId: p.invoiceId,
          title: `Payment reminder · ${inv.number} · nudge ${nextCount}`,
          metadata: { operatorEventId: evId },
        });
        continue;
      }
      if (p.type === 'thread_holding') {
        const threadId = p.threadId;
        const th0 = get().messageThreads[threadId];
        if (!th0) continue;
        get().appendTeamMessage(
          threadId,
          'Quick update — I’m on this and will follow up with specifics today. Thanks for your patience.'
        );
        const now = isoNow();
        const evId = newId('ope');
        set((s) => ({
          operator: {
            events: [
              {
                id: evId,
                createdAt: now,
                kind: 'auto_holding_reply',
                title: `Holding reply sent · ${th0.participant}`,
                detail:
                  'Default holding reply was sent — review the thread if you want a different tone.',
                rationale: p.rationale,
                confidence: p.confidence,
                entityKind: 'message',
                entityId: threadId,
                priorityItemId: p.priorityItemId,
                reversible: true,
                undone: false,
              },
              ...s.operator.events,
            ],
            autonomy: {
              ...s.operator.autonomy,
              threadHoldingReplies: {
                ...s.operator.autonomy.threadHoldingReplies,
                [threadId]: { count: 1, lastAutoAt: now },
              },
            },
          },
        }));
        get().pushNotification({
          kind: 'message',
          title: 'Operator · holding reply',
          body: th0.participant,
          href: '/messages',
          entityId: threadId,
        });
        get().logActivity({
          type: 'other',
          entityKind: 'message',
          entityId: threadId,
          title: `Inbox hold · draft reply for ${th0.participant}`,
          metadata: { threadId, operatorEventId: evId },
        });
        continue;
      }
      if (p.type === 'delivery_nudge_project') {
        const proj = get().projects[p.projectId];
        if (!proj) continue;
        const now = isoNow();
        const evId = newId('ope');
        const prev = get().operator.autonomy.deliveryNudges[p.projectId] ?? { count: 0, lastAutoAt: null };
        const nextCount = prev.count + 1;
        set((s) => ({
          projects: { ...s.projects, [p.projectId]: { ...proj, updatedAt: now } },
          operator: {
            events: [
              {
                id: evId,
                createdAt: now,
                kind: 'auto_delivery_nudge',
                title: `Stall nudge logged · ${proj.name}`,
                detail: 'Operator recorded a client nudge on the stalled project — delivery clock reset.',
                rationale: p.rationale,
                confidence: p.confidence,
                entityKind: 'project',
                entityId: p.projectId,
                priorityItemId: p.priorityItemId,
                reversible: true,
                undone: false,
              },
              ...s.operator.events,
            ],
            autonomy: {
              ...s.operator.autonomy,
              deliveryNudges: {
                ...s.operator.autonomy.deliveryNudges,
                [p.projectId]: { count: nextCount, lastAutoAt: now },
              },
            },
          },
        }));
        get().pushNotification({
          kind: 'task',
          title: 'Operator · delivery nudge',
          body: proj.name,
          href: `/projects/${p.projectId}`,
          entityId: p.projectId,
        });
        get().logActivity({
          type: 'other',
          entityKind: 'project',
          entityId: p.projectId,
          title: `Delivery check-in · ${proj.name}`,
          metadata: { operatorEventId: evId, projectId: p.projectId },
        });
      }
    }
    if (planned.length > 0) {
      get().toast(`${planned.length} follow-up action${planned.length === 1 ? '' : 's'} completed.`, 'info');
    }
  },

  undoOperatorEvent: (eventId) => {
    const st = get();
    const ev = st.operator.events.find((e) => e.id === eventId);
    if (!ev || ev.undone || !ev.reversible) return;

    set((s) => {
      const autonomy = { ...s.operator.autonomy };
      if (ev.kind === 'auto_invoice_reminder') {
        const cur = autonomy.invoiceReminders[ev.entityId];
        if (cur && cur.count > 0) {
          autonomy.invoiceReminders = {
            ...autonomy.invoiceReminders,
            [ev.entityId]: { count: cur.count - 1, lastAutoAt: cur.lastAutoAt },
          };
        }
      } else if (ev.kind === 'auto_holding_reply') {
        autonomy.threadHoldingReplies = {
          ...autonomy.threadHoldingReplies,
          [ev.entityId]: { count: 0, lastAutoAt: null },
        };
      } else if (ev.kind === 'auto_delivery_nudge') {
        const cur = autonomy.deliveryNudges[ev.entityId];
        if (cur && cur.count > 0) {
          autonomy.deliveryNudges = {
            ...autonomy.deliveryNudges,
            [ev.entityId]: { count: cur.count - 1, lastAutoAt: cur.lastAutoAt },
          };
        }
      }

      return {
        operator: {
          events: s.operator.events.map((e) => (e.id === eventId ? { ...e, undone: true } : e)),
          autonomy,
        },
      };
    });

    get().logActivity({
      type: 'other',
      entityKind: 'workspace',
      entityId: st.workspace.id,
      title: `Operator action undone · ${ev.title}`,
      metadata: { operatorEventId: eventId },
    });
    get().toast('Undone — counters adjusted. Clients may already have seen the touch.', 'info');
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

  advanceProjectLifecycle: (projectId) => {
    const p = get().projects[projectId];
    if (!p) return;
    const next = nextLifecycleStage(p.lifecycleStage);
    if (!next) {
      get().toast('Already at post-launch — keep optimizing or close the engagement.', 'info');
      return;
    }
    const prev = p.lifecycleStage;
    const now = isoNow();
    const nextStatus = projectStatusForLifecycle(next);
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...p,
          lifecycleStage: next,
          status: nextStatus,
          updatedAt: now,
          waitingOn: null,
        },
      },
    }));
    get().logActivity({
      type: 'project_phase_changed',
      entityKind: 'project',
      entityId: projectId,
      title: `“${p.name}” lifecycle ${prev} → ${next}`,
      metadata: { clientId: p.clientId, projectId, from: prev, to: next },
    });
    if (next === 'launch') {
      get().toast('Launch phase: domain, SSL, QA, and client walkthrough — treat this as the milestone moment.', 'success');
    } else if (next === 'post_launch') {
      get().toast('Site is live in the program — shift to optimization: speed, CTAs, and measured improvements.', 'success');
    } else {
      get().toast(`${LIFECYCLE_LABELS[prev]} → ${LIFECYCLE_LABELS[next]}`, 'success');
    }
  },

  toggleTaskChecklistItem: (taskId, itemId) => {
    const t = get().tasks[taskId];
    if (!t?.checklist?.length) return;
    const now = isoNow();
    const checklist = t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
    const proj = get().projects[t.projectId];
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...t, checklist, updatedAt: now },
      },
      ...(proj
        ? {
            projects: {
              ...s.projects,
              [t.projectId]: { ...proj, updatedAt: now },
            },
          }
        : {}),
    }));
  },

  setProjectWaitingOn: (projectId, waiting) => {
    const p = get().projects[projectId];
    if (!p) return;
    const now = isoNow();
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...p, waitingOn: waiting ?? null, updatedAt: now },
      },
    }));
  },

  setProjectSiteBuildArchetype: (projectId, siteBuildArchetype) => {
    const p = get().projects[projectId];
    if (!p) return;
    const now = isoNow();
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...p, siteBuildArchetype: siteBuildArchetype ?? null, updatedAt: now },
      },
    }));
  },

  requestClientFeedback: (projectId) => {
    const p = get().projects[projectId];
    if (!p) return;
    const now = isoNow();
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...p, waitingOn: 'client', updatedAt: now },
      },
    }));
    get().toast('Marked waiting on client — nudge them in Messages with a clear deadline.', 'success');
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
        servicePackage: 'growth',
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

  addPayment: (input) => {
    const inv = get().invoices[input.invoiceId];
    if (!inv) {
      get().toast('Invoice not found.', 'error');
      return '';
    }
    const id = newId('pay');
    const now = isoNow();
    const status = input.status ?? 'completed';
    const row: Payment = {
      id,
      invoiceId: input.invoiceId,
      clientId: inv.clientId,
      amount: Math.max(0, input.amount),
      status,
      method: input.method.trim() || 'ACH',
      createdAt: now,
      processorStatus: status === 'completed' ? 'settled' : 'processing',
      payoutStatus: status === 'completed' ? 'paid_out' : 'scheduled',
    };
    set((s) => ({ payments: { ...s.payments, [id]: row } }));
    get().logActivity({
      type: 'other',
      entityKind: 'invoice',
      entityId: input.invoiceId,
      title: `Payment · $${row.amount.toLocaleString()} · ${inv.number}`,
      metadata: { invoiceId: input.invoiceId, clientId: inv.clientId, paymentId: id },
    });
    get().toast('Payment recorded on the ledger.', 'success');
    return id;
  },

  addContract: (input) => {
    const id = newId('ct');
    const now = isoNow();
    const short = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const row: Contract = {
      id,
      clientId: input.clientId,
      projectId: input.projectId ?? null,
      title: input.title.trim(),
      status: 'Draft',
      value: Math.max(0, input.value),
      createdAt: now,
      updatedAt: now,
      updatedLabel: short,
      sentDate: null,
      viewedDate: null,
      signedDate: null,
    };
    set((s) => ({ contracts: { ...s.contracts, [id]: row } }));
    get().logActivity({
      type: 'other',
      entityKind: 'contract',
      entityId: id,
      title: `Contract drafted · ${row.title}`,
      metadata: { clientId: input.clientId, projectId: input.projectId ?? undefined },
    });
    get().toast('Contract draft saved.', 'success');
    return id;
  },

  addDeadline: (input) => {
    const id = newId('dl');
    set((s) => ({
      deadlines: [...s.deadlines, { id, title: input.title.trim(), when: input.when.trim(), type: input.type }],
    }));
    get().toast('Calendar event added.', 'success');
  },
}));
