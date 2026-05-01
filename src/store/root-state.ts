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
  Workspace,
} from '@/lib/types/entities';
import type { DeadlineSeed } from '@/lib/data/deadlines';
import type { OperatorState } from '@/store/operator-state';

export type ToastItem = { id: string; message: string; variant: 'success' | 'error' | 'info' };

export type ActiveModal =
  | 'create-client'
  | 'create-project'
  | 'create-invoice'
  | 'create-task'
  | 'record-payment'
  | 'upload-file'
  | 'create-contract'
  | 'calendar-event'
  | 'invite-client'
  | null;

/** When opening Create client from another modal, reopen this modal after success. */
export type ResumeModalAfterClientCreate = 'create-project' | 'create-invoice';

export type OpenModalOptions = {
  resumeModal?: ResumeModalAfterClientCreate;
  /** After success, set `pendingNewClientId` and close modals (AI Builder / Build Helper pickers). */
  pickContext?: boolean;
};

export interface RootState {
  workspace: Workspace;
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
  deadlines: DeadlineSeed[];
  currentUserId: string;
  /** Consumed by pages that pick a client in context (e.g. AI Builder); cleared after apply. */
  pendingNewClientId: string | null;
  ui: {
    mobileSidebarOpen: boolean;
    commandPaletteOpen: boolean;
    activeModal: ActiveModal;
    selectedClientId: string | null;
    selectedProjectId: string | null;
    resumeModalAfterClientCreate: ResumeModalAfterClientCreate | null;
    pickContextAfterClientCreate: boolean;
  };
  hydration: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  toasts: ToastItem[];
  /** Autonomous operator — timeline, autonomy counters, undo */
  operator: OperatorState;
}
