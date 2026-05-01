/** One-time welcome flow — v1 key bumps if copy/steps change materially. */
export const ONBOARDING_DONE_KEY = 'customsite_onboarding_v1_done';

export function readOnboardingDone(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
  } catch {
    return true;
  }
}

export function writeOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}
