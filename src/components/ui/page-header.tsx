import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description != null && description !== '' && (
          <div className="max-w-2xl text-[15px] font-medium leading-relaxed text-slate-600">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
