import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({
  className,
  footer,
  dense,
  ...props
}: HTMLAttributes<HTMLTableElement> & { footer?: ReactNode; dense?: boolean }) {
  return (
    <>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-900/[0.06]">
        <table
          className={cn('min-w-full border-collapse text-left text-sm text-slate-700', dense && 'text-[13px]', className)}
          {...props}
        />
      </div>
      {footer}
    </>
  );
}

export function TableFooterBar({ from, to, total }: { from: number; to: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600">
      <span>
        Showing <span className="font-semibold text-gray-900">{from}</span>–<span className="font-semibold text-gray-900">{to}</span> of{' '}
        <span className="font-semibold text-gray-900">{total}</span>
      </span>
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-slate-100 bg-slate-50/50', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableRow({
  className,
  clickable = true,
  selected,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean; selected?: boolean }) {
  return (
    <tr
      className={cn(
        'min-h-[60px] border-b border-slate-100/90 transition-colors duration-150 ease-out hover:bg-slate-50/80',
        clickable && 'cursor-pointer',
        selected && 'bg-purple-50',
        className
      )}
      {...props}
    />
  );
}

export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 align-middle text-slate-800', className)} {...props} />;
}
