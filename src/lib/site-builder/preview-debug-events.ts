export type PreviewDebugCategory = 'js' | 'blocked' | 'iframe';

export type PreviewDebugEvent = {
  id: string;
  category: PreviewDebugCategory;
  type: string;
  detail: string;
  time: string;
};

function nextId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createPreviewDebugEvent(type: string, detail: string, time = new Date().toLocaleTimeString()): PreviewDebugEvent {
  return {
    id: nextId(),
    category: categorizePreviewMessageType(type),
    type,
    detail,
    time,
  };
}

export function categorizePreviewMessageType(type: string): PreviewDebugCategory {
  const t = (type || '').toLowerCase();
  if (
    t === 'iframe-onerror' ||
    t === 'iframe-error' ||
    t === 'iframe-rejection' ||
    t.startsWith('react-') ||
    t === 'react-preview-boundary'
  ) {
    return 'js';
  }
  if (
    t === 'blocked-target' ||
    t === 'blocked-javascript-href' ||
    t === 'blocked-protocol-relative' ||
    t === 'blocked-root-path' ||
    t === 'blocked-relative-nav' ||
    t === 'blocked-hash-href'
  ) {
    return 'blocked';
  }
  return 'iframe';
}

const SANDBOX_PROBE_PREFIX = 'sandbox-probe-';

/** From preview postMessage events: any `leaked:` outcome means the iframe sandbox is broken. */
export function deriveSandboxStatus(events: PreviewDebugEvent[]): 'pending' | 'safe' | 'leaked' {
  const probes = events.filter((e) => e.type.startsWith(SANDBOX_PROBE_PREFIX));
  if (probes.some((e) => e.detail.startsWith('leaked'))) return 'leaked';
  if (probes.length >= 4 && probes.every((e) => e.detail.startsWith('blocked'))) return 'safe';
  return 'pending';
}

/** Short heading for each postMessage `type` in the debug UI */
export function previewEventTypeLabel(type: string): string {
  switch (type) {
    case 'iframe-onerror':
      return 'Runtime error';
    case 'iframe-error':
      return 'Error event';
    case 'iframe-rejection':
      return 'Unhandled rejection';
    case 'react-preview-boundary':
      return 'Preview UI error';
    case 'blocked-target':
      return 'Blocked target';
    case 'blocked-javascript-href':
      return 'Blocked javascript: URL';
    case 'blocked-protocol-relative':
      return 'Blocked // URL';
    case 'blocked-root-path':
      return 'Blocked root path';
    case 'blocked-relative-nav':
      return 'Blocked relative link';
    case 'opened-external-tab':
      return 'Opened in new tab';
    case 'open-failed':
      return 'Open URL failed';
    case 'blocked-form':
      return 'Form submit blocked';
    case 'blocked-hash-href':
      return 'Hash / empty fragment link';
    case 'workspace-load':
      return 'Workspace load';
    case 'workspace-save':
      return 'Workspace save';
    default:
      if (type.startsWith('sandbox-probe-')) return type.replace(SANDBOX_PROBE_PREFIX, 'Sandbox: ');
      return type || 'Event';
  }
}
