import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { SectionLibraryItem } from '@/lib/site-builder/site-structure-html';

type Props = {
  open: boolean;
  onClose: () => void;
  items: SectionLibraryItem[];
  onPick: (item: SectionLibraryItem) => void;
};

export function SectionLibraryModal({ open, onClose, items, onPick }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Insert section">
      <p className="text-sm leading-relaxed text-slate-600">
        Choose a block to add to the bottom of this page. You can move it in the outline or edit the HTML after.
      </p>
      <ul className="mt-4 max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/40"
            >
              <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.description}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
