import { Outlet, useMatches } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNavTrigger, Sidebar } from '@/components/layout/sidebar';
import { CommandMenu } from '@/components/ui/command-menu';
import { ToastStack } from '@/components/ui/toast-stack';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { crumbsFromMatches } from '@/lib/breadcrumbs';

export function AppShellLayout() {
  const matches = useMatches();
  const crumbs = crumbsFromMatches(matches);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />
      <div className="lg:pl-72">
        <Header breadcrumbs={crumbs} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <ToastStack />
      <CommandMenu />
      <CreateEntityModals />
    </div>
  );
}

export { MobileNavTrigger };
