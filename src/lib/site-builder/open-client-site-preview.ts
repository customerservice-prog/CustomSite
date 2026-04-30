import { composePreviewDocument } from '@/lib/site-builder/compose-preview-document';
import type { ProjectSite } from '@/lib/site-builder/project-site-model';

/** Composed HTML for opening outside the admin iframe (no builder isolation script). */
export function buildStandalonePreviewHtml(site: ProjectSite, entryFile?: string): string {
  return composePreviewDocument(site, { isolate: false, entryFile });
}

/**
 * Opens the composed client site in a new browser tab (blob URL).
 * Multi-page navigation is limited to this single composed document unless you open other pages separately.
 */
export function openClientSitePreviewTab(
  site: ProjectSite,
  opts?: { entryFile?: string }
): Window | null {
  const html = buildStandalonePreviewHtml(site, opts?.entryFile);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    URL.revokeObjectURL(url);
    return null;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
  return w;
}
