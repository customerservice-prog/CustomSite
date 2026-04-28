import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /** Panel under trigger (e.g. row action menu width). */
  menuClassName?: string;
}

export function Dropdown({ trigger, children, align = 'right', className, menuClassName }: DropdownProps) {
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
        className="inline-flex cursor-pointer items-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[13rem] rounded-xl border border-gray-200 bg-white py-1 shadow-md transition duration-150',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
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
        'flex h-9 w-full cursor-pointer items-center px-3 text-left text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-50',
        destructive ? 'text-red-600 hover:bg-red-50' : '',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownChevronTrigger({ label }: { label: string }) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50">
      {label}
      <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden />
    </span>
  );
}
