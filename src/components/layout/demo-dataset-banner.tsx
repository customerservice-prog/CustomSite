import { useState } from 'react';
import { X } from 'lucide-react';
import { DEMO_BANNER_STORAGE_KEY, shouldShowDemoDatasetBanner } from '@/lib/runtime-demo';

export function DemoDatasetBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DEMO_BANNER_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!shouldShowDemoDatasetBanner() || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DEMO_BANNER_STORAGE_KEY, '1');
    } catch {
      /* */
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-start gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-amber-950 md:px-5"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed md:text-[13px]">
        <span className="font-semibold">Demo mode.</span> Clients, projects, and tasks you create here live in this browser session only
        (in-memory). They disappear after a full refresh unless the server is connected to Supabase and you are signed in with a real account.
        Conversion workspace saves HTML to the server only when the API is reachable (local RAM store when the database is not configured).
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-amber-800/80 transition hover:bg-amber-100 hover:text-amber-950"
        aria-label="Dismiss demo notice"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
