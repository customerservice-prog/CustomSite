/** Supplemental deadlines for dashboard — can merge with derived task/invoice dates later. */
export type DeadlineSeed = {
  id: string;
  title: string;
  when: string;
  type: 'task' | 'invoice' | 'meeting' | 'contract';
};

export const deadlinesSeed: DeadlineSeed[] = [];
