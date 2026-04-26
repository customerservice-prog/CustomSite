import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Keeps secondary pages from dead-ending — nudge back to pulse + forward actions. */
export function PageMomentumStrip({
  title = 'Where to go next',
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/90 to-indigo-50/40 px-4 py-3 shadow-sm ring-1 ring-slate-900/[0.04]',
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-800">{children}</div>
    </div>
  );
}

export function MomentumChip({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-indigo-700 transition hover:bg-white hover:text-indigo-900"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}

export function MomentumSep() {
  return <span className="text-slate-300">·</span>;
}
