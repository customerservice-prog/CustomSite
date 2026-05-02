import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { computeReconciledProgress, getProjectSiteSnapshot } from '@/lib/build-helper/build-steps';
import { migrateLegacyBuildHelperStorageOnce, useBuildHelperStore } from '@/store/use-build-helper-store';
import { useAppStore } from '@/store/useAppStore';
import { useProjectSiteWorkspaceStore } from '@/store/use-project-site-workspace-store';

/** Subscribes to app + workspace + helper and keeps completedSteps / currentStep / actives in sync with real data. */
export function BuildHelperProgressSync() {
  const { pathname } = useLocation();
  const migrated = useRef(false);

  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    migrateLegacyBuildHelperStorageOnce();
  }, []);

  useEffect(() => {
    let running = false;
    let pending = false;

    const runOnce = () => {
      const bh = useBuildHelperStore.getState();
      const app = useAppStore.getState();
      const ws = useProjectSiteWorkspaceStore.getState();

      const routeM = pathname.match(/^\/projects\/([^/]+)/);
      const routeSeg = routeM?.[1];
      const routeProjValid =
        routeSeg && routeSeg !== 'site' && app.projects[routeSeg] ? routeSeg : null;

      const routeClientRaw = pathname.match(/^\/clients\/([^/]+)/)?.[1];
      const routeClient = routeClientRaw && app.clients[routeClientRaw] ? routeClientRaw : null;

      const pid =
        routeProjValid ||
        (app.ui.selectedProjectId && app.projects[app.ui.selectedProjectId] ? app.ui.selectedProjectId : null) ||
        (bh.activeProjectId && app.projects[bh.activeProjectId] ? bh.activeProjectId : null);

      const cid =
        routeClient ||
        (app.ui.selectedClientId && app.clients[app.ui.selectedClientId] ? app.ui.selectedClientId : null) ||
        (pid ? app.projects[pid]?.clientId : null) ||
        (bh.activeClientId && app.clients[bh.activeClientId] ? bh.activeClientId : null);

      if (cid !== bh.activeClientId) useBuildHelperStore.setState({ activeClientId: cid });
      if (pid !== bh.activeProjectId) useBuildHelperStore.setState({ activeProjectId: pid });

      const fresh = useBuildHelperStore.getState();
      const row = pid ? ws.byProjectId[pid] : undefined;
      const proj = pid ? app.projects[pid] : undefined;
      const snap = getProjectSiteSnapshot(pid, row, proj);

      const base = {
        activeClientId: fresh.activeClientId,
        activeProjectId: fresh.activeProjectId,
        completedSteps: fresh.completedSteps,
        sitePlan: fresh.sitePlan,
      };

      const { completedSteps, currentStep } = computeReconciledProgress(base, snap, fresh.completedSteps);
      fresh.applyReconciledProgress(completedSteps, currentStep);
    };

    const safeRun = () => {
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        runOnce();
      } finally {
        running = false;
        if (pending) {
          pending = false;
          queueMicrotask(safeRun);
        }
      }
    };

    const unsubA = useAppStore.subscribe(safeRun);
    const unsubW = useProjectSiteWorkspaceStore.subscribe(safeRun);
    const unsubB = useBuildHelperStore.subscribe(safeRun);
    safeRun();
    return () => {
      unsubA();
      unsubW();
      unsubB();
    };
  }, [pathname]);

  return null;
}
