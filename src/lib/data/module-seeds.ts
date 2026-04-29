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

export const proposalsSeed: ProposalRow[] = [];

export const formsSeed: FormRow[] = [
  {
    id: 'fm1',
    name: 'Project kickoff intake',
    status: 'Live',
    responses: 0,
    clientId: null,
    updatedLabel: '—',
  },
];

export const expensesSeed: ExpenseRow[] = [];

export const timeEntriesSeed: TimeEntryRow[] = [];

export const calendarItemsSeed: CalendarItem[] = [];
