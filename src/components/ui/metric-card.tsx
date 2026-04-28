import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const tones = {
  default: {
    card: 'border-slate-200/90',
    icon: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    value: 'text-slate-900',
  },
  revenue: {
    card: 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-md shadow-emerald-900/[0.06]',
    icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
    value: 'text-emerald-950',
  },
  risk: {
    card: 'border-amber-200/90 bg-gradient-to-br from-white to-amber-50/50 shadow-md shadow-amber-900/[0.05]',
    icon: 'bg-amber-100 text-amber-800 ring-amber-200/80',
    value: 'text-amber-950',
  },
  danger: {
    card: 'border-rose-200/90 bg-gradient-to-br from-white to-rose-50/45 shadow-md shadow-rose-900/[0.06]',
    icon: 'bg-rose-100 text-rose-700 ring-rose-200/80',
    value: 'text-rose-950',
  },
  attention: {
    card: 'border-indigo-200/90 bg-gradient-to-br from-white to-indigo-50/50 shadow-md shadow-indigo-900/[0.07]',
    icon: 'bg-indigo-100 text-indigo-800 ring-indigo-200/80',
    value: 'text-indigo-950',
  },
} as const;

export type MetricTone = keyof typeof tones;

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  tone?: MetricTone;
  onClick?: () => void;
}) {
  const t = tones[tone];
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        t.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={cn('mt-1.5 text-xl font-bold tracking-tight sm:text-2xl', t.value)}>{value}</p>
          {hint && <p className="mt-1 text-xs font-medium text-slate-600">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              t.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
