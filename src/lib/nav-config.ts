import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  Clock,
  CreditCard,
  FileSignature,
  Files,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Receipt,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';

/** React Router sidebar row — same styling as legacy `NavItem` internal links. */
export type NavItemInternalLink = {
  label: string;
  icon: LucideIcon;
  to: string;
  navTitle?: string;
  badgeFromStore?: 'unread-messages' | 'pending-contracts' | 'open-invoices';
};

/** External URL — opens in a new tab; no SPA route. */
export type NavItemExternalLink = {
  label: string;
  icon: LucideIcon;
  externalHref: string;
  showNewBadge?: boolean;
  navTitle?: string;
};

export type NavItem = NavItemInternalLink | NavItemExternalLink;

export function isNavExternalLink(item: NavItem): item is NavItemExternalLink {
  return 'externalHref' in item && typeof item.externalHref === 'string';
}

/** Single home item — rendered above grouped nav (always visible). */
export const studioPulseNavItem: NavItemInternalLink = {
  label: 'Studio Pulse',
  to: '/dashboard',
  icon: LayoutDashboard,
};

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Build & deliver',
    items: [
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'AI Builder', to: '/rbyan', icon: Sparkles, navTitle: 'Prompt-driven site builder (Bryan the Brain)' },
      { label: 'Site builder', to: '/site-builder', icon: Wand2 },
      { label: 'Clients', to: '/clients', icon: Users },
      { label: 'Messages', to: '/messages', icon: MessageSquare, badgeFromStore: 'unread-messages' },
      { label: 'Message Center', to: '/messages-center', icon: Inbox, navTitle: 'Contact form submissions — public leads API' },
      {
        label: '📍 Local SEO Hub',
        icon: MapPin,
        externalHref: 'https://theeyeisi.com/local-seo.html',
        showNewBadge: true,
        navTitle: 'Local SEO & Google Business Profile dashboard (theeyeisi.com)',
      },
      { label: 'Files', to: '/files', icon: Files },
      { label: 'Invoices', to: '/invoices', icon: Receipt, badgeFromStore: 'open-invoices' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
      { label: 'Calendar', to: '/calendar', icon: CalendarDays },
      { label: 'Activity', to: '/activity', icon: Activity },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Payments', to: '/payments', icon: CreditCard },
      { label: 'Expenses', to: '/expenses', icon: Wallet },
      { label: 'Billable hours', to: '/time-tracking', icon: Clock },
    ],
  },
  {
    label: 'Contracts & admin',
    items: [
      { label: 'Contracts', to: '/contracts', icon: FileSignature, badgeFromStore: 'pending-contracts' },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];
