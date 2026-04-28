import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NextActionItem = {
  label: string;
  href: string;
  hint?: string;
  tone?: 'danger' | 'warning' | 'default';
};

const toneBorder: Record<NonNullable<NextActionItem['tone']>, string> = {
  danger: 'border-l-red-500 bg-red-50/40',
  warning: 'border-l-amber-500 bg-amber-50/35',
  default: 'border-l-purple-500 bg-purple-50/30',
};

/** Compact “do this next” strip — not a full-width banner. */
export function RecommendedNextAction({ items }: { items: NextActionItem[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-gray-900/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Recommended next actions</p>
      <ul className="mt-2 divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.label} className="first:pt-0 last:pb-0">
            <Link
              to={it.href}
              className={cn(
                'group flex items-start gap-3 border-l-4 py-2.5 pl-3 transition-colors hover:bg-gray-50/80',
                toneBorder[it.tone ?? 'default']
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900 group-hover:text-purple-700">{it.label}</span>
                {it.hint ? <span className="mt-0.5 block text-xs text-gray-600">{it.hint}</span> : null}
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-purple-600" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
