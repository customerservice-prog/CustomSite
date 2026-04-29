import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildHelperSitePlan, PerProjectBuildHelper } from '@/lib/build-helper/constants';
import {
  EDIT_CHECK_KEYS,
  PUBLISH_CHECK_KEYS,
  QA_CHECK_KEYS,
} from '@/lib/build-helper/constants';

const STORAGE_KEY = 'cs-build-helper-v1';

type State = {
  enabled: boolean;
  /** When enabled, panel is hidden until user opens from FAB */
  panelCollapsed: boolean;
  plansByProjectId: Record<string, BuildHelperSitePlan>;
  perProject: Record<string, PerProjectBuildHelper>;
  firstRunStripVisible: boolean;
  dismissedEmptyWorkspaceOffer: boolean;
  postCompletePromptPending: boolean;
  hasFinishedFullPipelineOnce: boolean;
  autoEmptyWorkspaceChecked: boolean;
};

type Actions = {
  setEnabled: (on: boolean) => void;
  setPanelCollapsed: (v: boolean) => void;
  saveSitePlan: (projectId: string, plan: Omit<BuildHelperSitePlan, 'updatedAt'>) => void;
  patchProjectFlags: (projectId: string, patch: Partial<PerProjectBuildHelper>) => void;
  setQaCheck: (projectId: string, key: keyof NonNullable<PerProjectBuildHelper['qa']>, value: boolean) => void;
  setPublishCheck: (
    projectId: string,
    key: keyof NonNullable<PerProjectBuildHelper['publishQa']>,
    value: boolean
  ) => void;
  setEditCheck: (
    projectId: string,
    key: keyof NonNullable<PerProjectBuildHelper['editChecklist']>,
    value: boolean
  ) => void;
  dismissFirstRunStrip: () => void;
  dismissPostCompletePrompt: () => void;
  respondPostCompletePrompt: (keepOn: boolean) => void;
  tryAutoEnableForEmptyWorkspace: (projectCount: number) => void;
  resetProgressForActiveProject: (projectId: string | null) => void;
  markAllCompleteForProject: (projectId: string | null) => void;
  maybeSetPipelineFinished: (allStepsDone: boolean) => void;
};

export type BuildHelperStore = State & Actions;

const emptyFlags = (): PerProjectBuildHelper => ({
  qa: {},
  publishQa: {},
  editChecklist: {},
});

export const useBuildHelperStore = create<BuildHelperStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      panelCollapsed: false,
      plansByProjectId: {},
      perProject: {},
      firstRunStripVisible: false,
      dismissedEmptyWorkspaceOffer: false,
      postCompletePromptPending: false,
      hasFinishedFullPipelineOnce: false,
      autoEmptyWorkspaceChecked: false,

      setEnabled: (on) =>
        set({
          enabled: on,
          panelCollapsed: on ? get().panelCollapsed : false,
          firstRunStripVisible: on ? get().firstRunStripVisible : false,
        }),

      setPanelCollapsed: (v) => set({ panelCollapsed: v }),

      saveSitePlan: (projectId, plan) => {
        const updatedAt = new Date().toISOString();
        set((s) => ({
          plansByProjectId: {
            ...s.plansByProjectId,
            [projectId]: { ...plan, updatedAt },
          },
        }));
      },

      patchProjectFlags: (projectId, patch) => {
        if (!projectId) return;
        set((s) => {
          const cur = s.perProject[projectId] ?? emptyFlags();
          return {
            perProject: {
              ...s.perProject,
              [projectId]: { ...cur, ...patch },
            },
          };
        });
      },

      setQaCheck: (projectId, key, value) => {
        if (!projectId) return;
        set((s) => {
          const cur = s.perProject[projectId] ?? emptyFlags();
          return {
            perProject: {
              ...s.perProject,
              [projectId]: { ...cur, qa: { ...cur.qa, [key]: value } },
            },
          };
        });
      },

      setPublishCheck: (projectId, key, value) => {
        if (!projectId) return;
        set((s) => {
          const cur = s.perProject[projectId] ?? emptyFlags();
          return {
            perProject: {
              ...s.perProject,
              [projectId]: { ...cur, publishQa: { ...cur.publishQa, [key]: value } },
            },
          };
        });
      },

      setEditCheck: (projectId, key, value) => {
        if (!projectId) return;
        set((s) => {
          const cur = s.perProject[projectId] ?? emptyFlags();
          return {
            perProject: {
              ...s.perProject,
              [projectId]: { ...cur, editChecklist: { ...cur.editChecklist, [key]: value } },
            },
          };
        });
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

      resetProgressForActiveProject: (projectId) => {
        if (!projectId) return;
        set((s) => {
          const { [projectId]: _removed, ...rest } = s.perProject;
          const { [projectId]: _p, ...plans } = s.plansByProjectId;
          return { perProject: rest, plansByProjectId: plans };
        });
      },

      markAllCompleteForProject: (projectId) => {
        if (!projectId) return;
        const qa = Object.fromEntries(QA_CHECK_KEYS.map((k) => [k, true])) as PerProjectBuildHelper['qa'];
        const publishQa = Object.fromEntries(PUBLISH_CHECK_KEYS.map((k) => [k, true])) as NonNullable<
          PerProjectBuildHelper['publishQa']
        >;
        const editChecklist = Object.fromEntries(EDIT_CHECK_KEYS.map((k) => [k, true])) as NonNullable<
          PerProjectBuildHelper['editChecklist']
        >;
        set((s) => ({
          perProject: {
            ...s.perProject,
            [projectId]: {
              ...(s.perProject[projectId] ?? emptyFlags()),
              rbyanDone: true,
              savedAfterRbyan: true,
              feedbackSent: true,
              publishConfirmed: true,
              wrapUpMarked: true,
              qa,
              publishQa,
              editChecklist,
            },
          },
        }));
      },

      maybeSetPipelineFinished: (allStepsDone) => {
        const s = get();
        if (!allStepsDone || s.hasFinishedFullPipelineOnce || s.postCompletePromptPending) return;
        set({ postCompletePromptPending: true });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        enabled: s.enabled,
        panelCollapsed: s.panelCollapsed,
        plansByProjectId: s.plansByProjectId,
        perProject: s.perProject,
        dismissedEmptyWorkspaceOffer: s.dismissedEmptyWorkspaceOffer,
        hasFinishedFullPipelineOnce: s.hasFinishedFullPipelineOnce,
        autoEmptyWorkspaceChecked: s.autoEmptyWorkspaceChecked,
      }),
    }
  )
);

/** After Rbyan generates or applies output to the project workspace. */
export function notifyBuildHelperRbyanOutput(projectId: string) {
  useBuildHelperStore.getState().patchProjectFlags(projectId, { rbyanDone: true });
}

/** After a manual save from Site Builder (not apply-Rbyan-only). */
export function notifyBuildHelperSiteBuilderManualSave(projectId: string) {
  const st = useBuildHelperStore.getState().perProject[projectId];
  if (st?.rbyanDone) {
    useBuildHelperStore.getState().patchProjectFlags(projectId, { savedAfterRbyan: true });
  }
}

export function buildRbyanPrefillPrompt(plan: BuildHelperSitePlan | undefined, clientName: string, company: string): string {
  const st = plan?.siteType
    ? SITE_TYPE_LABEL(plan.siteType)
    : 'a conversion-focused';
  const pages = plan?.pages?.length ? plan.pages.join(', ') : 'Home, Services, About, Contact';
  const goal = plan?.goal ? GOAL_LABEL(plan.goal) : 'drive more qualified leads';
  const who = company || clientName || 'the client';
  return `Build a ${st} website for ${who}. The goal is to ${goal}. Include these pages: ${pages}. Make it modern, responsive, and conversion-focused.`;
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
