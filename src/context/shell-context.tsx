import type { ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';

/** Shell chrome: toasts, mobile nav, and layout state alongside the workspace store. */
export function ShellProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useShell() {
  return useAppStore(
    useShallow((s) => ({
      mobileNavOpen: s.ui.mobileSidebarOpen,
      setMobileNavOpen: s.setMobileSidebarOpen,
      commandOpen: s.ui.commandPaletteOpen,
      setCommandOpen: s.setCommandPaletteOpen,
      toasts: s.toasts,
      toast: s.toast,
      dismissToast: s.dismissToast,
    }))
  );
}
