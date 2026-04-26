import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn('p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
