export type OperatorConfidence = 'high' | 'medium' | 'low';

export type OperatorEventKind =
  | 'auto_invoice_reminder'
  | 'auto_holding_reply'
  | 'auto_delivery_nudge'
  | 'escalation_scheduled'
  | 'cancelled_by_user';

export type OperatorEvent = {
  id: string;
  createdAt: string;
  kind: OperatorEventKind;
  title: string;
  detail: string;
  /** Transparency — why the operator acted */
  rationale: string;
  confidence: OperatorConfidence;
  entityKind: 'invoice' | 'message' | 'task' | 'project';
  entityId: string;
  priorityItemId?: string;
  reversible: boolean;
  undone: boolean;
};

export type OperatorAutonomy = {
  invoiceReminders: Record<string, { count: number; lastAutoAt: string | null }>;
  threadHoldingReplies: Record<string, { count: number; lastAutoAt: string | null }>;
  deliveryNudges: Record<string, { count: number; lastAutoAt: string | null }>;
};

export type OperatorState = {
  events: OperatorEvent[];
  autonomy: OperatorAutonomy;
};

export function emptyOperatorState(): OperatorState {
  return {
    events: [],
    autonomy: {
      invoiceReminders: {},
      threadHoldingReplies: {},
      deliveryNudges: {},
    },
  };
}
