import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ActionCard({
  title,
  description,
  icon: Icon,
  action,
  onClick,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer p-5 transition duration-150 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex gap-4">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </Card>
  );
}
