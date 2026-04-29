import type { SiteSection } from '@/lib/site-production/types';

const layoutMax: Record<SiteSection['layout'], string> = {
  full: '720px',
  narrow: '480px',
  split: '640px',
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Minimal visual page for iframe srcDoc — not full marketing export, production-oriented preview. */
export function compileSectionsToPreviewHtml(
  sections: SiteSection[],
  opts: { pageTitle: string; viewport: 'desktop' | 'tablet' | 'mobile' }
) {
  const sorted = [...sections].filter((s) => s.visible).sort((a, b) => a.order - b.order);
  const outerMax = opts.viewport === 'mobile' ? '390px' : opts.viewport === 'tablet' ? '768px' : '100%';
  const blocks = sorted
    .map((s) => {
      const max = layoutMax[s.layout];
      const inner = `
      <section style="margin:0 auto 1.75rem;max-width:${max};padding:0 1rem;">
        ${s.kind === 'hero' ? `<h1 style="margin:0 0 0.75rem;font-size:${opts.viewport === 'mobile' ? '1.35rem' : opts.viewport === 'tablet' ? '1.5rem' : '1.75rem'};line-height:1.2;color:#0f172a;">${esc(s.headline)}</h1>` : ''}
        ${s.kind === 'proof' ? `<h2 style="margin:0 0 0.5rem;font-size:1rem;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${esc(s.headline)}</h2>` : ''}
        ${s.kind === 'cta' ? `<h2 style="margin:0 0 0.75rem;font-size:1.35rem;color:#0f172a;">${esc(s.headline)}</h2>` : ''}
        ${s.kind === 'text' ? `<h2 style="margin:0 0 0.5rem;font-size:1.15rem;color:#0f172a;">${esc(s.headline)}</h2>` : ''}
        <p style="margin:0 0 1rem;line-height:1.55;color:#334155;font-size:${opts.viewport === 'mobile' ? '0.9rem' : opts.viewport === 'tablet' ? '0.92rem' : '0.95rem'};">${esc(s.body)}</p>
        ${
          s.ctaLabel.trim()
            ? `<a href="${esc(s.ctaUrl || '#')}" style="display:inline-block;padding:0.55rem 1rem;background:#6d28d9;color:#fff;border-radius:8px;font-weight:600;font-size:0.875rem;text-decoration:none;">${esc(s.ctaLabel)}</a>`
            : ''
        }
      </section>`;
      return inner;
    })
    .join('\n');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(opts.pageTitle)} — preview</title></head>
<body style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;">
  <div style="max-width:${outerMax};margin:0 auto;padding:1.25rem 0 2rem;">
    <header style="padding:0 1rem 1rem;border-bottom:1px solid #e2e8f0;margin-bottom:1.25rem;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Draft preview · ${opts.viewport}</p>
      <p style="margin:0.25rem 0 0;font-size:0.8rem;color:#64748b;">Not the full static export — section-driven layout check.</p>
    </header>
    ${blocks || '<p style="padding:1rem;color:#64748b;">No visible sections — turn one on or add copy.</p>'}
  </div>
</body></html>`;
}
