import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'compact' | 'large';

const padding: Record<CardVariant, string> = {
  default: 'p-6',
  compact: 'p-4',
  large: 'p-8',
};

export function Card({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm', padding[variant], className)}
      {...props}
    />
  );
}
