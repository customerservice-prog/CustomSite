import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReportLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1680px] space-y-8', className)}>{children}</div>;
}
