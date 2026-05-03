import { useAuthSession } from '@/context/auth-session-context';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

const AGENCY_PORTAL_SIGNIN = '/client-portal.html?agency=1';

/**
 * Live API builds have no embedded login screen; without a token the shell still renders (avatar fallback "You").
 * Block the UI and send people to the same portal login that sets admin tokens (`js/main.js` → `/admin.html`).
 */
export function AgencySignedOutGate() {
  const { sessionHydrated } = useAuthSession();
  const hydration = useAppStore((s) => s.hydration);
  const currentUserId = useAppStore((s) => s.currentUserId);

  if (import.meta.env.VITE_USE_REAL_API !== '1') return null;
  if (!sessionHydrated || hydration.status !== 'ready') return null;
  if (currentUserId.trim()) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 px-6 text-center text-white">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Agency sign-in required</h1>
        <p className="text-sm leading-relaxed text-white/75">
          This dashboard does not embed a login form. Use the agency sign-in portal with your workspace email and password; when you succeed, you&apos;ll return to the dashboard with that account.
        </p>
      </div>
      <Button
        type="button"
        className="bg-white px-6 text-slate-900 hover:bg-gray-100"
        onClick={() => {
          window.location.assign(AGENCY_PORTAL_SIGNIN);
        }}
      >
        Sign in at portal
      </Button>
      <p className="max-w-md text-[11px] leading-relaxed text-white/55">
        After you sign in, you will land on Admin again automatically. Switching accounts: use Sign out in the menu, then sign in here.
      </p>
    </div>
  );
}
