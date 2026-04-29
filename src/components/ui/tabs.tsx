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
      <div className="flex flex-wrap gap-0.5 rounded-xl bg-slate-100/70 p-1 ring-1 ring-slate-900/[0.05]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={cn(
              'cursor-pointer rounded-lg px-3 py-2 text-[13px] font-semibold tracking-tight transition-all duration-150 ease-out',
              active === t.id
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{panel?.content}</div>
    </div>
  );
}
