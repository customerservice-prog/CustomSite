import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ListChecks, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUILD_STEPS, countCompleted } from '@/lib/build-helper/build-steps';
import { useBuildHelperStore } from '@/store/use-build-helper-store';
import { useAppStore } from '@/store/useAppStore';
import { BuildHelperPanel } from '@/components/build-helper/build-helper-panel';
import { Button } from '@/components/ui/button';

export function BuildHelperDock() {
  const { pathname } = useLocation();
  const enabled = useBuildHelperStore((s) => s.enabled);
  const panelCollapsed = useBuildHelperStore((s) => s.panelCollapsed);
  const setPanelCollapsed = useBuildHelperStore((s) => s.setPanelCollapsed);
  const firstRunStripVisible = useBuildHelperStore((s) => s.firstRunStripVisible);
  const dismissFirstRunStrip = useBuildHelperStore((s) => s.dismissFirstRunStrip);
  const tryAutoEnableForEmptyWorkspace = useBuildHelperStore((s) => s.tryAutoEnableForEmptyWorkspace);
  const maybeSetPipelineFinished = useBuildHelperStore((s) => s.maybeSetPipelineFinished);
  const currentStep = useBuildHelperStore((s) => s.currentStep);
  const completedSteps = useBuildHelperStore((s) => s.completedSteps);

  const projects = useAppStore((s) => s.projects);
  const projectCount = Object.keys(projects).length;

  useEffect(() => {
    tryAutoEnableForEmptyWorkspace(projectCount);
  }, [projectCount, tryAutoEnableForEmptyWorkspace]);

  const total = BUILD_STEPS.length;
  const completed = countCompleted(completedSteps);
  const allDone = currentStep === 'complete';

  useEffect(() => {
    maybeSetPipelineFinished(allDone);
  }, [allDone, maybeSetPipelineFinished]);

  const showFab = enabled && panelCollapsed;
  const showPanel = enabled && !panelCollapsed;
  const hideFirstRunStrip = pathname.includes('/site') || pathname.startsWith('/rbyan') || pathname.startsWith('/client-portal');

  return (
    <>
      {firstRunStripVisible && !hideFirstRunStrip ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-950 sm:px-4">
          <p className="min-w-0 text-xs font-medium sm:text-sm">
            <span className="font-semibold">Let&apos;s build your first client site.</span>{' '}
            <span className="hidden text-amber-900/90 sm:inline">Build Helper is on — use the checklist on the right.</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={() => dismissFirstRunStrip()}>
              OK
            </Button>
            <button
              type="button"
              className="rounded-md p-1 text-amber-900/80 hover:bg-amber-100"
              aria-label="Turn off helper"
              onClick={() => {
                useBuildHelperStore.getState().setEnabled(false);
                dismissFirstRunStrip();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {showFab ? (
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          className={cn(
            'fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-indigo-200 bg-white py-2.5 pl-3 pr-4 text-sm font-semibold text-indigo-800 shadow-lg transition hover:bg-indigo-50'
          )}
        >
          <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
          Helper
          {completed > 0 ? (
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {completed}/{total}
            </span>
          ) : null}
        </button>
      ) : null}

      {showPanel ? (
        <aside
          className={cn(
            'fixed bottom-0 right-0 top-0 z-[55] flex w-[min(100vw,380px)] flex-col border-l border-slate-200 bg-white shadow-2xl',
            'max-md:top-auto max-md:h-[min(88vh,640px)] max-md:rounded-t-xl max-md:border-l-0 max-md:border-t'
          )}
        >
          <BuildHelperPanel onClose={() => setPanelCollapsed(true)} />
        </aside>
      ) : null}
    </>
  );
}
