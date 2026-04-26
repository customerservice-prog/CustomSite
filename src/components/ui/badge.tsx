import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const styles = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100',
  danger: 'bg-red-50 text-red-800 ring-1 ring-red-100',
  info: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof styles;
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
