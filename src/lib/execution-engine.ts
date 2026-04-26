/**
 * Closed-loop execution layer: every critical Pulse item maps to
 * revenue / communication / delivery loops with time tiers (waiting → escalating).
 * Advancing a loop resets clocks via store actions — server-side jobs would mirror the same thresholds.
 */

import type { RootState } from '@/store/root-state';
import type { PriorityQueueItem } from '@/lib/system-intelligence';

function hoursSinceIso(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 3600000);
}

export const EXECUTION_REMINDER_HOURS = 24;
export const EXECUTION_ESCALATE_HOURS = 72;

export type ExecutionLoopKind = 'revenue' | 'communication' | 'delivery';
export type ExecutionSurfaceState = 'waiting' | 'escalating';

function tierFromHours(h: number): 1 | 2 | 3 {
  if (h < EXECUTION_REMINDER_HOURS) return 1;
  if (h < EXECUTION_ESCALATE_HOURS) return 2;
  return 3;
}

function surfaceFromTier(tier: 1 | 2 | 3): ExecutionSurfaceState {
  return tier === 3 ? 'escalating' : 'waiting';
}

function getLoopMetadataForPriorityId(state: RootState, itemId: string): Partial<PriorityQueueItem> | null {
  if (itemId === 'ok') return null;

  if (itemId.startsWith('crit-block-bulk-')) {
    const projectId = itemId.slice('crit-block-bulk-'.length);
    const proj = state.projects[projectId];
    if (!proj) return null;
    const h = hoursSinceIso(proj.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'delivery',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Delivery stall · T+${Math.round(h)}h since project moved`,
      loopSystemActionLabel: 'Log stall nudge (reset clock)',
      autoNextLabel:
        tier === 1
          ? `T+${EXECUTION_REMINDER_HOURS}h idle → Pulse bumps this to reminder tier.`
          : tier === 2
            ? `T+${EXECUTION_ESCALATE_HOURS}h idle → marked escalating until you unblock or reset dates.`
            : 'Escalating — unblock, get client input, or reset timeline explicitly.',
    };
  }

  if (itemId.startsWith('crit-block-')) {
    const taskId = itemId.slice('crit-block-'.length);
    const task = state.tasks[taskId];
    if (!task) return null;
    const h = hoursSinceIso(task.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'delivery',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Blocked task clock · T+${Math.round(h)}h`,
      loopSystemActionLabel: 'Log client nudge (reset clock)',
      autoNextLabel:
        tier === 3
          ? 'Escalating stall — the delivery loop stays red until the blocker clears.'
          : `Idle past ${EXECUTION_ESCALATE_HOURS}h surfaces as automatic escalation in Pulse.`,
    };
  }

  if (itemId.startsWith('crit-inv-')) {
    const invoiceId = itemId.slice('crit-inv-'.length);
    const inv = state.invoices[invoiceId];
    if (!inv) return null;
    const h = hoursSinceIso(inv.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'revenue',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Revenue loop · T+${Math.round(h)}h since last collection touch`,
      loopSystemActionLabel: 'Log follow-up (reset collection clock)',
      autoNextLabel:
        tier === 1
          ? `No touch in ${EXECUTION_REMINDER_HOURS}h → automatic reminder tier.`
          : tier === 2
            ? `No touch in ${EXECUTION_ESCALATE_HOURS}h → escalating AR — treat as cash risk.`
            : 'Escalating — negotiate, partial pay, or stop work under policy.',
    };
  }

  if (itemId.startsWith('crit-msg-')) {
    const threadId = itemId.slice('crit-msg-'.length);
    const th = state.messageThreads[threadId];
    if (!th) return null;
    const h = hoursSinceIso(th.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'communication',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Reply loop · T+${Math.round(h)}h`,
      loopSystemActionLabel: 'Send holding reply (advance loop)',
      autoNextLabel:
        tier === 3
          ? 'Escalating — call or set expectations; inbox silence is a decision.'
          : `T+${EXECUTION_ESCALATE_HOURS}h without reply → automatic escalation surface.`,
    };
  }

  if (itemId.startsWith('imp-due-')) {
    const taskId = itemId.slice('imp-due-'.length);
    const task = state.tasks[taskId];
    if (!task) return null;
    const h = hoursSinceIso(task.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'delivery',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Ship loop · T+${Math.round(h)}h on due-today item`,
      loopSystemActionLabel: 'Acknowledge / reset clock',
      autoNextLabel:
        tier === 3
          ? 'Escalating — ship, delegate, or reset the deadline with the client.'
          : 'Idle time still counts — the loop tightens automatically.',
    };
  }

  if (itemId.startsWith('imp-burn-')) {
    const projectId = itemId.slice('imp-burn-'.length);
    const proj = state.projects[projectId];
    if (!proj) return null;
    const h = hoursSinceIso(proj.updatedAt);
    const tier = tierFromHours(h);
    return {
      loopKind: 'delivery',
      executionPhase: surfaceFromTier(tier),
      loopTier: tier,
      loopTimerLabel: `Scope loop · T+${Math.round(h)}h since project moved`,
      loopSystemActionLabel: 'Log scope check-in',
      autoNextLabel:
        tier === 3
          ? 'Escalating burn — align on scope or change order before margin is gone.'
          : 'Automatic escalation if budget talk keeps sliding.',
    };
  }

  return null;
}

export function applyExecutionLoopLayer(state: RootState, item: PriorityQueueItem): PriorityQueueItem {
  const layer = getLoopMetadataForPriorityId(state, item.id);
  if (!layer) return item;
  return { ...item, ...layer };
}
