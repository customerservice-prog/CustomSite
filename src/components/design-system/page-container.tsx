import type { ReactNode } from 'react';

/** Main scroll region content — max width and padding are fixed; pages must not override. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1200px] px-4 py-4 md:px-8 md:py-6">{children}</div>;
}
