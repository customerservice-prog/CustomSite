import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1 text-sm', className)}>
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
          {c.to && i < items.length - 1 ? (
            <Link to={c.to} className="font-medium text-slate-500 transition hover:text-slate-800">
              {c.label}
            </Link>
          ) : (
            <span
              className={i === items.length - 1 ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
