/**
 * Build a single HTML document for iframe srcDoc preview when site files live in localStorage.
 * Linked styles.css / script.js do not resolve in srcDoc, so we inline them when referenced.
 */

import { localSiteGetFile } from '@/lib/site-builder/local-site-files-store';

function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

function escapeScriptContent(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script');
}

export function composeLocalPreviewSrcDoc(projectId: string, htmlPath: string): string | null {
  let html = localSiteGetFile(projectId, htmlPath);
  if (html == null || !String(html).trim()) return null;

  const css = localSiteGetFile(projectId, 'styles.css') ?? '';
  const scriptJs = localSiteGetFile(projectId, 'script.js');
  const appJs = localSiteGetFile(projectId, 'app.js');
  const js = (scriptJs ?? appJs ?? '').trim() ? (scriptJs ?? appJs ?? '') : '';

  let out = String(html);

  const linkedCss = /<link\s+[^>]*href=["']styles\.css["'][^>]*\/?>/i;
  if (linkedCss.test(out)) {
    out = out.replace(linkedCss, `<style>\n${escapeStyleContent(css)}\n</style>`);
  } else if (css.trim() && /<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `<style>\n${escapeStyleContent(css)}\n</style>\n</head>`);
  }

  const linkedScript =
    /<script\s+[^>]*src=["'](?:script\.js|app\.js)["'][^>]*>\s*<\/script>/i;
  if (linkedScript.test(out)) {
    out = out.replace(linkedScript, `<script>\n${escapeScriptContent(js)}\n</script>`);
  } else if (js.trim() && /<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `<script>\n${escapeScriptContent(js)}\n</script>\n</body>`);
  }

  return out;
}
