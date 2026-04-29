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
      className="flex shrink-0 items-start gap-3 border-b border-amber-800/25 bg-amber-100 px-4 py-2.5 text-amber-950 md:px-5"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-950 md:text-[13px]">
        <span className="font-semibold text-amber-950">Local workspace.</span>{' '}
        <span className="text-amber-950">
          You are not using the live admin API (
          <code className="rounded bg-amber-200/90 px-1.5 py-0.5 font-mono text-[11px] text-amber-950">VITE_USE_REAL_API</code> is off). Client and project lists still come
          from the demo dataset in memory, but <span className="font-semibold text-amber-950">Site builder files for each project are saved in this browser</span>{' '}
          (localStorage) so you can build and preview without Supabase. For server-backed lists and deploys: put{' '}
          <code className="rounded bg-amber-200/90 px-1 font-mono text-[11px] text-amber-950">VITE_USE_REAL_API=1</code> in <code className="rounded bg-amber-200/90 px-1 font-mono text-[11px] text-amber-950">.env</code>, keep Express running (
          <code className="rounded bg-amber-200/90 px-1 font-mono text-[11px] text-amber-950">npm run dev</code> on one port, or <code className="rounded bg-amber-200/90 px-1 font-mono text-[11px] text-amber-950">npm run admin:dev</code> with API on{' '}
          <code className="rounded bg-amber-200/90 px-1 font-mono text-[11px] text-amber-950">127.0.0.1:3000</code>), then restart Vite.
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-amber-900 transition hover:bg-amber-200/90 hover:text-amber-950"
        aria-label="Dismiss demo notice"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
