/** Client-facing module rows — local seeds for proposals, forms, expenses, time, and calendar. */

export type ProposalRow = {
  id: string;
  clientId: string;
  projectId: string | null;
  title: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Declined';
  value: number;
  sentDate: string | null;
  respondedDate: string | null;
  updatedLabel: string;
};

export type FormRow = {
  id: string;
  name: string;
  status: 'Live' | 'Draft' | 'Archived';
  responses: number;
  clientId: string | null;
  updatedLabel: string;
};

export type ExpenseRow = {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  reimbursable: boolean;
  projectId: string | null;
  clientId: string | null;
  date: string;
  status: 'Pending' | 'Approved' | 'Reimbursed';
};

export type TimeEntryRow = {
  id: string;
  userId: string;
  projectId: string;
  date: string;
  hours: number;
  billable: boolean;
  note: string;
};

export type CalendarItem = {
  id: string;
  title: string;
  kind: 'meeting' | 'milestone' | 'internal' | 'invoice_due';
  date: string;
  time: string | null;
  clientId: string | null;
  projectId: string | null;
  linkedInvoiceId?: string | null;
};

export const proposalsSeed: ProposalRow[] = [
  {
    id: 'pr1',
    clientId: 'c1',
    projectId: 'p1',
    title: 'Website redesign — phase 2 scope',
    status: 'Viewed',
    value: 48000,
    sentDate: 'Apr 18, 2026',
    respondedDate: null,
    updatedLabel: 'Apr 22',
  },
  {
    id: 'pr2',
    clientId: 'c2',
    projectId: 'p3',
    title: 'Brand refresh + component library',
    status: 'Sent',
    value: 62000,
    sentDate: 'Apr 24, 2026',
    respondedDate: null,
    updatedLabel: 'Apr 24',
  },
  {
    id: 'pr3',
    clientId: 'c3',
    projectId: null,
    title: 'Retainer expansion (Q3)',
    status: 'Accepted',
    value: 36000,
    sentDate: 'Apr 1, 2026',
    respondedDate: 'Apr 5, 2026',
    updatedLabel: 'Apr 5',
  },
];

export const formsSeed: FormRow[] = [
  {
    id: 'fm1',
    name: 'Project kickoff intake',
    status: 'Live',
    responses: 42,
    clientId: null,
    updatedLabel: 'Apr 20',
  },
  {
    id: 'fm2',
    name: 'Creative approval checklist',
    status: 'Live',
    responses: 18,
    clientId: 'c1',
    updatedLabel: 'Apr 21',
  },
  {
    id: 'fm3',
    name: 'NDA — light touch',
    status: 'Draft',
    responses: 0,
    clientId: null,
    updatedLabel: 'Apr 10',
  },
];

export const expensesSeed: ExpenseRow[] = [
  {
    id: 'ex1',
    vendor: 'Adobe Creative Cloud',
    category: 'Software',
    amount: 79.99,
    reimbursable: false,
    projectId: null,
    clientId: null,
    date: '2026-04-22',
    status: 'Approved',
  },
  {
    id: 'ex2',
    vendor: 'United Airlines',
    category: 'Travel',
    amount: 412.5,
    reimbursable: true,
    projectId: 'p2',
    clientId: 'c2',
    date: '2026-04-19',
    status: 'Pending',
  },
  {
    id: 'ex3',
    vendor: 'WeWork',
    category: 'Facilities',
    amount: 890,
    reimbursable: false,
    projectId: null,
    clientId: null,
    date: '2026-04-01',
    status: 'Approved',
  },
];

export const timeEntriesSeed: TimeEntryRow[] = [
  { id: 'te1', userId: 'u1', projectId: 'p1', date: '2026-04-24', hours: 5.5, billable: true, note: 'Design QA + handoff' },
  { id: 'te2', userId: 'u2', projectId: 'p3', date: '2026-04-24', hours: 3, billable: true, note: 'Accessibility audit' },
  { id: 'te3', userId: 'u1', projectId: 'p2', date: '2026-04-23', hours: 2, billable: false, note: 'Internal planning' },
  { id: 'te4', userId: 'u3', projectId: 'p4', date: '2026-04-23', hours: 6, billable: true, note: 'Component build-out' },
];

export const calendarItemsSeed: CalendarItem[] = [
  {
    id: 'cal1',
    title: 'BrightPath — weekly sync',
    kind: 'meeting',
    date: '2026-04-26',
    time: '10:00 AM',
    clientId: 'c2',
    projectId: 'p3',
  },
  {
    id: 'cal2',
    title: 'Homepage launch milestone',
    kind: 'milestone',
    date: '2026-04-28',
    time: null,
    clientId: 'c1',
    projectId: 'p1',
  },
  {
    id: 'cal3',
    title: 'Invoice INV-1042 due',
    kind: 'invoice_due',
    date: '2026-04-30',
    time: null,
    clientId: 'c3',
    projectId: 'p5',
    linkedInvoiceId: 'i2',
  },
  {
    id: 'cal4',
    title: 'Team retro',
    kind: 'internal',
    date: '2026-04-25',
    time: '4:00 PM',
    clientId: null,
    projectId: null,
  },
];
