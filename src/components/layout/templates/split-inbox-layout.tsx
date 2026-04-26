import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SplitInboxLayout({
  sidebar,
  main,
  className,
}: {
  sidebar: ReactNode;
  main: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid min-h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(280px,340px)_1fr]',
        className
      )}
    >
      <aside className="flex flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">{sidebar}</aside>
      <section className="flex min-h-[420px] flex-col bg-slate-50/40">{main}</section>
    </div>
  );
}
