import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { navGroups, studioPulseNavItem, type NavItem } from '@/lib/nav-config';
import * as sel from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useShell } from '@/context/shell-context';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import { SidebarGroupLabel, SidebarNavLink } from '@/components/layout/sidebar-item';

function navBadgeCount(
  badgeFromStore: NavItem['badgeFromStore'],
  unread: number,
  pendingContracts: number
): number | undefined {
  if (badgeFromStore === 'unread-messages') return unread;
  if (badgeFromStore === 'pending-contracts') return pendingContracts;
  return undefined;
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const workspace = useAppStore((s) => s.workspace);
  const currentUser = useAppStore((s) => s.users.u1);
  const unreadThreads = useAppStore((s) => sel.getUnreadThreads(s).length);
  const pendingContracts = useAppStore((s) => sel.getPendingContracts(s).length);
  const navScrollRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = navScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
        <Link
          to="/dashboard"
          onClick={() => onNavigate?.()}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg outline-none ring-purple-500/0 transition hover:bg-gray-50 focus-visible:ring-2"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-xs font-bold text-white shadow-sm"
            aria-hidden
          >
            CS
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-gray-900">CustomSite</p>
            <p className="truncate text-xs text-gray-500">{workspace.name}</p>
            <p className="truncate text-[10px] leading-tight text-gray-400">Sites · AR · delivery</p>
          </div>
        </Link>
        <IconButton type="button" className="md:hidden" onClick={() => onNavigate?.()} aria-label="Close menu">
          <X className="h-5 w-5" />
        </IconButton>
      </div>

      <nav
        ref={navScrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-3 pt-2"
        aria-label="Main"
      >
        <div className="border-b border-gray-100 py-2">
          <SidebarNavLink
            to={studioPulseNavItem.to}
            icon={studioPulseNavItem.icon}
            label={studioPulseNavItem.label}
            onNavigate={onNavigate}
          />
        </div>

        {navGroups.map((group) => (
          <div key={group.label} className="border-b border-gray-100 py-2 last:border-0">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarNavLink
                  key={item.label}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  badge={navBadgeCount(item.badgeFromStore, unreadThreads, pendingContracts)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <Avatar name={currentUser?.name ?? 'Jordan Blake'} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{currentUser?.name ?? 'Jordan Blake'}</p>
            <p className="truncate text-xs text-gray-500">{currentUser?.email ?? ''}</p>
          </div>
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-800"
                aria-label="Account menu"
              >
                <LogOut className="h-4 w-4" />
              </button>
            }
          >
            <DropdownItem onClick={() => {}}>Sign out</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useShell();

  return (
    <>
      <aside
        className="relative z-20 hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white md:flex"
        aria-label="Main navigation"
      >
        <SidebarInner />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition md:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[88vw] flex-col overflow-hidden border-r border-gray-200 bg-white shadow-xl transition duration-200 md:hidden',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile navigation"
        aria-hidden={!mobileNavOpen}
      >
        <SidebarInner onNavigate={() => setMobileNavOpen(false)} />
      </aside>
    </>
  );
}

export function MobileNavTrigger() {
  const { setMobileNavOpen } = useShell();
  return (
    <IconButton type="button" className="md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
      <Menu className="h-5 w-5" />
    </IconButton>
  );
}
