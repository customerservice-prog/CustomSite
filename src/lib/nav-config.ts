import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock,
  CreditCard,
  FileSignature,
  FileText,
  Files,
  FolderKanban,
  Kanban,
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
  /** When true, sidebar replaces this with a live count from workspace data. */
  badgeFromStore?: 'unread-messages' | 'pending-contracts';
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Command center',
    items: [{ label: 'Command center', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Pipeline', to: '/pipeline', icon: Kanban },
      { label: 'Proposals', to: '/proposals', icon: FileText },
      { label: 'Forms', to: '/forms', icon: ClipboardList },
    ],
  },
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
    label: 'Growth & admin',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Client portal', to: '/client-portal', icon: ShieldCheck },
      { label: 'Site builder', to: '/site-builder', icon: Wand2 },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];
