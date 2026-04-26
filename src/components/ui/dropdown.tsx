import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block text-left', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="inline-flex cursor-pointer items-center rounded-xl transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[13rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 transition duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm font-medium transition duration-150',
        destructive ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownChevronTrigger({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition duration-150 hover:bg-slate-50">
      {label}
      <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
    </span>
  );
}
