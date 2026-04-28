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
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  badgeFromStore?: 'unread-messages' | 'pending-contracts';
}

/** Single home item — rendered above grouped nav (always visible). */
export const studioPulseNavItem: NavItem = {
  label: 'Studio Pulse',
  to: '/dashboard',
  icon: LayoutDashboard,
};

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Delivery',
    items: [
      { label: 'Clients', to: '/clients', icon: Users },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
      { label: 'Calendar', to: '/calendar', icon: CalendarDays },
      { label: 'Files', to: '/files', icon: Files },
      { label: 'Activity', to: '/activity', icon: Activity },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Invoices', to: '/invoices', icon: Receipt },
      { label: 'Payments', to: '/payments', icon: CreditCard },
      { label: 'Expenses', to: '/expenses', icon: Wallet },
      { label: 'Time tracking', to: '/time-tracking', icon: Clock },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Messages', to: '/messages', icon: MessageSquare, badgeFromStore: 'unread-messages' },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, badgeFromStore: 'pending-contracts' },
    ],
  },
  {
    label: 'Growth & Admin',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Client portal', to: '/client-portal', icon: ShieldCheck },
      { label: 'Site builder', to: '/site-builder', icon: Wand2 },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];
