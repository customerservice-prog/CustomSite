import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function TableToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TableToolbarSection({
  children,
  className,
  grow,
}: {
  children: ReactNode;
  className?: string;
  grow?: boolean;
}) {
  return <div className={cn('flex flex-wrap items-center gap-2', grow && 'min-w-0 flex-1', className)}>{children}</div>;
}
