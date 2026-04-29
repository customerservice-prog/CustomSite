import type { SiteArchetype } from '@/lib/site-builder/archetypes';

export type ParsedSection = { id: string; type: string; label: string; index: number };

export type CsPurpose = 'convert' | 'inform' | 'trust';
export type CsStage = 'top' | 'middle' | 'bottom';
export type CsVariant = 'minimal' | 'bold' | 'premium';

export function newSectionId(): string {
  return `cs_${Math.random().toString(36).slice(2, 11)}`;
}

const TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  trust: 'Trust',
  services: 'Products',
  bundles: 'Bundles & offers',
  comparison: 'Comparison',
  testimonials: 'Testimonials',
  cta: 'Call to action',
  footer: 'Footer',
  'hero-block': 'Hero',
  'hero-minimal': 'Hero (minimal)',
  'hero-bold': 'Hero (bold)',
  'hero-premium': 'Hero (premium)',
  'trust-bar': 'Trust bar',
  'trust-proof': 'Trust (proof row)',
  'product-grid': 'Product grid',
  'pricing-bundles': 'Pricing / bundles',
  'comparison-table': 'Comparison',
  'testimonial-cards': 'Testimonials',
  'cta-band': 'CTA block',
  faq: 'FAQ',
  problem: 'Problem',
  solution: 'Solution',
  proof: 'Proof',
  'service-detail': 'Service details',
  process: 'Process',
};

export function sectionLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type SectionMeta = { purpose: CsPurpose; stage: CsStage; variant?: CsVariant };

/** Tracked section with intent tags for guidance + future automation. */
export function wrapCsSection(
  type: string,
  innerHtml: string,
  id = newSectionId(),
  extraClass = '',
  meta?: SectionMeta
): string {
  const purpose = meta?.purpose ?? 'inform';
  const stage = meta?.stage ?? 'middle';
  const variant = meta?.variant ?? 'bold';
  const cls = ['cs-block', extraClass, `cs-var-${variant}`].filter(Boolean).join(' ');
  return `<section data-cs-section="${id}" data-cs-type="${type}" data-cs-purpose="${purpose}" data-cs-stage="${stage}" data-cs-variant="${variant}" class="${cls}">\n${innerHtml}\n</section>`;
}

export function parsePageSections(html: string): ParsedSection[] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = doc.body.querySelectorAll(':scope > [data-cs-section]');
    const out: ParsedSection[] = [];
    nodes.forEach((el, index) => {
      const id = el.getAttribute('data-cs-section') || '';
      const type = el.getAttribute('data-cs-type') || 'section';
      if (!id) return;
      out.push({ id, type, label: sectionLabel(type), index });
    });
    return out;
  } catch {
    return [];
  }
}

export function insertBeforeBodyClose(fullHtml: string, fragment: string): string {
  const lower = fullHtml.toLowerCase();
  const idx = lower.lastIndexOf('</body>');
  if (idx === -1) return `${fullHtml}\n${fragment}`;
  return fullHtml.slice(0, idx) + `\n${fragment}\n` + fullHtml.slice(idx);
}

export function reorderCsSections(fullHtml: string, fromIndex: number, toIndex: number): string {
  if (fromIndex === toIndex) return fullHtml;
  try {
    const doc = new DOMParser().parseFromString(fullHtml, 'text/html');
    const body = doc.body;
    const sections = [...body.children].filter((c) => c.hasAttribute('data-cs-section'));
    if (fromIndex < 0 || fromIndex >= sections.length || toIndex < 0 || toIndex >= sections.length) return fullHtml;
    const order = [...sections];
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    order.forEach((s) => s.remove());
    let ref: Element | null = [...body.children].find((c) => c.tagName === 'NAV') ?? null;
    for (const s of order) {
      if (ref) ref.insertAdjacentElement('afterend', s);
      else body.prepend(s);
      ref = s;
    }
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  } catch {
    return fullHtml;
  }
}

/** Remove the nth tracked section (0-based among `data-cs-section` direct body children). */
export function removeCsSection(fullHtml: string, index: number): string {
  try {
    const doc = new DOMParser().parseFromString(fullHtml, 'text/html');
    const body = doc.body;
    const sections = [...body.children].filter((c) => c.hasAttribute('data-cs-section'));
    if (index < 0 || index >= sections.length) return fullHtml;
    sections[index]!.remove();
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  } catch {
    return fullHtml;
  }
}

/**
 * Insert a full section HTML fragment after section `afterIndex` (0-based). Use -1 to insert before the first section (after nav if present).
 */
export function insertCsSectionAfter(fullHtml: string, afterIndex: number, fragmentHtml: string): string {
  try {
    const fragDoc = new DOMParser().parseFromString(
      `<!DOCTYPE html><html><body>${fragmentHtml}</body></html>`,
      'text/html'
    );
    const newNode = fragDoc.body.firstElementChild;
    if (!newNode) return insertBeforeBodyClose(fullHtml, fragmentHtml);

    const doc = new DOMParser().parseFromString(fullHtml, 'text/html');
    const body = doc.body;
    const sections = [...body.children].filter((c) => c.hasAttribute('data-cs-section'));
    const imported = doc.importNode(newNode, true);

    if (afterIndex < 0) {
      const nav = [...body.children].find((c) => c.tagName === 'NAV');
      if (nav) nav.insertAdjacentElement('afterend', imported as Element);
      else if (sections[0]) body.insertBefore(imported, sections[0]);
      else body.appendChild(imported);
    } else if (afterIndex >= sections.length - 1) {
      const last = sections[sections.length - 1];
      if (last) last.insertAdjacentElement('afterend', imported as Element);
      else return insertBeforeBodyClose(fullHtml, fragmentHtml);
    } else {
      sections[afterIndex]!.insertAdjacentElement('afterend', imported as Element);
    }
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  } catch {
    return insertBeforeBodyClose(fullHtml, fragmentHtml);
  }
}

/** Conversion copy tuned by archetype â€” every line pushes clarity or action. */
export function conversionVoice(a: SiteArchetype): {
  heroTitle: string;
  heroSub: string;
  primaryCta: string;
  secondaryCta: string;
  urgency: string;
  finalCta: string;
} {
  switch (a) {
    case 'ecommerce':
      return {
        heroTitle: 'Event furniture delivered fast, built to last.',
        heroSub:
          'Shop tables, chairs, tents, and bundles for events, venues, and rentals â€” clear stock, insured freight, crews that show up briefed.',
        primaryCta: 'Shop best sellers',
        secondaryCta: 'Get a bulk quote',
        urgency: 'Order before cutoff for next-week delivery slots.',
        finalCta: 'Checkout in under 2 minutes',
      };
    case 'landing':
      return {
        heroTitle: 'One offer. One deadline. One button.',
        heroSub:
          'Strip the noise: headline states the outcome, proof handles doubt, CTA tells them exactly what happens next.',
        primaryCta: 'Claim the offer',
        secondaryCta: 'See what you get',
        urgency: 'Spots are capped this month â€” when they are gone, this page closes.',
        finalCta: 'Lock in your spot',
      };
    case 'agency':
      return {
        heroTitle: 'Creative that ships on time and performs in market',
        heroSub:
          'You sell outcomes, not decks. This page proves process, shows the work, and asks for the next step without awkwardness.',
        primaryCta: 'Book a fit call',
        secondaryCta: 'View selected work',
        urgency: 'We onboard two new partners per quarter â€” next window opens soon.',
        finalCta: 'Start the brief',
      };
    default:
      return {
        heroTitle: 'Get more qualified leads from your website.',
        heroSub:
          'We rebuild unclear sites into focused conversion systems â€” clear offer above the fold, proof that kills doubt, and one obvious next step.',
        primaryCta: 'Request a quote',
        secondaryCta: 'See how it works',
        urgency: 'We return quotes within one business day â€” include scope so we can answer in one pass.',
        finalCta: 'Book a discovery call',
      };
  }
}

export const CS_STYLES = `<style id="cs-pro-structure">
:root { --cs-accent:#4f46e5; --cs-accent2:#6366f1; --cs-gold:#d4a853; --cs-muted:#64748b; --cs-card:#f8fafc; }
.cs-body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.55;background:#fff;}
.cs-nav{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid #e2e8f0;}
.cs-nav-inner{max-width:72rem;margin:0 auto;padding:.75rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
.cs-logo{font-weight:800;font-size:1rem;color:#0f172a;text-decoration:none;letter-spacing:-.02em;}
.cs-nav-links{display:flex;gap:1rem;flex-wrap:wrap;align-items:center;font-size:.8125rem;font-weight:600;}
.cs-nav-links a{color:#475569;text-decoration:none;}
.cs-nav-links a:hover{color:var(--cs-accent);}
.cs-btn{display:inline-block;padding:.7rem 1.35rem;background:var(--cs-accent);color:#fff;border-radius:.5rem;text-decoration:none;font-weight:700;font-size:.875rem;border:2px solid transparent;}
.cs-btn:hover{background:#4338ca;}
.cs-btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.55);}
.cs-btn-ghost:hover{background:rgba(255,255,255,.12);}
.cs-btn-darkbg{background:#fff;color:var(--cs-accent);}
.cs-muted{color:var(--cs-muted);}
.cs-block{padding:3rem 1.25rem;}
.cs-inner{max-width:72rem;margin:0 auto;}
.cs-var-minimal .cs-inner{padding-top:.5rem;padding-bottom:.5rem;}
.cs-var-minimal.cs-hero{padding:2.5rem 1.25rem;}
.cs-var-bold .cs-card{box-shadow:0 4px 24px -4px rgba(15,23,42,.08);}
.cs-var-premium.cs-hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 40%,#334155 100%);}
.cs-var-premium .cs-popular{outline:2px solid var(--cs-gold);}
.cs-hero{background:linear-gradient(145deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%);color:#fff;}
.cs-hero h1{font-size:clamp(1.85rem,4.2vw,2.85rem);line-height:1.12;margin:0 0 .85rem;font-weight:800;letter-spacing:-.03em;}
.cs-hero-lead{opacity:.94;max-width:38rem;margin:0 0 1.35rem;font-size:1.0625rem;}
.cs-hero-actions{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin-bottom:1.5rem;}
.cs-hero-visual{margin-top:.5rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.2);background:rgba(15,23,42,.25);aspect-ratio:16/9;max-width:36rem;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.75;}
.cs-trust{background:#f8fafc;border-block:1px solid #e2e8f0;}
.cs-trust-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;text-align:center;}
.cs-trust-stat{font-size:1.35rem;font-weight:800;color:#0f172a;}
.cs-trust-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-top:.25rem;}
.cs-trust-bullets{margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:.65rem 1.25rem;justify-content:center;font-size:.8125rem;font-weight:600;color:#334155;}
.cs-grid{display:grid;gap:1.15rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}
.cs-card{background:var(--cs-card);border:1px solid #e2e8f0;border-radius:.75rem;padding:1.35rem;display:flex;flex-direction:column;gap:.65rem;}
.cs-card h3{margin:0;font-size:1.05rem;font-weight:800;}
.cs-card .cs-price-hint{font-size:.8rem;font-weight:700;color:var(--cs-accent);}
.cs-card-footer{margin-top:auto;padding-top:.5rem;}
.cs-bundles{background:linear-gradient(180deg,#eef2ff 0%,#fff 100%);}
.cs-popular{position:relative;border-color:#c7d2fe!important;box-shadow:0 8px 30px -8px rgba(79,70,229,.25);}
.cs-popular-badge{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--cs-accent);color:#fff;font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:.2rem .55rem;border-radius:999px;}
.cs-compare table{width:100%;border-collapse:collapse;font-size:.8125rem;}
.cs-compare th,.cs-compare td{padding:.7rem .85rem;text-align:left;border-bottom:1px solid #e2e8f0;}
.cs-compare th{background:#f1f5f9;font-weight:800;}
.cs-compare .cs-win{font-weight:800;color:#15803d;}
.cs-compare .cs-lose{color:#94a3b8;}
.cs-quote{background:#fff;border-radius:.75rem;padding:1.25rem;border:1px solid #e2e8f0;font-size:.9rem;color:#334155;}
.cs-quote strong{display:block;margin-top:.65rem;font-style:normal;font-size:.78rem;font-weight:800;color:#0f172a;}
.cs-quote cite{display:block;margin-top:.2rem;font-style:normal;font-size:.72rem;color:#64748b;}
.cs-cta{background:linear-gradient(100deg,#4338ca,#6366f1);color:#fff;text-align:center;}
.cs-cta h2{margin:0 0 .4rem;font-size:clamp(1.35rem,3vw,1.85rem);font-weight:800;}
.cs-footer{background:#0f172a;color:#94a3b8;font-size:.8125rem;}
.cs-footer a{color:#e2e8f0;text-decoration:none;font-weight:600;}
.cs-footer a:hover{color:#fff;}
.cs-footer-grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));}
.cs-footer-trust{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-top:1rem;}
.cs-var-minimal.cs-hero{background:linear-gradient(180deg,#f8fafc,#fff);color:#0f172a;border-bottom:1px solid #e2e8f0;}
.cs-var-minimal.cs-hero h1,.cs-var-minimal.cs-hero h2{color:#0f172a;}
.cs-var-minimal.cs-hero .cs-hero-lead{color:#475569;}
.cs-var-minimal.cs-hero .cs-btn-ghost{color:#334155;border-color:#cbd5e1;}
.cs-var-minimal.cs-hero .cs-btn-ghost:hover{background:#f1f5f9;}
.cs-faq{background:#fff;}
.cs-faq details{border:1px solid #e2e8f0;border-radius:.65rem;padding:.85rem 1rem;margin-bottom:.65rem;background:#f8fafc;}
.cs-faq summary{cursor:pointer;font-weight:800;font-size:.88rem;color:#0f172a;}
.cs-faq p{margin:.5rem 0 0;font-size:.82rem;color:#475569;line-height:1.5;}
.cs-problem{background:linear-gradient(180deg,#fff7ed,#fff);}
.cs-process .cs-step{display:flex;gap:.75rem;margin-bottom:1rem;align-items:flex-start;}
.cs-process .cs-step-num{flex-shrink:0;width:1.75rem;height:1.75rem;border-radius:999px;background:var(--cs-accent);color:#fff;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;}
</style>`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function navHtml(siteTitle: string): string {
  return `<nav class="cs-nav"><div class="cs-nav-inner"><a class="cs-logo" href="#">${escapeHtml(siteTitle)}</a><div class="cs-nav-links"><a href="#trust">Proof</a><a href="#services">What we offer</a><a href="#bundles">Packages</a><a href="#compare">Why us</a><a href="#stories">Results</a><a class="cs-btn cs-btn-darkbg" href="#cta">Get started</a></div></div></nav>`;
}
