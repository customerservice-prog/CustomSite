import type {
  ClientStatus,
  ContractStatus,
  InvoiceStatus,
  MessageThreadStatus,
  PipelineStage,
  ProjectStatus,
  TaskStatus,
} from '@/lib/statuses';

export type UserRole = 'admin' | 'member' | 'client';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: ClientStatus;
  ownerId: string;
  lifetimeValue: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
  lastActivityLabel: string;
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  due: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  stage: PipelineStage;
  value: number;
  nextAction: string;
  ownerId: string;
  lastActivityLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  due: string;
  assigneeId: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  number: string;
  clientId: string;
  projectId: string | null;
  status: InvoiceStatus;
  amount: number;
  dueDate: string;
  sentDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  createdAt: string;
};

export type Contract = {
  id: string;
  clientId: string;
  title: string;
  status: ContractStatus;
  value: number;
  createdAt: string;
  updatedAt: string;
  /** Short display string for tables */
  updatedLabel: string;
};

export type MessageThread = {
  id: string;
  clientId: string;
  projectId: string;
  participant: string;
  preview: string;
  status: MessageThreadStatus;
  updatedAt: string;
  lastActivityLabel: string;
};

export type Message = {
  id: string;
  threadId: string;
  body: string;
  from: 'client' | 'team';
  createdAt: string;
  timeLabel: string;
};

export type AgencyFile = {
  id: string;
  name: string;
  projectId: string;
  clientId: string;
  uploaded: string;
  size: string;
  createdAt: string;
};

export type ActivityType =
  | 'client_created'
  | 'project_created'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'message_received'
  | 'task_created'
  | 'task_completed'
  | 'lead_created'
  | 'contract_signed'
  | 'file_uploaded'
  | 'project_updated'
  | 'other';

export type Activity = {
  id: string;
  type: ActivityType;
  entityKind: 'client' | 'project' | 'invoice' | 'task' | 'message' | 'lead' | 'contract' | 'file' | 'workspace';
  entityId: string;
  title: string;
  actorUserId: string;
  createdAt: string;
  timeLabel: string;
  metadata?: Record<string, string | undefined>;
};

export type AppNotificationKind = 'message' | 'invoice' | 'contract' | 'task' | 'system';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  href?: string;
  entityId?: string;
};

export type EntityMap<T> = Record<string, T>;
