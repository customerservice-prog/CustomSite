import { Outlet, useLocation, useMatch, useMatches } from 'react-router-dom';
import { TopHeader } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandMenu } from '@/components/ui/command-menu';
import { ToastStack } from '@/components/ui/toast-stack';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { WorkspaceModals } from '@/components/system/workspace-modals';
import { PageContainer } from '@/components/design-system/page-container';
import { crumbsFromMatches } from '@/lib/breadcrumbs';
import { DemoDatasetBanner } from '@/components/layout/demo-dataset-banner';
import { WorkflowGlobalHotkeys } from '@/components/workflow/workflow-global-hotkeys';

export { MobileNavTrigger } from '@/components/layout/sidebar';

/** Single application shell: sidebar + header + one scroll region. */
export function AppShell() {
  const matches = useMatches();
  const crumbs = crumbsFromMatches(matches);
  const { pathname } = useLocation();
  const siteBuilderFull = useMatch({ path: '/projects/:projectId/site', end: true });
  const rbyanBrainFull = useMatch({ path: '/rbyan', end: true });
  const clientPortalExperience = pathname === '/client-portal' || pathname.startsWith('/client-portal/');

  if (siteBuilderFull || rbyanBrainFull) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f4f5f8] text-gray-900">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
        <ToastStack />
        <WorkflowGlobalHotkeys />
        <CommandMenu />
        <CreateEntityModals />
        <WorkspaceModals />
      </div>
    );
  }

  if (clientPortalExperience) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-stone-100 text-stone-900">
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
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
        <TopHeader breadcrumbs={crumbs} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>
      <ToastStack />
      <WorkflowGlobalHotkeys />
      <CommandMenu />
      <CreateEntityModals />
      <WorkspaceModals />
    </div>
  );
}

export { AppShell as AppShellLayout };
