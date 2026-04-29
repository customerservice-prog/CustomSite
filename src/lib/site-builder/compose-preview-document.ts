import type { ProjectSite } from '@/lib/site-builder/project-site-model';

function escapeStyle(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style');
}

function escapeScript(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script');
}

/** Single-document preview for iframe srcDoc (linked CSS/JS do not resolve in srcDoc). */
export function composePreviewDocument(site: ProjectSite): string {
  const html = site.files.find((f) => f.name === 'index.html')?.content ?? '';
  const css = site.files.find((f) => f.name === 'styles.css')?.content ?? '';
  const js = site.files.find((f) => f.name === 'script.js')?.content ?? '';

  if (!html.trim()) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><p>Add index.html</p></body></html>`;
  }

  let out = html;
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

  return out;
}
