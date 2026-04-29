import { Outlet, useMatches } from 'react-router-dom';
import { TopHeader } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandMenu } from '@/components/ui/command-menu';
import { ToastStack } from '@/components/ui/toast-stack';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { WorkspaceModals } from '@/components/system/workspace-modals';
import { PageContainer } from '@/components/design-system/page-container';
import { crumbsFromMatches } from '@/lib/breadcrumbs';
import { DemoDatasetBanner } from '@/components/layout/demo-dataset-banner';

export { MobileNavTrigger } from '@/components/layout/sidebar';

/** Single application shell: sidebar + header + one scroll region. */
export function AppShell() {
  const matches = useMatches();
  const crumbs = crumbsFromMatches(matches);

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
      <CommandMenu />
      <CreateEntityModals />
      <WorkspaceModals />
    </div>
  );
}

export { AppShell as AppShellLayout };
