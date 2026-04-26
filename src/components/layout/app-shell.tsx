import { Link, Outlet, useLocation, useMatches } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNavTrigger, Sidebar } from '@/components/layout/sidebar';
import { CommandMenu } from '@/components/ui/command-menu';
import { ToastStack } from '@/components/ui/toast-stack';
import { CreateEntityModals } from '@/components/system/create-entity-modals';
import { crumbsFromMatches } from '@/lib/breadcrumbs';

function PulseAnchorBar() {
  const { pathname } = useLocation();
  const onPulse = pathname === '/dashboard' || pathname === '/' || pathname === '';
  if (onPulse) return null;
  return (
    <div className="border-b border-indigo-100/90 bg-gradient-to-r from-indigo-50/95 to-white px-4 py-2.5 text-center sm:text-left">
      <p className="mx-auto max-w-[1680px] text-xs leading-snug text-indigo-950 sm:px-6 lg:px-8">
        <span className="font-bold">Behavior engine anchor · </span>
        You’re in a tool view — your day still orchestrates from{' '}
        <Link
          to="/dashboard"
          className="font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
        >
          Studio Pulse
        </Link>
        .
      </p>
    </div>
  );
}

export function AppShellLayout() {
  const matches = useMatches();
  const crumbs = crumbsFromMatches(matches);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sidebar />
      <div className="min-w-0 lg:pl-72">
        <Header breadcrumbs={crumbs} />
        <PulseAnchorBar />
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
