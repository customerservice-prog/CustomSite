import type { OfferPhaseId } from '@/lib/service-offer';

/** Bullets for “Right now” on the project page — reads like a live build, not a task dump. */
export function liveBuildRightNowLines(phase: OfferPhaseId, primaryFromTasks: string | null): string[] {
  const primary = primaryFromTasks?.trim();
  const byPhase: Record<OfferPhaseId, string[]> = {
    diagnose: ['Current site mapped against conversion goals', 'Where visitors drop off is being documented'],
    rebuild: ['Homepage structure is being rewritten', 'CTA placement is being optimized'],
    launch: ['DNS, SSL, and forms are being verified', 'Final walkthrough slots are being lined up'],
    optimize: ['Live traffic and submissions are being reviewed', 'Next headline or speed fix is queued'],
  };
  const core = byPhase[phase];
  if (primary) return [primary, ...core].slice(0, 4);
  return core;
}

/** Bullets for “Next” — agency sequence, client-facing language. */
export function liveBuildNextLines(phase: OfferPhaseId, deliveryLabel: 'In build' | 'Ready for review' | 'Live'): string[] {
  if (deliveryLabel === 'Ready for review') {
    return ['Internal QA wrap-up', 'Your review round (one consolidated thread)', 'Revisions, then publish or go-live'];
  }
  if (deliveryLabel === 'Live') {
    return ['Monitor leads and checkout', 'Ship follow-up tweaks from real usage', 'Invoice any remaining milestones'];
  }
  const byPhase: Record<OfferPhaseId, string[]> = {
    diagnose: ['Deliver audit summary', 'Align on scope and timeline', 'Kick off rebuild'],
    rebuild: ['Internal review', 'Client review', 'Publish to staging / preview'],
    launch: ['Client sign-off', 'Point production DNS', 'Hand off credentials and training'],
    optimize: ['Ship the first optimization batch', 'Review results with the client'],
  };
  return byPhase[phase];
}
