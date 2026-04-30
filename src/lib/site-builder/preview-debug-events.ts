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
    t === 'blocked-relative-nav'
  ) {
    return 'blocked';
  }
  return 'iframe';
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
    default:
      return type || 'Event';
  }
}
