import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({
  className,
  footer,
  dense,
  ...props
}: HTMLAttributes<HTMLTableElement> & { footer?: ReactNode; dense?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <div className="scroll-table overflow-x-auto">
        <table
          className={cn(
            'w-full min-w-0 border-collapse text-left text-sm text-slate-600 md:min-w-[560px]',
            dense && 'text-[13px]',
            className
          )}
          {...props}
        />
      </div>
      {footer}
    </div>
  );
}

export function TableFooterBar({ from, to, total }: { from: number; to: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs font-medium text-slate-600">
      <span>
        Showing <span className="font-bold text-slate-900">{from}</span>–<span className="font-bold text-slate-900">{to}</span> of{' '}
        <span className="font-bold text-slate-900">{total}</span>
      </span>
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-slate-200 bg-slate-50/95 text-left shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-sm',
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />;
}

export function TableRow({
  className,
  clickable,
  selected,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean; selected?: boolean }) {
  return (
    <tr
      className={cn(
        'transition duration-150 hover:bg-slate-50/95',
        clickable && 'cursor-pointer',
        selected && 'bg-indigo-50/50',
        className
      )}
      {...props}
    />
  );
}

export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 first:pl-4 last:pr-4 sm:px-4 sm:py-3.5',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-3 text-slate-700 first:pl-4 last:pr-4 sm:px-4 sm:py-3.5', className)} {...props} />;
}
