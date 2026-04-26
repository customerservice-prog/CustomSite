/** Supplemental deadlines for dashboard — can merge with derived task/invoice dates later. */
export type DeadlineSeed = {
  id: string;
  title: string;
  when: string;
  type: 'task' | 'invoice' | 'meeting' | 'contract';
};

export const deadlinesSeed: DeadlineSeed[] = [
  { id: 'd1', title: 'Homepage wireframes', when: 'Tomorrow', type: 'task' },
  { id: 'd2', title: 'Invoice #1041 follow-up', when: 'Today', type: 'invoice' },
  { id: 'd3', title: 'Brand strategy call — SJ Studio', when: 'Friday', type: 'meeting' },
  { id: 'd4', title: 'Contract renewal — Northwind', when: 'Next week', type: 'contract' },
];
