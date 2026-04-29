import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-violet-700 text-white shadow-sm shadow-violet-900/10 hover:bg-violet-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
  secondary:
    'border border-slate-200/90 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2',
  ghost:
    'text-slate-700 hover:bg-slate-100/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2',
  destructive:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
};

const baseButton =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold tracking-tight transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50';

export function buttonClassName(variant: keyof typeof variants = 'primary', className?: string) {
  return cn(baseButton, variants[variant], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', disabled, ...props }, ref) => (
    <button ref={ref} type={type} disabled={disabled} className={cn(baseButton, variants[variant], className)} {...props} />
  )
);
Button.displayName = 'Button';
