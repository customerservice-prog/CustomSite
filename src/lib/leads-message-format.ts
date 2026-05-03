export type ParsedLeadBody = {
  /** Extracted subject when message starts with `Subject: …` */
  inferredSubject?: string;
  /** Full message trimmed or body after optional subject prefix */
  displayPreviewSource: string;
  /** Expanded body — without subject prefix when parsed */
  bodyForDisplay: string;
};

/** Messages from contact flows may embed `Subject: Line\n\n` before the body. */
export function parseSubjectPrefixedLeadMessage(raw: string | null | undefined): ParsedLeadBody {
  const msg = typeof raw === 'string' ? raw : '';
  const trimmedStart = msg.trimStart();
  const m = trimmedStart.match(/^Subject:\s*([^\n\r]+)(\r?\n\s*){2,}/i);
  if (!m || m.index === undefined) {
    const t = msg.trim();
    return { displayPreviewSource: t, bodyForDisplay: msg };
  }
  const inferredSubject = m[1]?.trim();
  const after = trimmedStart.slice(m[0].length).trimEnd();
  return {
    inferredSubject,
    displayPreviewSource: after || inferredSubject || trimmedStart.slice(8).trim() || trimmedStart,
    bodyForDisplay: after || '',
  };
}

/** Host shown in list — prefers `current_url` from lead row. */
export function hostnameFromCurrentUrl(raw: string | null | undefined): string {
  if (!raw || !String(raw).trim()) return '—';
  const s = String(raw).trim();
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
    const host = new URL(withProto).hostname;
    return host || '—';
  } catch {
    return s.replace(/^https?:\/\//i, '').split('/')[0] || '—';
  }
}

export function initialsFromName(name: string | null | undefined): string {
  const n = (name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export function formatRelativeTimeReceived(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 8) return `${w}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function previewText(source: string, maxLen = 120): string {
  const oneLine = source.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}
