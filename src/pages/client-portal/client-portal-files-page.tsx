import { useShallow } from 'zustand/shallow';
import { useClientPortalProject } from '@/hooks/use-client-portal-project';
import { useAppStore } from '@/store/useAppStore';
import * as sel from '@/store/selectors';

export function ClientPortalFilesPage() {
  const ctx = useClientPortalProject();
  const files = useAppStore(
    useShallow((s) =>
      ctx?.project
        ? sel.getFilesForProject(s, ctx.project.id).filter((f) => f.visibility === 'Client-visible')
        : []
    )
  );

  if (!ctx) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm">
        When your project is connected, files we share with you will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Files</h2>
        <p className="mt-1 text-sm text-stone-600">Documents and assets your team has shared for you.</p>
      </div>
      <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {files.length === 0 ? (
          <li className="p-6 text-sm text-stone-500">No files yet.</li>
        ) : (
          files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="font-medium text-stone-900">{f.name}</span>
              <span className="shrink-0 text-xs text-stone-400">{f.size}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
