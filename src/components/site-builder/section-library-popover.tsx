import { useMemo, useState } from 'react';
import { Library, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SectionTemplateRow } from '@/lib/site-templates/section-catalog';
import { SECTION_LIBRARY_ROWS } from '@/lib/site-templates/section-catalog';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  onInsert: (row: SectionTemplateRow) => void;
};

export function SectionLibraryPopover({ className, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SECTION_LIBRARY_ROWS;
    return SECTION_LIBRARY_ROWS.filter(
      (r) =>
        r.libraryTitle.toLowerCase().includes(s) ||
        String(r.category).includes(s) ||
        r.purposeLabel.toLowerCase().includes(s) ||
        r.templateId.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="secondary"
        className="h-8 gap-1 border-white/10 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/15"
        onClick={() => setOpen((v) => !v)}
      >
        <Library className="h-3.5 w-3.5" aria-hidden />
        Sections
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/15 bg-zinc-900 shadow-2xl ring-1 ring-black/40">
            <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sections…"
                className="h-8 border-0 bg-transparent text-xs text-white placeholder:text-zinc-600 focus-visible:ring-0"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1 text-left">
              {filtered.slice(0, 40).map((row) => (
                <li key={row.templateId}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs transition hover:bg-white/10"
                    onClick={() => {
                      onInsert(row);
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    <span className="font-semibold text-zinc-100">{row.libraryTitle}</span>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">{row.category}</span>
                    <span className="text-[11px] text-zinc-400">{row.purposeLabel}</span>
                  </button>
                </li>
              ))}
              {!filtered.length ? <li className="px-3 py-6 text-center text-xs text-zinc-500">No matches</li> : null}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
