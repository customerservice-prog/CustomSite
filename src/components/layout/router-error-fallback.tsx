import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Sidebar } from '@/components/layout/sidebar';
import { TopHeader } from '@/components/layout/header';
import { PageContainer } from '@/components/design-system/page-container';
import { ToastStack } from '@/components/ui/toast-stack';
import { CommandMenu } from '@/components/ui/command-menu';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { WorkspaceModals } from '@/components/system/workspace-modals';
import { WorkflowGlobalHotkeys } from '@/components/workflow/workflow-global-hotkeys';
import { DemoDatasetBanner } from '@/components/layout/demo-dataset-banner';
import { BuildHelperDock } from '@/components/build-helper/build-helper-dock';
import { BuildHelperProgressSync } from '@/components/build-helper/build-helper-progress-sync';
import { buttonClassName } from '@/components/ui/button';
import type { Crumb } from '@/components/layout/breadcrumbs';

const ERROR_CRUMBS: Crumb[] = [{ label: 'CustomSite', to: '/dashboard' }, { label: 'Page not found' }];

/**
 * Root route `errorElement`: keeps sidebar + header when a loader or render throws,
 * so users never see the framework’s bare “Unexpected Application Error” screen.
 */
export function RouterErrorFallback() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? 'Page not found' : 'Something went wrong';
  const detail =
    is404 && isRouteErrorResponse(error)
      ? (typeof error.data === 'string' ? error.data : 'That page does not exist in this app.')
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'An unexpected error occurred.';

  useEffect(() => {
    document.title = `${title} — CustomSite`;
  }, [title]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-gray-50 to-slate-100 text-gray-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DemoDatasetBanner />
        <BuildHelperProgressSync />
        <BuildHelperDock />
        <TopHeader breadcrumbs={ERROR_CRUMBS} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <PageContainer>
            <div className="mx-auto max-w-lg py-16 text-center">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{detail}</p>
              <Link to="/dashboard" replace className={buttonClassName('primary', 'mt-8 inline-flex')}>
                Go to dashboard
              </Link>
            </div>
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
