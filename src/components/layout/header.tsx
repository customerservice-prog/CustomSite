import { useMemo } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Keyboard,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileNavTrigger } from '@/components/layout/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownChevronTrigger, DropdownItem } from '@/components/ui/dropdown';
import { IconButton } from '@/components/ui/icon-button';
import type { Crumb } from '@/components/layout/breadcrumbs';
import { useAuthSession } from '@/context/auth-session-context';
import { finalizeStudioSignOutNavigate, signOutStudio } from '@/lib/sign-out-studio';
import { useAppStore } from '@/store/useAppStore';
import { useBuildHelperStore } from '@/store/use-build-helper-store';
import { useUnreadNotificationCount, useNotifications } from '@/store/hooks';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  breadcrumbs: Crumb[];
  /** Pulse Quick create until first-run welcome is dismissed. */
  highlightQuickCreate?: boolean;
}

function SearchField({
  onOpenCommand,
  className,
}: {
  onOpenCommand: () => void;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        readOnly
        onClick={() => onOpenCommand()}
        onFocus={(e) => {
          e.target.blur();
          onOpenCommand();
        }}
        placeholder="Search clients, projects, sites…"
        className="h-10 w-full cursor-pointer rounded-lg border border-gray-200 bg-gray-50/80 py-0 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition hover:border-gray-300 hover:bg-white lg:pr-14"
        aria-label="Search agency"
        title="Click to open search (⌘K / Ctrl+K)"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 lg:inline">
        ⌘K
      </kbd>
    </div>
  );
}

export function TopHeader({ breadcrumbs, highlightQuickCreate = false }: TopHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { supabaseBrowser } = useAuthSession();
  const onStudioPulse = pathname === '/dashboard' || pathname === '/' || pathname === '';
  const setCommandOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const openModal = useAppStore((s) => s.openModal);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const currentUser = useAppStore((s) => s.users[currentUserId]);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const unread = useUnreadNotificationCount();
  const notifications = useNotifications();
  const buildHelperEnabled = useBuildHelperStore((s) => s.enabled);
  const setBuildHelperEnabled = useBuildHelperStore((s) => s.setEnabled);
  const setHelperPanelCollapsed = useBuildHelperStore((s) => s.setPanelCollapsed);

  const pageTitle = breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Agency' : 'Agency';

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

  const openCommand = () => setCommandOpen(true);

  const accountMenu = (
    <Dropdown
      align="right"
      trigger={
        <button
          type="button"
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pl-1 pr-2 transition hover:border-gray-300 hover:bg-gray-50"
          aria-label="Account"
          title="Account — settings and sign out"
        >
          <Avatar name={currentUser?.name ?? 'You'} size="sm" />
          <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
        </button>
      }
    >
      <DropdownItem onClick={() => navigate('/account')}>My profile</DropdownItem>
      <DropdownItem onClick={() => navigate('/settings')}>Agency settings</DropdownItem>
      <DropdownItem onClick={() => navigate('/dashboard')}>Studio Pulse</DropdownItem>
      <DropdownItem
        onClick={async () => {
          await signOutStudio(supabaseBrowser);
          finalizeStudioSignOutNavigate();
        }}
      >
        Sign out
      </DropdownItem>
    </Dropdown>
  );

  const notificationsMenu = (
    <Dropdown
      align="right"
      trigger={
        <button
          type="button"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          aria-label="Notifications"
          title="Notifications — invoice events, messages, and signatures"
        >
          <Bell className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-purple-600 px-0.5 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      }
    >
      {notifications.length > 0 ? (
        <div className="border-b border-gray-100 px-3 py-2">
          <button type="button" className="text-xs font-medium text-purple-600" onClick={markAllRead}>
            Mark all read
          </button>
        </div>
      ) : null}
      <div className="max-h-64 overflow-y-auto py-1">
        {notifications.length === 0 ? (
          <div className="px-3 py-3 text-sm text-gray-600">
            <p>You&apos;re all caught up. Invoice events, message replies, and contract signatures will appear here.</p>
            <p className="mt-2 text-xs text-gray-500">Shown in-app as your team works; pair with email in notification settings.</p>
          </div>
        ) : (
          <>
            <NotificationSection label="Urgent" items={groupedNotifications.urgent} maxItems={5} />
            <NotificationSection label="Today" items={groupedNotifications.today} />
            <NotificationSection label="Recent" items={groupedNotifications.recent} maxItems={6} />
          </>
        )}
      </div>
      <div className="border-t border-gray-100 py-1">
        <DropdownItem onClick={() => navigate('/settings?tab=notifications')}>
          <span className="text-xs font-medium text-purple-700">Notification settings →</span>
        </DropdownItem>
      </div>
    </Dropdown>
  );

  const moreMenu = (
    <Dropdown
      align="right"
      trigger={
        <IconButton
          aria-label="More"
          title="More — help, shortcuts, feedback, marketing site"
          type="button"
          className="h-11 w-11 border border-gray-200 bg-white"
        >
          <MoreHorizontal className="h-6 w-6 text-gray-600" />
        </IconButton>
      }
    >
      <DropdownItem onClick={() => window.open('https://github.com/customerservice-prog/CustomSite', '_blank', 'noopener,noreferrer')}>
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0" /> Help &amp; docs
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => setCommandOpen(true)}>
        <span className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 shrink-0" /> Keyboard shortcuts <span className="text-gray-400">(⌘K)</span>
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => navigate('/activity')}>
        <span className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 shrink-0" /> What&apos;s new / activity
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => window.open('mailto:hello@customsite.online?subject=CustomSite%20feedback', '_blank', 'noopener,noreferrer')}>
        <span className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 shrink-0" /> Give feedback
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => window.open('/index.html', '_blank', 'noopener')}>
        <span className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 shrink-0" /> View public marketing site
        </span>
      </DropdownItem>
    </Dropdown>
  );

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white">
      {/* One grid at all breakpoints: mobile = title row + full-width search row; lg+ = single row, no duplicate controls */}
      <div className="mx-auto grid max-w-[100vw] grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-2 px-3 py-2.5 sm:px-4 lg:grid-cols-[auto_minmax(0,min(280px,28vw))_minmax(240px,1fr)_auto] lg:grid-rows-1 lg:items-center lg:gap-x-3 lg:px-6 lg:py-2.5 xl:min-h-16">
        <div className="col-start-1 row-start-1 self-center">
          <MobileNavTrigger />
        </div>
        <div className="col-start-2 row-start-1 min-w-0 self-center">
          <div className="hidden min-w-0 lg:block">
            <Breadcrumbs items={breadcrumbs} className="text-xs text-gray-600 xl:text-sm" />
          </div>
          <h1 className="truncate text-sm font-semibold leading-tight text-gray-900 lg:hidden">{pageTitle}</h1>
        </div>
        <div className="col-span-3 col-start-1 row-start-2 min-w-0 w-full lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:max-w-xl lg:justify-self-center">
          <SearchField onOpenCommand={openCommand} className="w-full" />
        </div>
        <div className="col-start-3 row-start-1 flex shrink-0 items-center justify-end gap-1 self-center sm:gap-1.5 lg:col-start-4">
          {!onStudioPulse && (
            <>
              <Link
                to="/dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-purple-700 transition hover:border-purple-200 hover:bg-purple-50 xl:hidden"
                title="Dashboard — Studio Pulse home"
                aria-label="Dashboard — Studio Pulse home"
              >
                <LayoutDashboard className="h-6 w-6 shrink-0" />
              </Link>
              <Link
                to="/dashboard"
                title="Studio Pulse — open dashboard"
                className="hidden items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-purple-700 xl:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                <span>Studio Pulse</span>
              </Link>
            </>
          )}
          <IconButton
            type="button"
            aria-label="Search"
            title="Search — opens command palette (⌘K / Ctrl+K)"
            onClick={openCommand}
            className="lg:hidden"
          >
            <Search className="h-6 w-6 text-gray-600" />
          </IconButton>
          <div
            className={cn(
              'hidden rounded-lg sm:block',
              highlightQuickCreate && 'animate-pulse ring-2 ring-purple-400/70 ring-offset-2 ring-offset-white'
            )}
          >
            <Dropdown
              align="right"
              trigger={<DropdownChevronTrigger label="Quick create" title="Quick create — client, project, invoice, task… (Ctrl+Shift+N)" />}
            >
              {quickCreateItems}
            </Dropdown>
          </div>
          <Dropdown
            align="right"
            className="sm:hidden"
            trigger={
              <IconButton
                aria-label="Quick create"
                title="Quick create — new client, project, invoice…"
                type="button"
                className={cn(
                  'h-11 w-11 border border-gray-200 bg-white',
                  highlightQuickCreate && 'ring-2 ring-purple-400/70 ring-offset-2 ring-offset-white'
                )}
              >
                <Plus className="h-6 w-6 text-gray-700" />
              </IconButton>
            }
          >
            {quickCreateItems}
          </Dropdown>
          <button
            type="button"
            onClick={() => {
              const next = !buildHelperEnabled;
              setBuildHelperEnabled(next);
              if (next) setHelperPanelCollapsed(false);
            }}
            className={cn(
              'flex h-10 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition sm:px-2.5 xl:gap-1.5',
              buildHelperEnabled
                ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            )}
            title="Build Helper — onboarding checklist for your first client site"
            aria-pressed={buildHelperEnabled}
          >
            <ListChecks className="h-6 w-6 shrink-0" aria-hidden />
            <span className="hidden xl:inline">Build Helper</span>
          </button>
          {notificationsMenu}
          {moreMenu}
          {accountMenu}
        </div>
      </div>
    </header>
  );
}

/** @deprecated Use TopHeader — alias for routes/layout imports. */
export const Header = TopHeader;
