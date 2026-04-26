import { useMemo } from 'react';
import { Bell, ChevronDown, Command, Globe, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNavTrigger } from '@/components/layout/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import type { Crumb } from '@/components/layout/breadcrumbs';
import { useAppStore } from '@/store/useAppStore';
import { useUnreadNotificationCount, useNotifications } from '@/store/hooks';
import { cn } from '@/lib/utils';

interface HeaderProps {
  breadcrumbs: Crumb[];
}

export function Header({ breadcrumbs }: HeaderProps) {
  const navigate = useNavigate();
  const setCommandOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const openModal = useAppStore((s) => s.openModal);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const unread = useUnreadNotificationCount();
  const notifications = useNotifications();

  const groupedNotifications = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const urgentIds = new Set<string>();
    const urgent = sorted.filter((n) => {
      const isUrgent = !n.read && ['message', 'invoice', 'contract', 'task'].includes(n.kind);
      if (isUrgent) urgentIds.add(n.id);
      return isUrgent;
    });
    const day = 86400000;
    const now = Date.now();
    const today = sorted.filter((n) => !urgentIds.has(n.id) && now - new Date(n.createdAt).getTime() < day);
    const todayIds = new Set(today.map((t) => t.id));
    const recent = sorted.filter((n) => !urgentIds.has(n.id) && !todayIds.has(n.id));
    return { urgent, today, recent };
  }, [notifications]);

  function NotificationSection({
    label,
    items,
    maxItems,
  }: {
    label: string;
    items: typeof notifications;
    maxItems?: number;
  }) {
    if (items.length === 0) return null;
    const cap = maxItems ?? items.length;
    const shown = items.slice(0, cap);
    const overflow = items.length - shown.length;
    return (
      <div className="py-1">
        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {shown.map((n) => (
          <DropdownItem
            key={n.id}
            onClick={() => {
              markRead(n.id);
              if (n.href) navigate(n.href);
            }}
          >
            <span className={cn('block', !n.read && 'font-semibold text-slate-900')}>
              {n.title}
              {n.body && <span className="mt-0.5 block text-xs font-normal text-slate-500">{n.body}</span>}
            </span>
          </DropdownItem>
        ))}
        {overflow > 0 && (
          <p className="px-3 py-2 text-center text-[11px] font-medium text-slate-500">
            +{overflow} more — open inbox for the full list
          </p>
        )}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:min-w-[140px]">
          <MobileNavTrigger />
          <div className="min-w-0 lg:max-w-[220px] xl:max-w-[280px]">
            <Breadcrumbs items={breadcrumbs} className="text-xs sm:text-sm" />
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 px-2 md:block md:px-4">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex w-full max-w-2xl cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-left text-sm text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-white"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 truncate">Search workspace, jump to a client, or run a command…</span>
            <kbd className="ml-auto hidden shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 lg:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <IconButton
            type="button"
            className="md:hidden"
            aria-label="Open search"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-5 w-5 text-slate-600" />
          </IconButton>

          <Button
            type="button"
            variant="ghost"
            className="hidden h-10 gap-1.5 px-2.5 text-slate-600 lg:inline-flex"
            onClick={() => setCommandOpen(true)}
          >
            <Command className="h-4 w-4" />
            <span className="text-xs font-semibold">Commands</span>
          </Button>

          <div className="hidden lg:block">
            <Dropdown align="right" trigger={<DropdownChevronTrigger label="Quick create" />}>
              <DropdownItem onClick={() => openModal('create-client')}>
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New client
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => openModal('create-project')}>
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New project
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => openModal('create-invoice')}>
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New invoice
                </span>
              </DropdownItem>
              <DropdownItem onClick={() => openModal('create-task')}>
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New task
                </span>
              </DropdownItem>
            </Dropdown>
          </div>

          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Open assistant inbox"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-0.5 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            }
          >
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Assistant</p>
              <p className="text-[11px] text-slate-500">Things that need your judgment, not noise.</p>
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto scroll-sidebar py-1">
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-500">You are all caught up.</p>
              ) : (
                <>
                  <NotificationSection label="Urgent" items={groupedNotifications.urgent} maxItems={5} />
                  <NotificationSection label="Today" items={groupedNotifications.today} />
                  <NotificationSection label="Recent" items={groupedNotifications.recent} />
                </>
              )}
            </div>
          </Dropdown>

          <a
            href="/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition duration-150 hover:bg-slate-50 xl:inline-flex"
          >
            <Globe className="h-4 w-4 text-slate-500" />
            <span>View site</span>
          </a>

          <Dropdown
            align="right"
            trigger={
              <IconButton type="button" className="xl:hidden" aria-label="More actions">
                <MoreHorizontal className="h-5 w-5 text-slate-600" />
              </IconButton>
            }
          >
            <DropdownItem onClick={() => setCommandOpen(true)}>
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" /> Search &amp; commands
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => openModal('create-client')}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> New client
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => openModal('create-invoice')}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> New invoice
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => window.open('/index.html', '_blank', 'noopener')}>
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> View site
              </span>
            </DropdownItem>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Avatar name="Jordan Blake" size="sm" />
                <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
              </button>
            }
          >
            <DropdownItem onClick={() => {}}>Profile</DropdownItem>
            <DropdownItem onClick={() => (window.location.hash = '#/settings')}>Workspace settings</DropdownItem>
            <DropdownItem destructive onClick={() => {}}>
              Sign out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
