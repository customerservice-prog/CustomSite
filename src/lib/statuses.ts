/** Canonical status systems — pair with <Badge variant={…} /> */

import {
  CLIENT_STATUSES,
  CONTRACT_STATUSES,
  INVOICE_STATUSES,
  MESSAGE_STATUSES,
  PIPELINE_STAGES,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from './status-constants';
import type { ClientHealthLevel, ProjectHealthLevel } from './system-intelligence';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type MessageThreadStatus = (typeof MESSAGE_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export {
  CLIENT_STATUSES,
  PROJECT_STATUSES,
  INVOICE_STATUSES,
  CONTRACT_STATUSES,
  TASK_STATUSES,
  MESSAGE_STATUSES,
  PIPELINE_STAGES,
};

export function clientStatusBadgeVariant(s: ClientStatus): BadgeVariant {
  if (s === 'Active') return 'success';
  if (s === 'Lead') return 'info';
  if (s === 'Paused') return 'warning';
  return 'neutral';
}

export function projectStatusBadgeVariant(s: ProjectStatus): BadgeVariant {
  if (s === 'Live') return 'success';
  if (s === 'On Hold') return 'warning';
  if (s === 'Review') return 'info';
  return 'neutral';
}

export function invoiceStatusBadgeVariant(s: InvoiceStatus): BadgeVariant {
  if (s === 'Paid') return 'success';
  if (s === 'Overdue') return 'danger';
  if (s === 'Sent') return 'info';
  return 'neutral';
}

export function contractStatusBadgeVariant(s: ContractStatus): BadgeVariant {
  if (s === 'Signed') return 'success';
  if (s === 'Expired') return 'danger';
  if (s === 'Viewed' || s === 'Sent') return 'info';
  return 'neutral';
}

export function taskStatusBadgeVariant(s: TaskStatus): BadgeVariant {
  if (s === 'Done') return 'success';
  if (s === 'Blocked') return 'danger';
  if (s === 'In Progress') return 'info';
  return 'neutral';
}

export function messageStatusBadgeVariant(s: MessageThreadStatus): BadgeVariant {
  if (s === 'Unread') return 'info';
  if (s === 'Waiting') return 'warning';
  return 'neutral';
}

export function projectHealthBadgeVariant(h: ProjectHealthLevel): BadgeVariant {
  if (h === 'blocked') return 'danger';
  if (h === 'at_risk') return 'warning';
  return 'success';
}

export function clientHealthBadgeVariant(h: ClientHealthLevel): BadgeVariant {
  if (h === 'at_risk') return 'danger';
  if (h === 'needs_attention') return 'warning';
  return 'success';
}
