import type { ProjectLifecycleStage } from '@/lib/types/entities';
import type { ProjectStatus } from '@/lib/statuses';

export const LIFECYCLE_ORDER: ProjectLifecycleStage[] = [
  'inquiry',
  'discovery',
  'proposal_contract',
  'build',
  'review',
  'launch',
  'post_launch',
];

export const LIFECYCLE_LABELS: Record<ProjectLifecycleStage, string> = {
  inquiry: 'Lead / inquiry',
  discovery: 'Discovery',
  proposal_contract: 'Proposal / contract',
  build: 'Build',
  review: 'Review',
  launch: 'Launch',
  post_launch: 'Post-launch / optimization',
};

/** Simple client-facing status for portal and emails. */
export function clientDeliveryStatusLabel(stage: ProjectLifecycleStage): 'In build' | 'Ready for review' | 'Live' {
  if (stage === 'post_launch' || stage === 'launch') return 'Live';
  if (stage === 'review') return 'Ready for review';
  return 'In build';
}

export function nextLifecycleStage(current: ProjectLifecycleStage): ProjectLifecycleStage | null {
  const i = LIFECYCLE_ORDER.indexOf(current);
  if (i < 0 || i >= LIFECYCLE_ORDER.length - 1) return null;
  return LIFECYCLE_ORDER[i + 1]!;
}

/** Keep legacy `status` roughly aligned when lifecycle advances. */
export function projectStatusForLifecycle(stage: ProjectLifecycleStage): ProjectStatus {
  switch (stage) {
    case 'inquiry':
    case 'discovery':
      return 'Planning';
    case 'proposal_contract':
      return 'Design';
    case 'build':
      return 'Development';
    case 'review':
      return 'Review';
    case 'launch':
      return 'Review';
    case 'post_launch':
      return 'Live';
    default:
      return 'Planning';
  }
}
