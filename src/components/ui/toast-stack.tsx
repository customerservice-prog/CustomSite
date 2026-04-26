import { CheckCircle2, X } from 'lucide-react';
import { useShell } from '@/context/shell-context';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

export function ToastStack() {
  const { toasts, dismissToast } = useShell();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ring-1 transition duration-200',
            t.variant === 'success' && 'border-emerald-100 bg-white text-emerald-950 ring-emerald-100',
            t.variant === 'error' && 'border-red-100 bg-white text-red-950 ring-red-100',
            t.variant === 'info' && 'border-indigo-100 bg-white text-slate-900 ring-indigo-100'
          )}
        >
          {t.variant === 'success' && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          )}
          <p className="min-w-0 flex-1 text-sm font-medium">{t.message}</p>
          <IconButton
            type="button"
            className="h-8 w-8 shrink-0"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
