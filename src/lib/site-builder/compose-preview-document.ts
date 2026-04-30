import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { PREVIEW_ISOLATION_SCRIPT } from '@/lib/site-builder/preview-isolation';

/** @param isolate When true (default), injects iframe harness for the admin builder. Set false for blob URL / new-tab preview. */
export type ComposePreviewOptions = {
  isolate?: boolean;
  /** HTML entry file (default `index.html`). */
  entryFile?: string;
};

function escapeStyle(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

function escapeScript(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script');
}

function injectBeforeCloseBody(html: string, inject: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${inject}\n</body>`);
  }
  return `${html}\n${inject}`;
}

/** RFC 6761 .invalid — so root-relative URLs never resolve against the admin app origin. */
const PREVIEW_BASE_HREF = 'https://preview.invalid/cs-site-preview/';

/**
 * Insert first <base href> inside <head> so path-absolute links (/foo) do not use the parent document
 * as fallback base (HTML: iframe srcdoc + opaque origin still uses container fallback base).
 */
function injectPreviewBaseHref(html: string): string {
  const tag = `<base href="${PREVIEW_BASE_HREF}" target="_self">`;
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, `<head$1>\n${tag}\n`);
  }
  if (/<html(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(\s[^>]*)?>/i, `<html$1>\n<head>\n${tag}\n</head>`);
  }
  return `<head>\n${tag}\n</head>\n${html}`;
}

/** Single-document preview for iframe srcDoc (linked CSS/JS do not resolve in srcDoc). */
export function composePreviewDocument(site: ProjectSite, options?: ComposePreviewOptions): string {
  const isolate = options?.isolate !== false;
  const entryFile = options?.entryFile ?? 'index.html';
  const html = site.files.find((f) => f.name === entryFile)?.content ?? '';
  const css = site.files.find((f) => f.name === 'styles.css')?.content ?? '';
  const js = site.files.find((f) => f.name === 'script.js')?.content ?? '';

  if (!html.trim()) {
    let stub = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><p>Add ${entryFile}</p></body></html>`;
    if (isolate) stub = injectPreviewBaseHref(stub);
    return isolate ? injectBeforeCloseBody(stub, PREVIEW_ISOLATION_SCRIPT) : stub;
  }

  let out = isolate ? injectPreviewBaseHref(html) : html;
  const linkRe = /<link\s+[^>]*href=["']styles\.css["'][^>]*\/?>/i;
  if (linkRe.test(out)) {
    out = out.replace(linkRe, `<style>\n${escapeStyle(css)}\n</style>`);
  } else if (css && /<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<style>\n${escapeStyle(css)}\n</style>\n</head>`);
  }

  const scriptRe = /<script\s+[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/i;
  if (scriptRe.test(out)) {
    out = out.replace(scriptRe, `<script>\n${escapeScript(js)}\n</script>`);
  } else if (js.trim() && /<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `<script>\n${escapeScript(js)}\n</script>\n</body>`);
  }

  return isolate ? injectBeforeCloseBody(out, PREVIEW_ISOLATION_SCRIPT) : out;
}
