import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
  );

export function ClientPortalLayout() {
  const ctx = useClientPortalProject();

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-stone-50 via-stone-50 to-amber-50/30 text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80">Client portal</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-stone-900">
              {ctx ? ctx.client.company : 'Welcome'}
            </h1>
            {ctx ? <p className="truncate text-sm text-stone-600">{ctx.project.name}</p> : null}
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Main">
            <NavLink to="/client-portal" end className={navClass}>
              Overview
            </NavLink>
            <NavLink to="/client-portal/messages" className={navClass}>
              Messages
            </NavLink>
            <NavLink to="/client-portal/files" className={navClass}>
              Files
            </NavLink>
            <NavLink to="/client-portal/invoices" className={navClass}>
              Invoices
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </div>

      <footer className="mt-auto border-t border-stone-200/70 bg-stone-100/60 py-4 text-center text-[11px] text-stone-500">
        <Link to="/dashboard" className="font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline">
          Agency sign-in
        </Link>
        <span className="mx-2 text-stone-300">·</span>
        <span>Questions? Reply on your message thread.</span>
      </footer>
    </div>
  );
}
