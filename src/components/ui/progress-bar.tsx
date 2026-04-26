import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200/90', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
