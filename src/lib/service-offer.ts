import type { ProjectLifecycleStage, ServicePackageId } from '@/lib/types/entities';

/** Public + in-app offer spine: matches marketing and project coaching. */
export type OfferPhaseId = 'diagnose' | 'rebuild' | 'launch' | 'optimize';

export const OFFER_PHASE_ORDER: OfferPhaseId[] = ['diagnose', 'rebuild', 'launch', 'optimize'];

export const OFFER_PHASE_CLIENT: Record<OfferPhaseId, { title: string; line: string }> = {
  diagnose: {
    title: 'Diagnose',
    line: 'We map where your site loses trust, clarity, or the next step — before we rebuild.',
  },
  rebuild: {
    title: 'Rebuild',
    line: 'We ship conversion-focused structure, messaging, and CTAs — desktop and mobile.',
  },
  launch: {
    title: 'Launch',
    line: 'We connect domain, publish, QA, and hand off so buyers hit a live, credible path.',
  },
  optimize: {
    title: 'Optimize',
    line: 'We tune on real behavior: speed, CTAs, tests, and ongoing conversion improvements.',
  },
};

export function lifecycleStageToOfferPhase(stage: ProjectLifecycleStage): OfferPhaseId {
  switch (stage) {
    case 'inquiry':
    case 'discovery':
    case 'proposal_contract':
      return 'diagnose';
    case 'build':
    case 'review':
      return 'rebuild';
    case 'launch':
      return 'launch';
    case 'post_launch':
      return 'optimize';
  }
}

/** True when this offer phase is strictly before the project's current phase. */
export function offerPhaseComplete(phase: OfferPhaseId, current: OfferPhaseId): boolean {
  return OFFER_PHASE_ORDER.indexOf(phase) < OFFER_PHASE_ORDER.indexOf(current);
}

export type ServicePackageDef = {
  id: ServicePackageId;
  name: string;
  headline: string;
  bullets: string[];
};

export const SERVICE_PACKAGES: ServicePackageDef[] = [
  {
    id: 'starter',
    name: 'Starter',
    headline: 'Landing page or tight site',
    bullets: [
      'Conversion-focused structure (one dominant action)',
      'Fast turnaround — ideal when traffic already exists',
      'Mobile + speed pass so the click path holds',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    headline: 'Multi-page acquisition site',
    bullets: [
      'Full story arc: services, proof, contact, optional blog',
      'Messaging + hierarchy tuned for leads and bookings',
      'SEO-ready foundations for sustained inbound',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    headline: 'Full system + funnel thinking',
    bullets: [
      'Funnel-grade flows (offers, proof, secondary CTAs)',
      'Launch + measurement mindset baked in',
      'Ongoing optimization window (post-launch program)',
    ],
  },
];

export function getServicePackage(id: ServicePackageId | null | undefined): ServicePackageDef | undefined {
  if (!id) return undefined;
  return SERVICE_PACKAGES.find((p) => p.id === id);
}

/** Shown in studio as “proof of motion” without needing real case-study data yet. */
export const PROOF_ACTIVITY_CHIPS = [
  'CTA clarified',
  'Flow improved',
  'Mobile optimized',
  'Proof elevated',
  'Forms tracked',
] as const;

export const RETAINER_VALUE_LINE =
  'Post-launch: we keep tightening conversion — speed budgets, CTA tests, and quarterly improvements so the site does not rot.';
