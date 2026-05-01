/** Supplemental deadlines for dashboard — can merge with derived task/invoice dates later. */
export type DeadlineSeed = {
  id: string;
  title: string;
  when: string;
  type: 'task' | 'invoice' | 'meeting' | 'contract' | 'milestone';
  clientId?: string | null;
  projectId?: string | null;
  linkedInvoiceId?: string | null;
  linkedTaskId?: string | null;
};

export const deadlinesSeed: DeadlineSeed[] = [];
