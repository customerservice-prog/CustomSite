import { useMemo } from 'react';
import { Bell, ChevronDown, Globe, LayoutDashboard, MoreHorizontal, Plus, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNavTrigger } from '@/components/layout/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import type { Crumb } from '@/components/layout/breadcrumbs';
import { useAppStore } from '@/store/useAppStore';
import { useUnreadNotificationCount, useNotifications } from '@/store/hooks';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  breadcrumbs: Crumb[];
}

export function TopHeader({ breadcrumbs }: TopHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onStudioPulse = pathname === '/dashboard' || pathname === '/' || pathname === '';
  const setCommandOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const openModal = useAppStore((s) => s.openModal);
  const currentUser = useAppStore((s) => s.users.u1);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const unread = useUnreadNotificationCount();
  const notifications = useNotifications();

  const pageTitle = breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Workspace' : 'Workspace';

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
        <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        {shown.map((n) => (
          <DropdownItem
            key={n.id}
            onClick={() => {
              markRead(n.id);
              if (n.href) navigate(n.href);
            }}
          >
            <span className={cn('block', !n.read && 'font-semibold text-gray-900')}>
              {n.title}
              {n.body && <span className="mt-0.5 block text-xs font-normal text-gray-500">{n.body}</span>}
            </span>
          </DropdownItem>
        ))}
        {overflow > 0 && <p className="px-3 py-2 text-center text-[11px] text-gray-500">+{overflow} more</p>}
      </div>
    );
  }

  const quickCreateItems = (
    <>
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
      <DropdownItem onClick={() => openModal('record-payment')}>
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Record payment
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => openModal('upload-file')}>
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Upload file
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => openModal('create-contract')}>
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New contract
        </span>
      </DropdownItem>
    </>
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 md:px-6">
      <MobileNavTrigger />
      <div className="hidden min-w-0 md:block md:max-w-[min(40%,280px)]">
        <Breadcrumbs items={breadcrumbs} className="text-xs text-gray-600 md:text-sm" />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 md:hidden">{pageTitle}</h1>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {!onStudioPulse && (
          <Link
            to="/dashboard"
            className="hidden items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-purple-700 sm:inline-flex"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Studio Pulse</span>
          </Link>
        )}

        <div className="relative hidden w-[360px] min-[1024px]:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            readOnly
            onClick={() => setCommandOpen(true)}
            onFocus={(e) => {
              e.target.blur();
              setCommandOpen(true);
            }}
            placeholder="Search workspace…"
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-0 pl-10 pr-12 text-sm text-gray-900 placeholder:text-gray-400"
            aria-label="Search workspace"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 min-[1024px]:inline">
            ⌘K
          </kbd>
        </div>

        <IconButton
          type="button"
          className="min-[1024px]:hidden"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-5 w-5 text-gray-600" />
        </IconButton>

        <div className="hidden sm:block">
          <Dropdown align="right" trigger={<DropdownChevronTrigger label="Quick create" />}>
            {quickCreateItems}
          </Dropdown>
        </div>
        <Dropdown
          align="right"
          className="sm:hidden"
          trigger={
            <IconButton aria-label="Quick create" type="button" className="h-10 w-10 border border-gray-200 bg-white">
              <Plus className="h-5 w-5 text-gray-700" />
            </IconButton>
          }
        >
          {quickCreateItems}
        </Dropdown>

        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[9px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          }
        >
          <div className="border-b border-gray-100 px-3 py-2">
            <button type="button" className="text-xs font-medium text-purple-600" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-gray-500">No notifications.</p>
            ) : (
              <>
                <NotificationSection label="Urgent" items={groupedNotifications.urgent} maxItems={5} />
                <NotificationSection label="Today" items={groupedNotifications.today} />
                <NotificationSection label="Recent" items={groupedNotifications.recent} maxItems={6} />
              </>
            )}
          </div>
        </Dropdown>

        <Dropdown
          align="right"
          trigger={
            <button type="button" className="hidden h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 sm:flex" aria-label="More">
              <MoreHorizontal className="h-5 w-5 text-gray-600" />
            </button>
          }
        >
          <DropdownItem onClick={() => setCommandOpen(true)}>
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Search
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
              className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pl-1 pr-2"
              aria-label="Account"
            >
              <Avatar name={currentUser?.name ?? 'You'} size="sm" />
              <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
            </button>
          }
        >
          <DropdownItem onClick={() => navigate('/settings')}>Settings</DropdownItem>
          <DropdownItem onClick={() => navigate('/dashboard')}>Studio Pulse</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

/** @deprecated Use TopHeader — alias for routes/layout imports. */
export const Header = TopHeader;
