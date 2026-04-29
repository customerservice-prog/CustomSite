import { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { SectionTemplateRow } from '@/lib/site-templates/section-catalog';

const CATEGORY_ORDER: SectionTemplateRow['category'][] = [
  'hero',
  'trust',
  'offers',
  'proof',
  'compare',
  'story',
  'faq',
  'cta',
  'footer',
];

const CATEGORY_LABELS: Record<SectionTemplateRow['category'], string> = {
  hero: 'Hero',
  trust: 'Trust & proof',
  offers: 'Services & offers',
  proof: 'Proof & testimonials',
  compare: 'Comparison',
  story: 'Story & process',
  faq: 'FAQ',
  cta: 'Call to action',
  footer: 'Footer',
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: SectionTemplateRow[];
  onPick: (item: SectionTemplateRow) => void;
  /** When set, inserted after this section index; otherwise appended before </body>. */
  insertContext?: string | null;
};

export function SectionLibraryModal({ open, onClose, items, onPick, insertContext }: Props) {
  const grouped = useMemo(() => {
    const m = new Map<SectionTemplateRow['category'], SectionTemplateRow[]>();
    for (const item of items) {
      if (!m.has(item.category)) m.set(item.category, []);
      m.get(item.category)!.push(item);
    }
    return CATEGORY_ORDER.filter((c) => m.has(c)).map((c) => [c, m.get(c)!] as const);
  }, [items]);

  return (
    <Modal open={open} onClose={onClose} title="Insert conversion section">
      {insertContext && (
        <p className="mb-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-900 ring-1 ring-violet-100">
          {insertContext}
        </p>
      )}
      <p className="text-sm leading-relaxed text-slate-600">
        Each block has a job — pick one, we insert structured HTML. Save the page to refresh the preview.
      </p>
      <div className="mt-4 max-h-[min(62vh,30rem)] space-y-5 overflow-y-auto pr-1">
        {grouped.map(([category, list]) => (
          <section key={category}>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-violet-800/90">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="mt-2 space-y-3">
              {list.map((item) => (
                <li
                  key={item.templateId}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 ring-1 ring-transparent transition-colors hover:border-violet-200 hover:bg-violet-50/30"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.libraryTitle}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Purpose</p>
                      <p className="text-xs leading-relaxed text-slate-600">{item.purposeLabel}</p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</p>
                      <p className="text-xs italic text-slate-500">{item.previewText}</p>
                    </div>
                    <Button type="button" className="h-9 shrink-0 self-start px-4 text-xs font-semibold" onClick={() => onPick(item)}>
                      Insert
                    </Button>
                  </div>
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
