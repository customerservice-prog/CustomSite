import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeCompletedOrder, type ManualStepId } from '@/lib/build-helper/build-steps';

/** localStorage key — must match product spec */
export const BUILD_HELPER_STORAGE_KEY = 'build_helper_state';

export type BuildHelperSitePlan = {
  siteType: string;
  pages: string[];
  goal: string;
};

export type BuildHelperStoreState = {
  enabled: boolean;
  panelCollapsed: boolean;
  activeProjectId: string | null;
  activeClientId: string | null;
  currentStep: string;
  completedSteps: string[];
  sitePlan: BuildHelperSitePlan | null;
  firstRunStripVisible: boolean;
  dismissedEmptyWorkspaceOffer: boolean;
  postCompletePromptPending: boolean;
  hasFinishedFullPipelineOnce: boolean;
  autoEmptyWorkspaceChecked: boolean;
};

type Actions = {
  setEnabled: (on: boolean) => void;
  setPanelCollapsed: (v: boolean) => void;
  setActiveClientId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setSitePlan: (plan: BuildHelperSitePlan | null) => void;
  markManualStep: (id: ManualStepId) => void;
  restartChecklist: () => void;
  /** Internal: apply results from computeReconciledProgress when they change. */
  applyReconciledProgress: (completedSteps: string[], currentStep: string) => void;
  dismissFirstRunStrip: () => void;
  dismissPostCompletePrompt: () => void;
  respondPostCompletePrompt: (keepOn: boolean) => void;
  tryAutoEnableForEmptyWorkspace: (projectCount: number) => void;
  maybeSetPipelineFinished: (allStepsDone: boolean) => void;
};

export type BuildHelperStore = BuildHelperStoreState & Actions;

const initial: BuildHelperStoreState = {
  enabled: true,
  panelCollapsed: false,
  activeProjectId: null,
  activeClientId: null,
  currentStep: 'client',
  completedSteps: [],
  sitePlan: null,
  firstRunStripVisible: false,
  dismissedEmptyWorkspaceOffer: false,
  postCompletePromptPending: false,
  hasFinishedFullPipelineOnce: false,
  autoEmptyWorkspaceChecked: false,
};

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export const useBuildHelperStore = create<BuildHelperStore>()(
  persist(
    (set, get) => ({
      ...initial,

      setEnabled: (on) =>
        set({
          enabled: on,
          panelCollapsed: on ? get().panelCollapsed : false,
          firstRunStripVisible: on ? get().firstRunStripVisible : false,
        }),

      setPanelCollapsed: (v) => set({ panelCollapsed: v }),

      setActiveClientId: (id) => set({ activeClientId: id }),

      setActiveProjectId: (id) => set({ activeProjectId: id }),

      setSitePlan: (plan) => set({ sitePlan: plan }),

      markManualStep: (id) =>
        set((s) => {
          if (s.completedSteps.includes(id)) return s;
          return { completedSteps: normalizeCompletedOrder([...s.completedSteps, id]) };
        }),

      restartChecklist: () =>
        set({
          completedSteps: [],
          sitePlan: null,
          currentStep: 'client',
        }),

      applyReconciledProgress: (completedSteps, currentStep) => {
        const s = get();
        if (arraysEqual(s.completedSteps, completedSteps) && s.currentStep === currentStep) return;
        set({ completedSteps, currentStep });
      },

      dismissFirstRunStrip: () => set({ firstRunStripVisible: false, dismissedEmptyWorkspaceOffer: true }),

      dismissPostCompletePrompt: () => set({ postCompletePromptPending: false, hasFinishedFullPipelineOnce: true }),

      respondPostCompletePrompt: (keepOn) => {
        set({
          postCompletePromptPending: false,
          enabled: keepOn,
          panelCollapsed: keepOn ? false : true,
          hasFinishedFullPipelineOnce: true,
        });
      },

      tryAutoEnableForEmptyWorkspace: (projectCount) => {
        const s = get();
        if (s.autoEmptyWorkspaceChecked || projectCount > 0 || s.dismissedEmptyWorkspaceOffer) {
          if (!s.autoEmptyWorkspaceChecked) set({ autoEmptyWorkspaceChecked: true });
          return;
        }
        set({
          autoEmptyWorkspaceChecked: true,
          enabled: true,
          panelCollapsed: false,
          firstRunStripVisible: true,
        });
      },

      maybeSetPipelineFinished: (allStepsDone) => {
        const s = get();
        if (!allStepsDone || s.hasFinishedFullPipelineOnce || s.postCompletePromptPending) return;
        set({ postCompletePromptPending: true });
      },
    }),
    {
      name: BUILD_HELPER_STORAGE_KEY,
      version: 1,
      migrate: (persistedState, fromVersion) => {
        if (fromVersion === 0) {
          const p = (persistedState ?? {}) as Partial<BuildHelperStoreState>;
          return {
            ...initial,
            ...p,
            enabled: true,
            panelCollapsed: false,
          };
        }
        return persistedState as BuildHelperStoreState;
      },
      partialize: (s) => ({
        enabled: s.enabled,
        panelCollapsed: s.panelCollapsed,
        activeProjectId: s.activeProjectId,
        activeClientId: s.activeClientId,
        currentStep: s.currentStep,
        completedSteps: s.completedSteps,
        sitePlan: s.sitePlan,
        dismissedEmptyWorkspaceOffer: s.dismissedEmptyWorkspaceOffer,
        hasFinishedFullPipelineOnce: s.hasFinishedFullPipelineOnce,
        autoEmptyWorkspaceChecked: s.autoEmptyWorkspaceChecked,
      }),
    }
  )
);

/** One-time migration from pre-spec persist key. */
export function migrateLegacyBuildHelperStorageOnce(): void {
  try {
    const nextKey = BUILD_HELPER_STORAGE_KEY;
    const raw = localStorage.getItem('cs-build-helper-v1');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const st = parsed?.state;
    if (!st || typeof st !== 'object') return;

    const panelCollapsed = Boolean(st.panelCollapsed);
    const plansByProjectId = st.plansByProjectId as Record<string, { siteType?: string; pages?: string[]; goal?: string }> | undefined;
    const perProject = st.perProject as Record<string, { feedbackSent?: boolean; wrapUpMarked?: boolean }> | undefined;
    const firstPid = Object.keys(plansByProjectId ?? {})[0];
    const sitePlan =
      firstPid && plansByProjectId?.[firstPid]
        ? {
            siteType: String(plansByProjectId[firstPid]!.siteType ?? ''),
            pages: Array.isArray(plansByProjectId[firstPid]!.pages) ? plansByProjectId[firstPid]!.pages! : [],
            goal: String(plansByProjectId[firstPid]!.goal ?? ''),
          }
        : null;

    const completed: string[] = [];
    if (firstPid && perProject?.[firstPid]?.feedbackSent) completed.push('feedback');
    if (firstPid && perProject?.[firstPid]?.wrapUpMarked) completed.push('invoice');

    const migrated: BuildHelperStoreState = {
      ...initial,
      enabled: true,
      panelCollapsed,
      activeProjectId: firstPid || null,
      activeClientId: null,
      sitePlan: sitePlan && sitePlan.siteType && sitePlan.pages.length && sitePlan.goal ? sitePlan : null,
      completedSteps: normalizeCompletedOrder(completed),
      currentStep: 'client',
    };

    localStorage.setItem(nextKey, JSON.stringify({ state: migrated, version: 0 }));
    localStorage.removeItem('cs-build-helper-v1');
    useBuildHelperStore.setState(migrated);
  } catch {
    /* */
  }
}

export function buildRbyanPrefillPrompt(
  plan: BuildHelperSitePlan | null,
  clientName: string,
  company: string
): string {
  const st = plan?.siteType ? SITE_TYPE_LABEL(plan.siteType) : 'a conversion-focused';
  const pages = plan?.pages?.length ? plan.pages.join(', ') : 'Home, Services, About, Contact';
  const goal = plan?.goal ? GOAL_LABEL(plan.goal) : 'drive more qualified leads';
  const who = company || clientName || 'the client';
  return `Build a ${st} site with pages ${pages} focused on ${goal}. Client: ${who}. Make it modern, responsive, and conversion-focused.`;
}

function SITE_TYPE_LABEL(id: string): string {
  const m: Record<string, string> = {
    service: 'service business',
    ecommerce: 'e-commerce',
    landing: 'landing page',
    portfolio: 'portfolio / agency',
  };
  return m[id] || id;
}

function GOAL_LABEL(id: string): string {
  const m: Record<string, string> = {
    leads: 'get leads',
    sell: 'sell products',
    book_calls: 'book calls',
    quotes: 'request quotes',
  };
  return m[id] || id;
}

export const RBYAN_PREFILL_STORAGE_KEY = 'cs_rbyan_build_helper_prefill';
