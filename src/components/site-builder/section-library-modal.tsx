import { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { SectionLibraryItem } from '@/lib/site-builder/site-structure-html';

type Props = {
  open: boolean;
  onClose: () => void;
  items: SectionLibraryItem[];
  onPick: (item: SectionLibraryItem) => void;
};

const STAGE_HEADINGS: Record<string, string> = {
  top: 'Top of page — hook & trust',
  middle: 'Middle — offers & proof',
  bottom: 'Bottom — close the sale',
};

function stageOrder(stage: string): number {
  if (stage === 'top') return 0;
  if (stage === 'middle') return 1;
  if (stage === 'bottom') return 2;
  return 9;
}

export function SectionLibraryModal({ open, onClose, items, onPick }: Props) {
  const grouped = useMemo(() => {
    const m = new Map<string, SectionLibraryItem[]>();
    for (const item of items) {
      const k = item.stage;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(item);
    }
    return [...m.entries()].sort((a, b) => stageOrder(a[0]) - stageOrder(b[0]));
  }, [items]);

  return (
    <Modal open={open} onClose={onClose} title="Add a conversion section">
      <p className="text-sm leading-relaxed text-slate-600">
        Pick a template — we insert a structured block at the bottom of this page. Reorder it in the outline, then tune copy in preview or
        HTML when needed.
      </p>
      <div className="mt-4 max-h-[min(62vh,30rem)] space-y-5 overflow-y-auto pr-1">
        {grouped.map(([stage, list]) => (
          <section key={stage}>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-violet-800/90">
              {STAGE_HEADINGS[stage] ?? stage}
            </h3>
            <ul className="mt-2 space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/50"
                  >
                    <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
