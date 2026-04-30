/** Fast insert paths for Site Builder speed mode (no modal). */

export const SPEED_SECTION_SNIPPET = `
<section class="speed-inserted" data-speed-section id="speed-section-latest" style="margin:0;padding:clamp(2.5rem,5vw,4rem) 1.5rem;background:linear-gradient(180deg,#fafafa,#f4f4f5);border-top:1px solid #e4e4e7">
  <div style="max-width:48rem;margin:0 auto">
    <h2 style="margin:0 0 0.75rem;font-size:clamp(1.35rem,2.5vw,1.75rem);letter-spacing:-0.02em;color:#18181b">New section</h2>
    <p style="margin:0 0 1.25rem;color:#52525b;line-height:1.65;font-size:0.95rem">Replace this placeholder with your copy — or ask Bryan the Brain to refine it.</p>
    <a href="#cta" style="display:inline-flex;align-items:center;border-radius:0.5rem;background:#7c3aed;color:#fff;font-weight:600;font-size:0.875rem;padding:0.55rem 1rem;text-decoration:none">Primary action</a>
  </div>
</section>`.trim();

/** Insert snippet before `</main>` if present, else before `</body>`. */
export function insertSectionIntoIndexHtml(html: string, snippet: string): string {
  const block = `\n${snippet}\n`;
  if (/<\/main>/i.test(html)) {
    return html.replace(/<\/main>/i, `${block}</main>`);
  }
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${block}</body>`);
  }
  return `${html}\n${snippet}`;
}

/** Duplicate the first `<section`…`</section>` after the last occurrence (best-effort). */
export function duplicateLastSection(html: string): string {
  const re = /<section\b[^>]*>[\s\S]*?<\/section>/gi;
  const matches = [...html.matchAll(re)];
  if (!matches.length) return html;
  const last = matches[matches.length - 1];
  const dup = last[0].replace(/\bid="[^"]*"/i, '');
  return html.slice(0, last.index! + last[0].length) + '\n' + dup + html.slice(last.index! + last[0].length);
}

/** Remove the block containing `data-speed-section` with id speed-section-latest, else last section. */
export function deleteLatestInsertedSection(html: string): string {
  const byId = /<section[^>]*id="speed-section-latest"[^>]*>[\s\S]*?<\/section>/i;
  if (byId.test(html)) return html.replace(byId, '\n');
  const re = /<section\b[^>]*>[\s\S]*?<\/section>/gi;
  const matches = [...html.matchAll(re)];
  if (!matches.length) return html;
  const last = matches[matches.length - 1];
  return html.slice(0, last.index!) + html.slice(last.index! + last[0].length);
}
