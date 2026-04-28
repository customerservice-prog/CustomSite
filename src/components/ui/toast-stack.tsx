import { useShell } from '@/context/shell-context';

export function ToastStack() {
  const { toasts, dismissToast } = useShell();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto rounded-lg bg-black px-4 py-2 text-left text-sm text-white shadow-lg transition hover:bg-gray-900"
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
