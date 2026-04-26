import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function TablePageLayout({
  header,
  toolbar,
  children,
  className,
}: {
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {header}
      {toolbar}
      {children}
    </div>
  );
}
