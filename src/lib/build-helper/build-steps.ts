import type { Project } from '@/lib/types/entities';
import type { ProjectSiteWorkspaceRow } from '@/store/use-project-site-workspace-store';

/** Persisted + reconciled Build Helper shape used by step.check(). */
export type BuildHelperCheckState = {
  activeClientId: string | null;
  activeProjectId: string | null;
  completedSteps: string[];
  sitePlan: { siteType: string; pages: string[]; goal: string } | null;
};

export type ProjectSiteSnapshot = {
  filesLength: number;
  lastSavedAt: number | null;
  isPublished: boolean;
};

export type BuildStepDef = {
  id: string;
  title: string;
  check: (state: BuildHelperCheckState, projectSite: ProjectSiteSnapshot) => boolean;
};

export const MANUAL_STEP_IDS = ['qa', 'feedback', 'invoice'] as const;
export type ManualStepId = (typeof MANUAL_STEP_IDS)[number];

export const BUILD_STEPS: BuildStepDef[] = [
  {
    id: 'client',
    title: 'Setup client',
    check: (st) => Boolean(st.activeClientId && String(st.activeClientId).trim()),
  },
  {
    id: 'project',
    title: 'Create project',
    check: (st) => Boolean(st.activeProjectId && String(st.activeProjectId).trim()),
  },
  {
    id: 'plan',
    title: 'Plan site',
    check: (st) =>
      Boolean(
        st.sitePlan &&
          String(st.sitePlan.siteType || '').trim() &&
          Array.isArray(st.sitePlan.pages) &&
          st.sitePlan.pages.length > 0 &&
          String(st.sitePlan.goal || '').trim()
      ),
  },
  {
    id: 'rbyan',
    title: 'Generate with AI Builder',
    check: (_st, projectSite) => projectSite.filesLength > 0,
  },
  {
    id: 'edit',
    title: 'Edit in Site Builder',
    check: (_st, projectSite) => projectSite.lastSavedAt != null,
  },
  {
    id: 'qa',
    title: 'Preview and QA',
    check: (st) => st.completedSteps.includes('qa'),
  },
  {
    id: 'feedback',
    title: 'Send for feedback',
    check: (st) => st.completedSteps.includes('feedback'),
  },
  {
    id: 'publish',
    title: 'Publish site',
    check: (_st, projectSite) => projectSite.isPublished === true,
  },
  {
    id: 'invoice',
    title: 'Invoice / wrap up',
    check: (st) => st.completedSteps.includes('invoice'),
  },
];

export function getProjectSiteSnapshot(
  _activeProjectId: string | null,
  wsRow: ProjectSiteWorkspaceRow | undefined,
  project: Project | undefined
): ProjectSiteSnapshot {
  const filesLength = wsRow?.site?.files?.length ?? 0;
  const lastSavedAt = wsRow?.lastSavedAt ?? null;
  const isPublished = project?.siteStatus === 'live';
  return { filesLength, lastSavedAt, isPublished };
}

/**
 * Merges auto-detected step ids with sticky manual ids (qa, feedback, invoice).
 * Manual ids stay in completedSteps until cleared by restart.
 */
export function computeReconciledProgress(
  base: BuildHelperCheckState,
  projectSite: ProjectSiteSnapshot,
  prevCompleted: string[]
): { completedSteps: string[]; currentStep: string } {
  const next = new Set<string>();

  for (const id of MANUAL_STEP_IDS) {
    if (prevCompleted.includes(id)) next.add(id);
  }

  for (const step of BUILD_STEPS) {
    if (MANUAL_STEP_IDS.includes(step.id as ManualStepId)) continue;
    if (step.check(base, projectSite)) next.add(step.id);
  }

  const completedSteps = BUILD_STEPS.map((s) => s.id).filter((id) => next.has(id));
  const pseudo: BuildHelperCheckState = { ...base, completedSteps };
  const firstIncomplete = BUILD_STEPS.find((step) => !step.check(pseudo, projectSite));
  const currentStep = firstIncomplete ? firstIncomplete.id : 'complete';

  return { completedSteps, currentStep };
}

export function normalizeCompletedOrder(completed: string[]): string[] {
  return BUILD_STEPS.map((s) => s.id).filter((id) => completed.includes(id));
}

export function countCompleted(completedSteps: string[]): number {
  return completedSteps.length;
}
