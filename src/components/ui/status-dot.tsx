import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-indigo-500',
};

export function StatusDot({
  tone = 'neutral',
  pulse,
  className,
}: {
  tone?: keyof typeof tones;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      {pulse && (
        <span
          className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', tones[tone])}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', tones[tone])} />
    </span>
  );
}
