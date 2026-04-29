import type { Project, ProjectLifecycleStage } from '@/lib/types/entities';

const KEY = 'customsite_client_experience_v1';

export type ClientRebuildStage = 'diagnose' | 'rebuild' | 'review' | 'launch';

export const REBUILD_STAGES: { id: ClientRebuildStage; label: string; line: string }[] = [
  {
    id: 'diagnose',
    label: 'Diagnose',
    line: 'We review what is working and what is holding conversions back.',
  },
  {
    id: 'rebuild',
    label: 'Rebuild',
    line: 'We reshape your pages, story, and calls-to-action for clarity and trust.',
  },
  {
    id: 'review',
    label: 'Review',
    line: 'You see the new version, share notes, and we refine together.',
  },
  {
    id: 'launch',
    label: 'Launch',
    line: 'We go live, check every device, and hand you a site you are proud to send traffic to.',
  },
];

export const REBUILD_PROGRESS_PCT: Record<ClientRebuildStage, number> = {
  diagnose: 25,
  rebuild: 50,
  review: 75,
  launch: 100,
};

export type ClientPortalExperience = {
  currentFocus: string;
  etaNote: string;
  nextStep: string;
  rebuildStage: ClientRebuildStage;
};

function lifecycleToDefaultRebuildStage(stage: ProjectLifecycleStage): ClientRebuildStage {
  if (stage === 'inquiry' || stage === 'discovery' || stage === 'proposal_contract') return 'diagnose';
  if (stage === 'build') return 'rebuild';
  if (stage === 'review') return 'review';
  return 'launch';
}

function defaultFocusCopy(project: Project): string {
  return `We are rebuilding your main pages for ${project.name} so visitors understand what you offer and what to do next.`;
}

function defaultNextStepCopy(_project: Project, stage: ProjectLifecycleStage): string {
  if (stage === 'review') return 'We will send you the next version for review shortly. When it lands, take a look and leave any notes below.';
  if (stage === 'build') return 'We are actively shaping your site. We will ping you when the next preview is ready to review.';
  if (stage === 'launch' || stage === 'post_launch') return 'We are finishing launch checks. If you have a domain or access we need, we will reach out on your message thread.';
  return 'We are aligning on goals and priorities. Watch this space — your next preview will appear here.';
}

export function defaultClientPortalExperience(project: Project): ClientPortalExperience {
  const rebuildStage = lifecycleToDefaultRebuildStage(project.lifecycleStage);
  return {
    currentFocus: defaultFocusCopy(project),
    etaNote: 'About 2–3 business days for the next milestone',
    nextStep: defaultNextStepCopy(project, project.lifecycleStage),
    rebuildStage,
  };
}

export function loadClientPortalExperience(projectId: string, project: Project): ClientPortalExperience {
  const base = defaultClientPortalExperience(project);
  /** Stage always follows project lifecycle so progress stays accurate (copy can still be overridden). */
  const rebuildStage = lifecycleToDefaultRebuildStage(project.lifecycleStage);
  try {
    const raw = localStorage.getItem(`${KEY}:${projectId}`);
    if (!raw) return { ...base, rebuildStage };
    const o = JSON.parse(raw) as Partial<ClientPortalExperience>;
    return {
      currentFocus: typeof o.currentFocus === 'string' && o.currentFocus.trim() ? o.currentFocus.trim() : base.currentFocus,
      etaNote: typeof o.etaNote === 'string' && o.etaNote.trim() ? o.etaNote.trim() : base.etaNote,
      nextStep: typeof o.nextStep === 'string' && o.nextStep.trim() ? o.nextStep.trim() : base.nextStep,
      rebuildStage,
    };
  } catch {
    return { ...base, rebuildStage };
  }
}

export function saveClientPortalExperience(projectId: string, exp: ClientPortalExperience) {
  try {
    localStorage.setItem(`${KEY}:${projectId}`, JSON.stringify(exp));
  } catch {
    /* */
  }
}
