import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-transparent text-slate-600 transition duration-150',
        'hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
        'active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
