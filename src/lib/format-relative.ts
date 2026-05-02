/** Tiny relative time for activity/notifications (no date-fns). */
export function formatRelativeShort(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 10) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Readable “last saved” for studio headers (same calendar day → “Today at …”). */
export function formatLastStudioTouch(iso: string): string {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return '—';

  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  if (startOf(d) === startOf(now)) {
    return `Today at ${d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (startOf(d) === startOf(yesterday)) {
    return `Yesterday at ${d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return formatRelativeShort(iso);
}
