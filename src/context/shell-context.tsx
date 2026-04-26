import type { ReactNode } from 'react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';

/** Legacy bridge: UI reads/writes the Zustand app store. Toast + layout chrome stay ergonomic for existing screens. */
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
