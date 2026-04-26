import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { navGroups, type NavItem } from '@/lib/nav-config';
import * as sel from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useShell } from '@/context/shell-context';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import { SidebarNavLink } from '@/components/layout/sidebar-item';

const defaultOpen = (label: string) => label !== 'Growth & admin';

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
  const unreadThreads = useAppStore((s) => sel.getUnreadThreads(s).length);
  const pendingContracts = useAppStore((s) => sel.getPendingContracts(s).length);
  const [wsOpen, setWsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.label, defaultOpen(g.label)]))
  );
  const wsWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsOpen) return;
    function onDoc(e: MouseEvent) {
      if (wsWrap.current && !wsWrap.current.contains(e.target as Node)) setWsOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [wsOpen]);

  function toggleGroup(label: string) {
    setOpenGroups((s) => ({ ...s, [label]: !s[label] }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/90 bg-white px-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-900/15"
          aria-hidden
        >
          CS
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">CustomSite</p>
          <p className="text-[11px] font-medium text-slate-500">Agency workspace</p>
        </div>
        <IconButton type="button" className="lg:hidden" onClick={() => onNavigate?.()} aria-label="Close menu">
          <X className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="shrink-0 border-b border-slate-200/90 bg-white px-4 py-3">
        <div className="relative" ref={wsWrap}>
          <button
            type="button"
            onClick={() => setWsOpen((o) => !o)}
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm transition duration-150 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-expanded={wsOpen}
          >
            <span>
              <span className="block font-semibold text-slate-900">Acme Agency</span>
              <span className="text-xs text-slate-500">Workspace</span>
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-slate-500 transition duration-150', wsOpen && 'rotate-180')}
            />
          </button>
          {wsOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5">
              <button
                type="button"
                className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => setWsOpen(false)}
              >
                Acme Agency <span className="text-slate-400">(current)</span>
              </button>
              <button
                type="button"
                className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                onClick={() => setWsOpen(false)}
              >
                Add workspace…
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="scroll-sidebar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3 pt-2">
        {navGroups.map((group) => (
          <div key={group.label} className="border-b border-slate-100/80 py-2 last:border-0">
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-600"
            >
              {group.label}
              <ChevronDown
                className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', openGroups[group.label] ? 'rotate-180' : '')}
              />
            </button>
            {openGroups[group.label] && (
              <div className="space-y-0.5">
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
            )}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-200/90 bg-white p-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 p-2 shadow-sm">
          <Avatar name="Jordan Blake" size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">Jordan Blake</p>
            <p className="truncate text-xs text-slate-500">jordan@acme.agency</p>
          </div>
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="cursor-pointer rounded-lg p-2 text-slate-500 transition duration-150 hover:bg-white hover:text-slate-800 hover:shadow-sm"
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
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:flex"
        aria-label="Main navigation"
      >
        <SidebarInner />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition lg:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[88vw] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-xl transition duration-200 lg:hidden',
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
    <IconButton type="button" className="lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
      <Menu className="h-5 w-5" />
    </IconButton>
  );
}
