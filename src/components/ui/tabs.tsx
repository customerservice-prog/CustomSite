import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, defaultId }: { tabs: TabDef[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id ?? '');
  const panel = tabs.find((t) => t.id === active);

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              'cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-150',
              active === t.id
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{panel?.content}</div>
    </div>
  );
}
