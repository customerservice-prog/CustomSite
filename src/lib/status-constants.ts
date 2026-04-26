export const CLIENT_STATUSES = ['Lead', 'Active', 'Paused', 'Archived'] as const;
export const PROJECT_STATUSES = ['Planning', 'Design', 'Development', 'Review', 'Live', 'On Hold'] as const;
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as const;
export const CONTRACT_STATUSES = ['Draft', 'Sent', 'Viewed', 'Signed', 'Expired'] as const;
export const TASK_STATUSES = ['Todo', 'In Progress', 'Blocked', 'Done'] as const;
export const MESSAGE_STATUSES = ['Unread', 'Replied', 'Waiting'] as const;
export const PIPELINE_STAGES = [
  'New Lead',
  'Discovery',
  'Proposal Sent',
  'Contract Sent',
  'Won',
  'Lost',
] as const;
