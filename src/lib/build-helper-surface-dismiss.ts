const KEY = 'customsite_build_helper_nudge_dismiss_until';

export function readBuildHelperNudgeDismissUntil(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function dismissBuildHelperNudgeForDays(days: number): void {
  try {
    const until = Date.now() + days * 86400000;
    localStorage.setItem(KEY, String(until));
  } catch {
    /* ignore */
  }
}

export function clearBuildHelperNudgeDismiss(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
