import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/store/hooks';
import { useBuildHelperStore } from '@/store/use-build-helper-store';
import { dismissBuildHelperNudgeForDays, readBuildHelperNudgeDismissUntil } from '@/lib/build-helper-surface-dismiss';
import { cn } from '@/lib/utils';

/** Surfaces Build Helper when the workspace is empty and the checklist is off. */
export function BuildHelperNudgeCard() {
  const projects = useProjects();
  const enabled = useBuildHelperStore((s) => s.enabled);
  const setEnabled = useBuildHelperStore((s) => s.setEnabled);
  const setPanelCollapsed = useBuildHelperStore((s) => s.setPanelCollapsed);

  if (projects.length > 0 || enabled) return null;
  if (Date.now() < readBuildHelperNudgeDismissUntil()) return null;

  return (
    <div
      className={cn(
        'pointer-events-auto fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-lg shadow-amber-900/10 ring-1 ring-amber-100/80',
        'max-md:left-3 max-md:right-3 max-md:max-w-none'
      )}
      role="status"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg" aria-hidden>
          <Wrench className="h-5 w-5 text-amber-900" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-950">First time here?</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
            Turn on <strong>Build Helper</strong> for a guided walkthrough — same checklist as in Settings, shown on the right.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-9 bg-indigo-600 text-xs hover:bg-indigo-700"
              onClick={() => {
                setEnabled(true);
                setPanelCollapsed(false);
              }}
            >
              Enable it
            </Button>
            <Button type="button" variant="secondary" className="h-9 text-xs" onClick={() => dismissBuildHelperNudgeForDays(7)}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
