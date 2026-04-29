import { useShallow } from 'zustand/shallow';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function ClientPortalMessagesPage() {
  const ctx = useClientPortalProject();
  const threads = useAppStore(
    useShallow((s) => (ctx?.project ? sel.getThreadsForProject(s, ctx.project.id) : []))
  );

  if (!ctx) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        When your project is connected, your conversations with our team will show here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Messages</h2>
        <p className="mt-1 text-sm text-stone-600">Everything we have discussed about your project, in one place.</p>
      </div>
      <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {threads.length === 0 ? (
          <li className="p-6 text-sm text-stone-500">No messages yet. We will reach out here when there is news.</li>
        ) : (
          threads.map((t) => (
            <li key={t.id} className="px-5 py-4">
              <p className="font-semibold text-stone-900">{t.participant}</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{t.preview}</p>
              <p className="mt-2 text-xs text-stone-400">{t.lastActivityLabel}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
