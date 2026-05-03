import type { SupabaseClient } from '@supabase/supabase-js';
import { clearAdminTokens } from '@/lib/admin-api';

/** Default Supabase-js localStorage keys: `sb-<project-ref>-auth-token`. */
function clearDefaultSupabaseAuthStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/**
 * Ends the studio session: revokes/clears Supabase, clears app token keys, wipes leftover Supabase storage.
 * Uses `scope: 'local'` if global revoke fails (e.g. flaky network on live).
 */
export async function signOutStudio(supabase: SupabaseClient | null | undefined): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* still clear storage below */
      }
    }
  }
  clearAdminTokens();
  clearDefaultSupabaseAuthStorage();
}

/** After logout: production goes to portal sign-in so another account can authenticate; demo reloads SPA. */
export function finalizeStudioSignOutNavigate(): void {
  if (typeof window === 'undefined') return;
  if (import.meta.env.VITE_USE_REAL_API === '1') {
    window.location.replace('/client-portal.html?agency=1');
    return;
  }
  window.location.reload();
}
