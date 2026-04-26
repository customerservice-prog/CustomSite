import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SettingsLayout({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-8 lg:flex-row', className)}>
      <nav className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm lg:w-56 lg:flex-col lg:overflow-visible">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              'whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition duration-150',
              activeTab === t.id
                ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
    </div>
  );
}
