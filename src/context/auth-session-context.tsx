import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  clearAdminTokens,
  getAccessToken,
  getRefreshToken,
  syncTokensFromSupabaseSession,
} from '@/lib/admin-api';
import { shouldShowDemoDatasetBanner } from '@/lib/runtime-demo';

type PublicConfig = {
  configured?: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export type AuthSessionContextValue = {
  /** False until first auth bootstrap pass finishes (Supabase hydrate or skip in demo / local API). */
  sessionHydrated: boolean;
  /** Browser Supabase client when server exposes anon config; drives auto-refresh into customsite_* keys. */
  supabaseBrowser: SupabaseClient | null;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function useRealAdminApi(): boolean {
  return import.meta.env.VITE_USE_REAL_API === '1';
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [supabaseBrowser, setSupabaseBrowser] = useState<SupabaseClient | null>(null);

  const skipSupabaseHydration = !useRealAdminApi() || shouldShowDemoDatasetBanner();

  useEffect(() => {
    if (skipSupabaseHydration) {
      setSupabaseBrowser(null);
      setSessionHydrated(true);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const res = await fetch('/api/config/public');
        const cfg = (await res.json().catch(() => ({}))) as PublicConfig;
        if (cancelled) return;
        if (!cfg?.configured || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          setSupabaseBrowser(null);
          return;
        }

        const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        const access = getAccessToken()?.trim() || '';
        const refresh = getRefreshToken()?.trim() || '';

        if (refresh && access) {
          try {
            await supabase.auth.setSession({
              access_token: access,
              refresh_token: refresh,
            });
          } catch {
            /* Expired refresh or non-Supabase JWT — adminFetchJson may still recover via POST /api/auth/refresh */
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!cancelled && session) {
          syncTokensFromSupabaseSession(session);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (event === 'SIGNED_OUT') {
            clearAdminTokens();
            if (import.meta.env.VITE_USE_REAL_API === '1') {
              void import('@/store/useAppStore').then(({ useAppStore }) => useAppStore.getState().hydrateAgencyFromServer());
            }
            return;
          }
          if (nextSession) {
            syncTokensFromSupabaseSession(nextSession);
          }
          if (import.meta.env.VITE_USE_REAL_API === '1' && nextSession && event === 'SIGNED_IN') {
            void import('@/store/useAppStore').then(({ useAppStore }) => useAppStore.getState().hydrateAgencyFromServer());
          }
        });
        unsub = () => subscription.unsubscribe();

        if (!cancelled) {
          setSupabaseBrowser(supabase);
        }
      } catch {
        if (!cancelled) setSupabaseBrowser(null);
      } finally {
        if (!cancelled) {
          if (import.meta.env.VITE_USE_REAL_API === '1') {
            try {
              const { useAppStore } = await import('@/store/useAppStore');
              await useAppStore.getState().hydrateAgencyFromServer();
            } catch {
              /* hydrate sets its own error state */
            }
          }
          setSessionHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [skipSupabaseHydration]);

  const value = useMemo(
    () => ({
      sessionHydrated,
      supabaseBrowser,
    }),
    [sessionHydrated, supabaseBrowser]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}
