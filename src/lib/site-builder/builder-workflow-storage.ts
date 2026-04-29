export type ReviewStatus = 'draft' | 'review_requested' | 'ready_for_review';

export type ChangelogEntry = { at: string; message: string };

export type BuilderWorkflowState = {
  reviewStatus: ReviewStatus;
  feedbackNotes: string;
  changelog: ChangelogEntry[];
};

const KEY = 'customsite_builder_workflow_v1';

const defaultState = (): BuilderWorkflowState => ({
  reviewStatus: 'draft',
  feedbackNotes: '',
  changelog: [],
});

export function loadBuilderWorkflow(projectId: string): BuilderWorkflowState {
  try {
    const raw = localStorage.getItem(`${KEY}:${projectId}`);
    if (!raw) return defaultState();
    const o = JSON.parse(raw) as Partial<BuilderWorkflowState>;
    return {
      reviewStatus:
        o.reviewStatus === 'review_requested' || o.reviewStatus === 'ready_for_review' || o.reviewStatus === 'draft'
          ? o.reviewStatus
          : 'draft',
      feedbackNotes: typeof o.feedbackNotes === 'string' ? o.feedbackNotes : '',
      changelog: Array.isArray(o.changelog) ? o.changelog.filter((c) => c && typeof c.message === 'string' && c.at) : [],
    };
  } catch {
    return defaultState();
  }
}

export function saveBuilderWorkflow(projectId: string, state: BuilderWorkflowState) {
  try {
    const changelog = state.changelog.slice(-80);
    localStorage.setItem(`${KEY}:${projectId}`, JSON.stringify({ ...state, changelog }));
  } catch {
    /* */
  }
}

function notifyBuilderWorkflowUpdated(projectId: string) {
  try {
    window.dispatchEvent(new CustomEvent('customsite-builder-workflow', { detail: { projectId } }));
  } catch {
    /* */
  }
}

export function appendChangelog(projectId: string, message: string, prev: BuilderWorkflowState): BuilderWorkflowState {
  const entry: ChangelogEntry = { at: new Date().toISOString(), message };
  const next = { ...prev, changelog: [...prev.changelog, entry].slice(-80) };
  saveBuilderWorkflow(projectId, next);
  notifyBuilderWorkflowUpdated(projectId);
  return next;
}
