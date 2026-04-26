import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Command-center wrapper: consistent vertical rhythm for dense dashboards */
export function DashboardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-8', className)}>{children}</div>;
}
