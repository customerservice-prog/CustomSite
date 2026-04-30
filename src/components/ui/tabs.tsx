import { type ReactNode, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

type TabsProps = {
  tabs: TabDef[];
  /** Uncontrolled default when `activeId` is not passed. */
  defaultId?: string;
  /** Controlled active tab — pair with `onActiveChange` for URL-driven tabs. */
  activeId?: string;
  onActiveChange?: (id: string) => void;
};

export function Tabs({ tabs, defaultId, activeId, onActiveChange }: TabsProps) {
  const fallbackId = defaultId ?? tabs[0]?.id ?? '';
  const [internal, setInternal] = useState(fallbackId);
  const controlled = activeId !== undefined;

  const active = useMemo(() => {
    if (!controlled) return internal;
    if (activeId && tabs.some((t) => t.id === activeId)) return activeId;
    return fallbackId;
  }, [activeId, controlled, fallbackId, internal, tabs]);

  const setActive = (id: string) => {
    onActiveChange?.(id);
    if (!controlled) setInternal(id);
  };

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
