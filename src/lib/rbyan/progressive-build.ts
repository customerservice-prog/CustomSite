import type { RbyanGeneratedFile } from '@/lib/rbyan/types';

export const COLLAB_BUILD_STEP_LABELS = [
  'Setting up site structure…',
  'Creating page shell + navigation…',
  'Layering main sections…',
  'Applying design system to styles…',
  'Finalizing scripts & polish…',
] as const;

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Cumulative HTML for live preview: header + `<main>` with an increasing number of
 * `<section>` nodes; footer + scripts only when `includeFooter`.
 */
export function sliceIndexHtmlForProgress(fullHtml: string, sectionCount: number, includeFooter: boolean): string {
  const doc = fullHtml.match(/^([\s\S]*?<body[^>]*>)([\s\S]*)(<\/body>[\s\S]*)$/i);
  if (!doc) return fullHtml;
  const bodyOpen = doc[1];
  const bodyInner = doc[2];
  const bodyTail = doc[3];

  const mainM = bodyInner.match(/^([\s\S]*?<main[^>]*>)([\s\S]*?)(<\/main>[\s\S]*)$/i);
  if (!mainM) {
    const chunks = bodyInner.split(/(?=<(?:header|section|footer)\b)/i);
    const n = Math.max(1, Math.min(chunks.length, sectionCount + 1));
    const inner = chunks.slice(0, n).join('');
    if (includeFooter) return bodyOpen + inner + bodyTail;
    return `${bodyOpen}${inner}<div class="rby-build-banner" style="margin:0;padding:1.25rem 1.5rem;font-family:system-ui,sans-serif;font-size:0.8rem;color:#71717a;border-top:1px solid rgba(0,0,0,0.08)">Rbyan is building your site…</div></body></html>`;
  }

  const beforeMainInner = mainM[1];
  const mainInner = mainM[2];
  const afterMain = mainM[3];

  const bits = mainInner.split(/(?=<section\b)/i);
  const prefix = bits[0] ?? '';
  const sections = bits.slice(1);
  const take = Math.min(sections.length, Math.max(0, sectionCount));
  const inner = prefix + sections.slice(0, take).join('');

  if (includeFooter) {
    return bodyOpen + beforeMainInner + inner + afterMain + bodyTail;
  }

  const banner =
    '<div class="rby-build-banner" style="margin:0;padding:1.25rem 1.5rem;font-family:system-ui,sans-serif;font-size:0.8rem;color:#71717a;border-top:1px solid rgba(0,0,0,0.08)">Rbyan is building your site…</div>';
  return `${bodyOpen}${beforeMainInner}${inner}</main>${banner}</body></html>`;
}

export function getProgressivePreviewFiles(
  finalFiles: RbyanGeneratedFile[],
  stepIndex: /** 1..totalSteps */ number,
  totalSteps: number
): RbyanGeneratedFile[] {
  const ix = finalFiles.find((f) => f.name === 'index.html');
  const css = finalFiles.find((f) => f.name === 'styles.css');
  const js = finalFiles.find((f) => f.name === 'script.js');
  if (!ix || !css || !js) return finalFiles;

  const maxSections = (ix.content.match(/<section\b/gi) ?? []).length || 1;
  const n = Math.max(1, Math.ceil((maxSections * stepIndex) / totalSteps));
  const includeFooter = stepIndex >= totalSteps;
  const html = sliceIndexHtmlForProgress(ix.content, n, includeFooter);

  const cssThreshold = Math.ceil(totalSteps * 0.55);
  const useCss = stepIndex >= cssThreshold ? css.content : `/* Rbyan: styles loading… */\n${css.content}`;

  const useJs =
    stepIndex >= totalSteps
      ? js.content
      : `/* Step ${stepIndex}: ${COLLAB_BUILD_STEP_LABELS[Math.min(stepIndex - 1, COLLAB_BUILD_STEP_LABELS.length - 1)]} */\n`;

  return [
    { name: 'index.html', type: 'html', content: html },
    { name: 'styles.css', type: 'css', content: useCss },
    { name: 'script.js', type: 'js', content: useJs },
  ];
}
