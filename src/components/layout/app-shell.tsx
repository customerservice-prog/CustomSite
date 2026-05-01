import { useEffect, useState } from 'react';
import { Outlet, useMatch, useMatches } from 'react-router-dom';
import { TopHeader } from '@/components/layout/header';
import { WelcomeOnboardingModal } from '@/components/onboarding/welcome-onboarding-modal';
import { readOnboardingDone, writeOnboardingDone } from '@/lib/onboarding-storage';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandMenu } from '@/components/ui/command-menu';
import { ToastStack } from '@/components/ui/toast-stack';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { WorkspaceModals } from '@/components/system/workspace-modals';
import { PageContainer } from '@/components/design-system/page-container';
import { crumbsFromMatches, documentTitleFromMatches } from '@/lib/breadcrumbs';
import { DemoDatasetBanner } from '@/components/layout/demo-dataset-banner';
import { WorkflowGlobalHotkeys } from '@/components/workflow/workflow-global-hotkeys';
import { BuildHelperDock } from '@/components/build-helper/build-helper-dock';
import { BuildHelperProgressSync } from '@/components/build-helper/build-helper-progress-sync';
import { useBuildHelperStore } from '@/store/use-build-helper-store';
import { cn } from '@/lib/utils';

export { MobileNavTrigger } from '@/components/layout/sidebar';

/** Single application shell: sidebar + header + one scroll region. */
export function AppShell() {
  const matches = useMatches();
  const crumbs = crumbsFromMatches(matches);
  const [welcomeOnboardingOpen, setWelcomeOnboardingOpen] = useState(() => !readOnboardingDone());

  useEffect(() => {
    document.title = documentTitleFromMatches(matches);
  }, [matches]);
  const siteBuilderFull = useMatch({ path: '/projects/:projectId/site', end: true });
  const rbyanBrainFull = useMatch({ path: '/rbyan', end: true });
  const helperReserve = useBuildHelperStore((s) => s.enabled && !s.panelCollapsed);

  if (siteBuilderFull || rbyanBrainFull) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f4f5f8] text-gray-900">
        <BuildHelperProgressSync />
        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden',
            helperReserve && 'lg:pr-[min(380px,42vw)]'
          )}
        >
          <Outlet />
        </main>
        <BuildHelperDock />
        <ToastStack />
        <WorkflowGlobalHotkeys />
        <CommandMenu />
        <CreateEntityModals />
        <WorkspaceModals />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-gray-50 to-slate-100 text-gray-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DemoDatasetBanner />
        <BuildHelperProgressSync />
        <BuildHelperDock />
        <TopHeader breadcrumbs={crumbs} highlightQuickCreate={welcomeOnboardingOpen} />
        <main className={cn('min-h-0 flex-1 overflow-y-auto', helperReserve && 'lg:pr-[min(380px,42vw)]')}>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>
      <WelcomeOnboardingModal
        open={welcomeOnboardingOpen}
        onComplete={() => {
          writeOnboardingDone();
          setWelcomeOnboardingOpen(false);
        }}
      />
      <ToastStack />
      <WorkflowGlobalHotkeys />
      <CommandMenu />
      <CreateEntityModals />
      <WorkspaceModals />
    </div>
  );
}

export { AppShell as AppShellLayout };
