import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusBadgeTone = 'green' | 'yellow' | 'red' | 'gray' | 'purple';

const tones: Record<StatusBadgeTone, string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
};

export function StatusBadge({
  children,
  tone = 'gray',
  className,
}: {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}
