import { Bell, ChevronDown, Command, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNavTrigger } from '@/components/layout/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 shrink items-center gap-2">
        <MobileNavTrigger />
        <div className="min-w-0">
          <Breadcrumbs items={breadcrumbs} className="text-xs sm:text-sm" />
        </div>
      </div>
      <div className="mx-2 hidden max-w-md flex-1 md:block lg:mx-4">
        <div className="relative">
          <Command className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search clients, projects, invoices…"
            className="pl-10"
            aria-label="Global search"
            onFocus={() => setCommandOpen(true)}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          className="hidden h-10 gap-1.5 px-2.5 text-xs font-semibold text-slate-600 sm:inline-flex md:hidden lg:inline-flex"
          onClick={() => setCommandOpen(true)}
        >
          <Command className="h-4 w-4" />
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 xl:inline">
            ⌘K
          </kbd>
        </Button>
        <Dropdown align="right" trigger={<DropdownChevronTrigger label="Quick Create" />}>
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
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Notifications"
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
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Inbox</p>
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-500">You are all caught up.</p>
            ) : (
              notifications.map((n) => (
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
              ))
            )}
          </div>
        </Dropdown>
        <a
          href="/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:inline-flex"
        >
          <Globe className="h-4 w-4 text-slate-500" />
          <span className="hidden lg:inline">View Site</span>
        </a>
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
    </header>
  );
}
