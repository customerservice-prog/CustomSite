import type { Task } from '@/lib/types/entities';
import {
  OFFER_PHASE_CLIENT,
  OFFER_PHASE_ORDER,
  type OfferPhaseId,
} from '@/lib/service-offer';

/** 1–4 for “You are on step X.” */
export function offerStepNumber(phase: OfferPhaseId): number {
  return OFFER_PHASE_ORDER.indexOf(phase) + 1;
}

/** Plain language for what this phase means day-to-day (no “framework” tone). */
export function narrativeThisPhase(phase: OfferPhaseId): string {
  const by: Record<OfferPhaseId, string> = {
    diagnose: 'Reviewing your current site to see where visitors lose interest or miss the next step.',
    rebuild: 'Updating pages, headlines, and layout so the site guides people toward one clear action.',
    launch: 'Putting the site on your domain, checking forms and links, and making sure it feels ready for customers.',
    optimize: 'Watching how people use the live site and tightening headlines, speed, and calls-to-action over time.',
  };
  return by[phase];
}

export function narrativeWhatsNext(phase: OfferPhaseId): string {
  const i = OFFER_PHASE_ORDER.indexOf(phase);
  if (i < 0 || i >= OFFER_PHASE_ORDER.length - 1) {
    return 'We will keep suggesting small wins on the live site as you collect visits and leads.';
  }
  const next = OFFER_PHASE_ORDER[i + 1]!;
  const label = OFFER_PHASE_CLIENT[next].title;
  const hint =
    next === 'rebuild'
      ? 'Then we focus on the actual pages and visuals you approved in scope.'
      : next === 'launch'
        ? 'Then we schedule go-live, DNS, and a final walkthrough together.'
        : next === 'optimize'
          ? 'Then we stay close to real traffic and keep improving what matters.'
          : OFFER_PHASE_CLIENT[next].line;
  return `What happens next: ${label} — ${hint}`;
}

/** Best single line for “what we’re touching right now” from open work. */
export function primaryFocusFromTasks(tasks: Task[]): string | null {
  const open = tasks.filter((t) => t.status !== 'Done');
  const inProg = open.find((t) => t.status === 'In Progress');
  if (inProg) return inProg.title;
  return open[0]?.title ?? null;
}

export function focusFallbackForPhase(phase: OfferPhaseId): string {
  const by: Record<OfferPhaseId, string> = {
    diagnose: 'Kickoff notes, audit findings, and the written list of what will change.',
    rebuild: 'Homepage and key pages — copy, sections, and mobile layout.',
    launch: 'DNS, SSL, final checks, and your walkthrough before we call it live.',
    optimize: 'Performance checks, CTA tweaks, and follow-up edits from real use.',
  };
  return by[phase];
}

export const AFTER_LIVE_LINE =
  'After go-live, we keep improving headlines, forms, and mobile speed as you see real visits and inquiries.';

export const POST_LAUNCH_CLIENT_LINE =
  'We stay on for small fixes, speed checks, and headline or CTA tweaks as real visitors show what matters.';
