/**
 * Plans autonomous touches — confidence-gated. Store applies planned actions
 * (side effects + operator timeline). Mirrors what a job runner + policy engine would do.
 */

import type { RootState } from '@/store/root-state';
import type { OperatorConfidence } from '@/store/operator-state';
import { buildPriorityQueue, hoursSinceIso } from '@/lib/system-intelligence';

const DEBOUNCE_HOURS = 6;
const MAX_ACTIONS_PER_CYCLE = 2;

export type PlannedAutonomousAction =
  | {
      type: 'invoice_reminder';
      invoiceId: string;
      priorityItemId: string;
      confidence: OperatorConfidence;
      rationale: string;
    }
  | {
      type: 'thread_holding';
      threadId: string;
      priorityItemId: string;
      confidence: OperatorConfidence;
      rationale: string;
    }
  | {
      type: 'delivery_nudge_project';
      projectId: string;
      priorityItemId: string;
      confidence: OperatorConfidence;
      rationale: string;
    };

function debounced(aut: { lastAutoAt: string | null } | undefined): boolean {
  if (!aut?.lastAutoAt) return false;
  return hoursSinceIso(aut.lastAutoAt) < DEBOUNCE_HOURS;
}

export function planAutonomousActions(state: RootState): PlannedAutonomousAction[] {
  const queue = buildPriorityQueue(state, 40);
  const out: PlannedAutonomousAction[] = [];

  for (const item of queue) {
    if (out.length >= MAX_ACTIONS_PER_CYCLE) break;
    if (!item.loopTier) continue;

    if (item.id.startsWith('crit-inv-')) {
      if (item.loopTier < 2) continue;
      const invoiceId = item.id.slice('crit-inv-'.length);
      const aut = state.operator.autonomy.invoiceReminders[invoiceId] ?? { count: 0, lastAutoAt: null };
      if (aut.count >= 2) continue;
      if (debounced(aut)) continue;
      out.push({
        type: 'invoice_reminder',
        invoiceId,
        priorityItemId: item.id,
        confidence: item.loopTier >= 3 ? 'high' : 'high',
        rationale:
          item.loopTier >= 3
            ? 'Invoice is in escalating collection tier — operator sends structured payment reminder on your behalf by default.'
            : 'Past reminder tier with no collection touch — operator records a payment nudge to protect AR.',
      });
      continue;
    }

    if (item.id.startsWith('crit-msg-')) {
      if (item.loopTier < 3) continue;
      const threadId = item.id.slice('crit-msg-'.length);
      const aut = state.operator.autonomy.threadHoldingReplies[threadId] ?? { count: 0, lastAutoAt: null };
      if (aut.count >= 1) continue;
      if (debounced(aut)) continue;
      out.push({
        type: 'thread_holding',
        threadId,
        priorityItemId: item.id,
        confidence: 'medium',
        rationale:
          'Inbox loop escalated — medium-confidence default is a short holding reply so the client isn’t left silent.',
      });
      continue;
    }

    if (item.id.startsWith('crit-block-bulk-')) {
      if (item.loopTier < 3) continue;
      const projectId = item.id.slice('crit-block-bulk-'.length);
      const key = projectId;
      const aut = state.operator.autonomy.deliveryNudges[key] ?? { count: 0, lastAutoAt: null };
      if (aut.count >= 2) continue;
      if (debounced(aut)) continue;
      out.push({
        type: 'delivery_nudge_project',
        projectId,
        priorityItemId: item.id,
        confidence: 'high',
        rationale:
          'Delivery stall escalated — operator logs a client nudge on the project record by default to reset the stall clock.',
      });
    }
  }

  return out;
}

export function buildOperatorPulseSummary(state: RootState) {
  const q = buildPriorityQueue(state, 60);
  const events = state.operator.events.filter((e) => !e.undone);
  const autoHigh = events.filter((e) => e.confidence === 'high').length;
  const autoMedium = events.filter((e) => e.confidence === 'medium').length;
  const escalating = q.filter((i) => i.executionPhase === 'escalating').length;
  const criticalOpen = q.filter((i) => i.tier === 'critical').length;
  return {
    autonomousTouches: events.length,
    autonomousHigh: autoHigh,
    autonomousMedium: autoMedium,
    escalatingLoops: escalating,
    criticalOpen,
    /** Narrative split for Pulse — derived, not precise accounting */
    pctHandledNarrative: Math.min(85, 55 + autoHigh * 8),
    pctProgressNarrative: Math.min(30, 10 + criticalOpen * 3),
    pctHumanNarrative: Math.min(25, 5 + escalating * 4),
  };
}
