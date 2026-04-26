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

export type ActiveModal = 'create-client' | 'create-project' | 'create-invoice' | 'create-task' | null;

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
  ui: {
    mobileSidebarOpen: boolean;
    commandPaletteOpen: boolean;
    activeModal: ActiveModal;
    selectedClientId: string | null;
    selectedProjectId: string | null;
  };
  hydration: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
  };
  toasts: ToastItem[];
  /** Autonomous operator — timeline, autonomy counters, undo */
  operator: OperatorState;
}
