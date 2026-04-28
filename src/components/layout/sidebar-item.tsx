import type { ReactNode } from 'react';
import { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarGroupLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">{children}</p>;
}

function pathActive(pathname: string, to: string) {
  if (to === '/dashboard') return pathname === '/dashboard' || pathname === '/' || pathname === '';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SidebarNavLink({
  to,
  icon: Icon,
  label,
  badge,
  onNavigate,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const ref = useRef<HTMLAnchorElement>(null);
  const active = pathActive(location.pathname, to);

  return (
    <NavLink
      ref={ref}
      to={to}
      end={to === '/dashboard'}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive || active
            ? 'bg-purple-50 text-purple-600'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-purple-100 px-1.5 text-[11px] font-semibold text-purple-800">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export function SidebarExternalLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </a>
  );
}
