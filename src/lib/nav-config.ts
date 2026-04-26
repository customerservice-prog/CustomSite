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
  badge?: number;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Pipeline', to: '/pipeline', icon: Kanban },
      { label: 'Clients', to: '/clients', icon: Users },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
      { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Invoices', to: '/invoices', icon: Receipt },
      { label: 'Payments', to: '/payments', icon: CreditCard },
      { label: 'Time tracking', to: '/time-tracking', icon: Clock },
      { label: 'Expenses', to: '/expenses', icon: Wallet },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Messages', to: '/messages', icon: MessageSquare, badge: 3 },
      { label: 'Contracts', to: '/contracts', icon: FileSignature, badge: 2 },
      { label: 'Proposals', to: '/proposals', icon: FileText },
      { label: 'Forms', to: '/forms', icon: ClipboardList },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Files', to: '/files', icon: Files },
      { label: 'Activity', to: '/activity', icon: Activity },
      { label: 'Reports', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Site Builder', to: '/site-builder', icon: Wand2 },
      { label: 'Client Portal', to: '/client-portal', icon: ShieldCheck },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];
