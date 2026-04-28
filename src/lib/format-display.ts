/** User-facing currency, dates, and processor labels — consistent across the app. */

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatShortDate(isoOrLabel: string | null | undefined): string {
  if (isoOrLabel == null || isoOrLabel === '—') return '—';
  const s = String(isoOrLabel).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10) + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  if (/\d{4}$/.test(s)) return s;
  return `${s}, 2026`;
}

export function titleCaseStatus(raw: string | undefined | null): string {
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  if (s === 'paid_out') return 'Paid Out';
  if (s === 'in_transit') return 'In Transit';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'completed') return 'Completed';
  if (s === 'pending') return 'Pending';
  if (s === 'failed') return 'Failed';
  if (s === 'settled') return 'Settled';
  if (s === 'processing') return 'Processing';
  return s
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
