import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function KanbanPageLayout({
  header,
  toolbar,
  board,
  className,
}: {
  header: ReactNode;
  toolbar?: ReactNode;
  board: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {header}
      {toolbar}
      <div className="overflow-x-auto pb-2">{board}</div>
    </div>
  );
}
