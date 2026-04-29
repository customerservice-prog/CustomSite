/**
 * When false, we assume a real API backs the admin (set VITE_USE_REAL_API=1 in production with Supabase).
 * Otherwise show a clear banner: in-memory / demo dataset in the SPA.
 */
export function shouldShowDemoDatasetBanner(): boolean {
  if (import.meta.env.VITE_HIDE_DEMO_BANNER === '1') return false;
  return import.meta.env.VITE_USE_REAL_API !== '1';
}

export const DEMO_BANNER_STORAGE_KEY = 'customsite_dismiss_demo_banner';

export function isDemoBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DEMO_BANNER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
