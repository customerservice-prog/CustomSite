import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';

export function EntityDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="entity-drawer-title">
      <button
        type="button"
        className="drawer-backdrop-animate absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div className="drawer-panel-animate relative flex h-full w-full max-w-[420px] flex-col border-l border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <div className="min-w-0">
            <h2 id="entity-drawer-title" className="truncate text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle ? <p className="truncate text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <IconButton type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-slate-600">
            <X className="h-5 w-5" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <footer className="shrink-0 border-t border-slate-100 px-6 py-4">{footer}</footer> : null}
      </div>
    </div>
  );
}
