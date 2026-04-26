import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DetailPageLayout({
  backHref,
  backLabel,
  title,
  meta,
  badge,
  actions,
  children,
  className,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-8', className)}>
      <div>
        <Link
          to={backHref}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
              {badge}
            </div>
            {meta && <div className="text-sm text-slate-500">{meta}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
