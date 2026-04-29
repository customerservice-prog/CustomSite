import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'compact' | 'large';

const padding: Record<CardVariant, string> = {
  default: 'p-6',
  compact: 'p-4',
  large: 'p-8',
};

/** Default: soft ring + lift shadow — avoids heavy “boxed dashboard” borders. */
const surface = 'rounded-2xl bg-white shadow-[var(--app-shadow-card)] ring-1 ring-slate-900/[0.06]';

export function Card({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(surface, padding[variant], className)}
      {...props}
    />
  );
}
