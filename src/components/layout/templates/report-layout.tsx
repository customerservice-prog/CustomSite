import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReportLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-5xl space-y-8', className)}>{children}</div>;
}
