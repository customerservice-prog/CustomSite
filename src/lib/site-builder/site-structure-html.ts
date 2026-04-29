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
  services: 'Products & services',
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

/** Conversion copy tuned by archetype — every line pushes clarity or action. */
function conversionVoice(a: SiteArchetype): {
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
        heroTitle: 'Ship-ready bundles your customers feel good buying',
        heroSub:
          'Clear tiers, honest delivery dates, and one-tap checkout — fewer abandoned carts, more repeat orders.',
        primaryCta: 'Shop best sellers',
        secondaryCta: 'See delivery zones',
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
        urgency: 'Spots are capped this month — when they are gone, this page closes.',
        finalCta: 'Lock in your spot',
      };
    case 'agency':
      return {
        heroTitle: 'Creative that ships on time and performs in market',
        heroSub:
          'You sell outcomes, not decks. This page proves process, shows the work, and asks for the next step without awkwardness.',
        primaryCta: 'Book a fit call',
        secondaryCta: 'View selected work',
        urgency: 'We onboard two new partners per quarter — next window opens soon.',
        finalCta: 'Start the brief',
      };
    default:
      return {
        heroTitle: 'High-quality event furniture delivered on your timeline',
        heroSub:
          'Clients choose you when risk drops: fast quotes, insured delivery, and crews who show up ready — say that above the fold.',
        primaryCta: 'Get a quote in 24h',
        secondaryCta: 'See packages',
        urgency: 'Most venues book setup slots 48 hours out — hold yours now.',
        finalCta: 'Book setup',
      };
  }
}

const CS_STYLES = `<style id="cs-pro-structure">
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
</style>`;

function navHtml(siteTitle: string): string {
  return `<nav class="cs-nav"><div class="cs-nav-inner"><a class="cs-logo" href="#">${escapeHtml(siteTitle)}</a><div class="cs-nav-links"><a href="#trust">Proof</a><a href="#services">What we offer</a><a href="#bundles">Packages</a><a href="#compare">Why us</a><a href="#stories">Results</a><a class="cs-btn cs-btn-darkbg" href="#cta">Get started</a></div></div></nav>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildFullSiteIndexHtml(archetype: SiteArchetype, ctx: { siteTitle: string; clientCompany?: string }): string {
  const v = conversionVoice(archetype);
  const brand = escapeHtml(ctx.siteTitle);
  const co = ctx.clientCompany ? escapeHtml(ctx.clientCompany) : 'your team';

  const hero = wrapCsSection(
    'hero',
    `<div class="cs-inner">
      <h1>${escapeHtml(v.heroTitle)}</h1>
      <p class="cs-hero-lead">${escapeHtml(v.heroSub)} Built for ${co} — swap details, keep the promise.</p>
      <div class="cs-hero-actions">
        <a class="cs-btn" href="#cta">${escapeHtml(v.primaryCta)}</a>
        <a class="cs-btn cs-btn-ghost" href="#bundles">${escapeHtml(v.secondaryCta)}</a>
      </div>
      <div class="cs-hero-visual" role="img" aria-label="Product or service preview placeholder">Drop hero image / mockup here</div>
    </div>`,
    newSectionId(),
    'cs-hero',
    { purpose: 'convert', stage: 'top', variant: 'bold' }
  );

  const trust = wrapCsSection(
    'trust',
    `<div class="cs-inner" id="trust">
      <div class="cs-trust-grid">
        <div><div class="cs-trust-stat">5,000+</div><div class="cs-trust-label">events &amp; installs served</div></div>
        <div><div class="cs-trust-stat">48h</div><div class="cs-trust-label">typical quote turnaround</div></div>
        <div><div class="cs-trust-stat">10 yr</div><div class="cs-trust-label">durability-backed guarantee*</div></div>
        <div><div class="cs-trust-stat">4.9★</div><div class="cs-trust-label">avg. post-event rating</div></div>
      </div>
      <div class="cs-trust-bullets">
        <span>Insured delivery</span><span>·</span><span>Dedicated setup crew</span><span>·</span><span>No surprise fees on scope</span>
      </div>
      <p class="cs-muted" style="margin:1rem 0 0;text-align:center;font-size:.72rem;">*Edit guarantee language to match what you can legally stand behind.</p>
    </div>`,
    newSectionId(),
    'cs-trust',
    { purpose: 'trust', stage: 'top', variant: 'minimal' }
  );

  const services = wrapCsSection(
    'services',
    `<div class="cs-inner" id="services">
      <h2 style="margin:0 0 .35rem;font-size:1.4rem;font-weight:800;">Pick the line that fits the job</h2>
      <p class="cs-muted" style="margin:0 0 1.25rem;max-width:40rem;">Short labels + price hints reduce “how much?” friction. One CTA per card.</p>
      <div class="cs-grid">
        <div class="cs-card">
          <h3>Essentials line</h3>
          <p class="cs-muted" style="margin:0;font-size:.88rem;">Seating, tables, basics — in stock, fast turnaround.</p>
          <p class="cs-price-hint">From $899 / event</p>
          <div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.8rem;padding:.5rem 1rem;">Configure</a></div>
        </div>
        <div class="cs-card">
          <h3>Premium staging</h3>
          <p class="cs-muted" style="margin:0;font-size:.88rem;">Statement pieces + lighting — for launches &amp; galas.</p>
          <p class="cs-price-hint">From $2.4k / event</p>
          <div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.8rem;padding:.5rem 1rem;">See mood boards</a></div>
        </div>
        <div class="cs-card">
          <h3>Full-service</h3>
          <p class="cs-muted" style="margin:0;font-size:.88rem;">Design → delivery → strike — one invoice, one team.</p>
          <p class="cs-price-hint">Custom quote</p>
          <div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.8rem;padding:.5rem 1rem;">Book walkthrough</a></div>
        </div>
      </div>
    </div>`,
    newSectionId(),
    '',
    { purpose: 'convert', stage: 'middle', variant: 'bold' }
  );

  const bundles = wrapCsSection(
    'bundles',
    `<div class="cs-inner cs-bundles" id="bundles" style="border-radius:1rem;padding:2rem 1rem;">
      <h2 style="margin:0 0 .35rem;font-size:1.4rem;font-weight:800;">Packages buyers compare in seconds</h2>
      <p class="cs-muted" style="margin:0 0 1.25rem;max-width:42rem;">Make differences obvious: what ships, what support, what speed. Highlight the middle tier most people pick.</p>
      <div class="cs-grid" style="align-items:stretch;">
        <div class="cs-card"><h3>Starter</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">Core inventory · email support · 5-day lead time</p><p class="cs-price-hint">$X / mo</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.78rem;padding:.45rem .9rem;background:#64748b;">Choose Starter</a></div></div>
        <div class="cs-card cs-popular"><span class="cs-popular-badge">Most chosen</span><h3>Pro</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">Priority routing · phone support · 48h rush option</p><p class="cs-price-hint">$Y / mo</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.78rem;padding:.45rem .9rem;">Choose Pro</a></div></div>
        <div class="cs-card"><h3>Premium</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">On-site supervisor · custom SKUs · SLA-backed windows</p><p class="cs-price-hint">$Z / mo</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.78rem;padding:.45rem .9rem;background:#0f172a;">Talk to sales</a></div></div>
      </div>
    </div>`,
    newSectionId(),
    '',
    { purpose: 'convert', stage: 'middle', variant: 'bold' }
  );

  const comparison = wrapCsSection(
    'comparison',
    `<div class="cs-inner cs-compare" id="compare">
      <h2 style="margin:0 0 .75rem;font-size:1.4rem;font-weight:800;">Why teams switch to us — not “another vendor”</h2>
      <table>
        <thead><tr><th>Decision factor</th><th class="cs-win">You (${brand})</th><th class="cs-lose">Typical alternative</th></tr></thead>
        <tbody>
          <tr><td>Price clarity upfront</td><td class="cs-win">Line-item quote in 24h</td><td class="cs-lose">Ballpark → surprises</td></tr>
          <tr><td>Delivery speed</td><td class="cs-win">Named arrival window</td><td class="cs-lose">“Sometime Friday”</td></tr>
          <tr><td>Quality / condition</td><td class="cs-win">Photo-checked pack list</td><td class="cs-lose">Mixed batches</td></tr>
          <tr><td>Guarantee in writing</td><td class="cs-win">Backed terms you can show legal</td><td class="cs-lose">Handshake policies</td></tr>
          <tr><td>Support when it breaks</td><td class="cs-win">Single hotline + backup crew</td><td class="cs-lose">Ticket queues</td></tr>
        </tbody>
      </table>
    </div>`,
    newSectionId(),
    '',
    { purpose: 'convert', stage: 'middle', variant: 'minimal' }
  );

  const testimonials = wrapCsSection(
    'testimonials',
    `<div class="cs-inner" id="stories">
      <h2 style="margin:0 0 .75rem;font-size:1.4rem;font-weight:800;">Results, not adjectives</h2>
      <div class="cs-grid">
        <blockquote class="cs-quote">“They cut our venue setup from 6 hours to under 2 — same headcount. We rebooked for three more seasons.”<strong>Jordan M. · Director of Ops, Northwind Events</strong><cite>200+ guest corporate summit · Chicago</cite></blockquote>
        <blockquote class="cs-quote">“First quote matched the final invoice. That alone saved us a board conversation.”<strong>Alex R. · Procurement, Harborline Hospitality</strong><cite>Multi-city product tour</cite></blockquote>
      </div>
    </div>`,
    newSectionId(),
    '',
    { purpose: 'trust', stage: 'middle', variant: 'bold' }
  );

  const cta = wrapCsSection(
    'cta',
    `<div class="cs-inner" id="cta">
      <h2>Get your setup sorted in 48 hours</h2>
      <p style="opacity:.95;margin:0 0 .35rem;font-weight:600;">${escapeHtml(v.urgency)}</p>
      <p style="opacity:.88;margin:0 0 1.25rem;font-size:.9rem;">Tell us date, headcount, and venue — we reply with what ships and what it costs.</p>
      <a class="cs-btn cs-btn-darkbg" href="#">${escapeHtml(v.finalCta)}</a>
    </div>`,
    newSectionId(),
    'cs-cta',
    { purpose: 'convert', stage: 'bottom', variant: 'bold' }
  );

  const footer = wrapCsSection(
    'footer',
    `<div class="cs-inner">
      <div class="cs-footer-grid">
        <div><div style="font-weight:800;color:#f8fafc;margin-bottom:.5rem;">${brand}</div><div class="cs-footer-trust">Licensed · Insured · References on request</div></div>
        <div><div style="font-weight:700;color:#cbd5e1;margin-bottom:.35rem;">Navigate</div><a href="#services">Offers</a> · <a href="#bundles">Packages</a> · <a href="#compare">Compare</a> · <a href="#cta">Book</a></div>
        <div><div style="font-weight:700;color:#cbd5e1;margin-bottom:.35rem;">Contact</div><span>hello@yourcompany.com</span><br /><span>(555) 010‑0199</span></div>
      </div>
    </div>`,
    newSectionId(),
    'cs-footer',
    { purpose: 'inform', stage: 'bottom', variant: 'minimal' }
  );

  const body = `<body class="cs-body">
${navHtml(ctx.siteTitle)}
${hero}
${trust}
${services}
${bundles}
${comparison}
${testimonials}
${cta}
${footer}
</body>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
  ${CS_STYLES}
</head>
${body}
</html>`;
}

export function buildInteriorSitePageHtml(archetype: SiteArchetype, pageTitle: string, siteTitle: string): string {
  const v = conversionVoice(archetype);
  const t = escapeHtml(pageTitle);
  const b = escapeHtml(siteTitle);

  const hero = wrapCsSection(
    'hero',
    `<div class="cs-inner" style="padding:1.5rem 0 1rem;">
      <p class="cs-muted" style="margin:0 0 .35rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;">${b}</p>
      <h1 style="margin:0 0 .65rem;font-size:clamp(1.45rem,3vw,2rem);font-weight:800;line-height:1.15;">${t}</h1>
      <p class="cs-muted" style="margin:0 0 1rem;max-width:36rem;">State the outcome in one line — then prove it below. If this page does not move someone toward a quote, cut copy until it does.</p>
      <div class="cs-hero-actions" style="margin-bottom:0;">
        <a class="cs-btn" href="index.html#cta">${escapeHtml(v.primaryCta)}</a>
        <a class="cs-btn cs-btn-ghost" href="#proof" style="border-color:#e2e8f0;color:#475569;">See proof</a>
      </div>
    </div>`,
    newSectionId(),
    'cs-hero',
    { purpose: 'convert', stage: 'top', variant: 'minimal' }
  );

  const proof = wrapCsSection(
    'trust',
    `<div class="cs-inner" id="proof" style="padding-top:1rem;padding-bottom:1rem;">
      <div class="cs-trust-bullets" style="justify-content:flex-start;">
        <span>Named project owner</span><span>·</span><span>Written SLA</span><span>·</span><span>Reference call on request</span>
      </div>
    </div>`,
    newSectionId(),
    'cs-trust',
    { purpose: 'trust', stage: 'top', variant: 'minimal' }
  );

  const main = wrapCsSection(
    'services',
    `<div class="cs-inner">
      <div class="cs-card" style="max-width:44rem;">
        <h3 style="margin:0 0 .5rem;font-size:1.1rem;font-weight:800;">What to put on this page</h3>
        <ul class="cs-muted" style="margin:0;padding-left:1.1rem;font-size:.88rem;">
          <li>Who it is for + what they get in week one</li>
          <li>Objections → one-line rebuttals (noise, budget, timing)</li>
          <li>One primary CTA repeated at the bottom</li>
        </ul>
        <p class="cs-price-hint" style="margin-top:1rem;">Swap this card for packages, bios, FAQs, or a fee table.</p>
      </div>
    </div>`,
    newSectionId(),
    '',
    { purpose: 'inform', stage: 'middle', variant: 'minimal' }
  );

  const cta = wrapCsSection(
    'cta',
    `<div class="cs-inner cs-cta" style="border-radius:.75rem;padding:2rem 1.25rem;">
      <h2 style="margin:0 0 .35rem;font-size:1.25rem;font-weight:800;">${escapeHtml(v.urgency)}</h2>
      <p style="opacity:.9;margin:0 0 1rem;font-size:.88rem;">Same-day reply on business days — include venue + date.</p>
      <a class="cs-btn cs-btn-darkbg" href="index.html#cta">${escapeHtml(v.finalCta)}</a>
    </div>`,
    newSectionId(),
    'cs-cta',
    { purpose: 'convert', stage: 'bottom', variant: 'bold' }
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t} · ${b}</title>
  ${CS_STYLES}
</head>
<body class="cs-body" style="padding:0 1rem 2.5rem;">
${hero}
${proof}
${main}
${cta}
</body>
</html>`;
}

export type SectionLibraryItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  buildInner: () => string;
  purpose: CsPurpose;
  stage: CsStage;
  variant: CsVariant;
  /** Optional extra section class (e.g. cs-hero) */
  sectionClass?: string;
};

export const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    id: 'lib-hero-minimal',
    title: 'Hero — minimal',
    description: 'Tight copy, single CTA — when traffic is warm.',
    type: 'hero-minimal',
    purpose: 'convert',
    stage: 'top',
    variant: 'minimal',
    sectionClass: 'cs-hero',
    buildInner: () =>
      `<div class="cs-inner" style="padding:2rem 0;color:#0f172a;">
        <h2 style="margin:0 0 .5rem;font-size:1.65rem;font-weight:800;">Cut 30% off setup time this season</h2>
        <p class="cs-muted" style="margin:0 0 1rem;max-width:32rem;">Fewer trucks, tighter windows, one coordinator — say the mechanism, not the slogan.</p>
        <a class="cs-btn" href="#cta">Get the plan</a>
      </div>`,
  },
  {
    id: 'lib-hero-bold',
    title: 'Hero — bold',
    description: 'Dual CTA + visual slot — default high-conversion layout.',
    type: 'hero-bold',
    purpose: 'convert',
    stage: 'top',
    variant: 'bold',
    sectionClass: 'cs-hero',
    buildInner: () =>
      `<div class="cs-inner">
        <h2 style="margin:0 0 .5rem;font-size:1.85rem;font-weight:800;">Win the weekend — furniture that shows up ready</h2>
        <p class="cs-hero-lead">Quote in 24h · insured freight · crew briefed on your floor plan.</p>
        <div class="cs-hero-actions">
          <a class="cs-btn" href="#cta">Hold my date</a>
          <a class="cs-btn cs-btn-ghost" href="#bundles">Compare packages</a>
        </div>
        <div class="cs-hero-visual">Hero visual</div>
      </div>`,
  },
  {
    id: 'lib-hero-premium',
    title: 'Hero — premium',
    description: 'Dark, high-trust — for upmarket / B2B premium.',
    type: 'hero-premium',
    purpose: 'convert',
    stage: 'top',
    variant: 'premium',
    sectionClass: 'cs-hero',
    buildInner: () =>
      `<div class="cs-inner">
        <h2 style="margin:0 0 .5rem;font-size:1.9rem;font-weight:800;">White-glove installs for venues that cannot miss</h2>
        <p class="cs-hero-lead">Dedicated producer · contingency stock on truck · post-event strike included.</p>
        <div class="cs-hero-actions"><a class="cs-btn" href="#cta">Request executive brief</a></div>
      </div>`,
  },
  {
    id: 'lib-trust-minimal',
    title: 'Trust — compact stats',
    description: 'Numbers that kill doubt — delivery, volume, guarantee.',
    type: 'trust-bar',
    purpose: 'trust',
    stage: 'top',
    variant: 'minimal',
    sectionClass: 'cs-trust',
    buildInner: () =>
      `<div class="cs-inner"><div class="cs-trust-grid">
        <div><div class="cs-trust-stat">5k+</div><div class="cs-trust-label">events</div></div>
        <div><div class="cs-trust-stat">48h</div><div class="cs-trust-label">quotes</div></div>
        <div><div class="cs-trust-stat">10 yr</div><div class="cs-trust-label">guarantee</div></div>
      </div></div>`,
  },
  {
    id: 'lib-trust-bold',
    title: 'Trust — proof strip',
    description: 'Guarantee + delivery + warranty in one scannable row.',
    type: 'trust-proof',
    purpose: 'trust',
    stage: 'top',
    variant: 'bold',
    sectionClass: 'cs-trust',
    buildInner: () =>
      `<div class="cs-inner">
        <div class="cs-trust-bullets" style="justify-content:center;font-size:.85rem;">
          <span>Insured to the door</span><span>·</span><span>10-year durability backing</span><span>·</span><span>5,000+ events without a no-show crew</span>
        </div>
      </div>`,
  },
  {
    id: 'lib-products',
    title: 'Services — decision cards',
    description: 'Categories + price hints + CTA each — reduce friction.',
    type: 'product-grid',
    purpose: 'convert',
    stage: 'middle',
    variant: 'bold',
    buildInner: () =>
      `<div class="cs-inner"><h3 style="margin:0 0 1rem;font-size:1.2rem;font-weight:800;">Choose a lane</h3><div class="cs-grid">
        <div class="cs-card"><h3>Rush line</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">In-stock SKUs · 72h deploy</p><p class="cs-price-hint">From $1.2k</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.75rem;padding:.45rem .85rem;">Check dates</a></div></div>
        <div class="cs-card"><h3>Catalog line</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">Full lookbooks · 2-week lead</p><p class="cs-price-hint">From $2.8k</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.75rem;padding:.45rem .85rem;">Build a cart</a></div></div>
        <div class="cs-card"><h3>Custom build</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">Bespoke sets · design call</p><p class="cs-price-hint">Custom</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.75rem;padding:.45rem .85rem;">Book design</a></div></div>
      </div></div>`,
  },
  {
    id: 'lib-bundles',
    title: 'Bundles — 3 tiers + “most chosen”',
    description: 'Clear deltas + highlighted middle tier.',
    type: 'pricing-bundles',
    purpose: 'convert',
    stage: 'middle',
    variant: 'bold',
    buildInner: () =>
      `<div class="cs-inner cs-bundles" style="border-radius:1rem;padding:1.75rem 1rem;"><h3 style="margin:0 0 1rem;font-weight:800;">Pick the bundle that matches risk</h3><div class="cs-grid">
        <div class="cs-card"><h3>Starter</h3><p class="cs-muted" style="margin:0;font-size:.8rem;">Self-assembly guide · email support</p><p class="cs-price-hint">$X</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.72rem;background:#64748b;">Select</a></div></div>
        <div class="cs-card cs-popular"><span class="cs-popular-badge">Most chosen</span><h3>Pro</h3><p class="cs-muted" style="margin:0;font-size:.8rem;">Crew on-site · backup stock</p><p class="cs-price-hint">$Y</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.72rem;">Select Pro</a></div></div>
        <div class="cs-card"><h3>Premium</h3><p class="cs-muted" style="margin:0;font-size:.8rem;">Producer + SLA window</p><p class="cs-price-hint">$Z</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.72rem;background:#0f172a;">Talk to us</a></div></div>
      </div></div>`,
  },
  {
    id: 'lib-compare',
    title: 'Comparison — you vs others',
    description: 'Eliminate alternatives on speed, clarity, guarantee, support.',
    type: 'comparison-table',
    purpose: 'convert',
    stage: 'middle',
    variant: 'minimal',
    buildInner: () =>
      `<div class="cs-inner cs-compare"><table><thead><tr><th>Factor</th><th class="cs-win">You</th><th class="cs-lose">Others</th></tr></thead><tbody>
        <tr><td>Price clarity</td><td class="cs-win">Itemized in one business day</td><td class="cs-lose">Ranges that creep</td></tr>
        <tr><td>Delivery speed</td><td class="cs-win">Named crew + window</td><td class="cs-lose">“Driver will call”</td></tr>
        <tr><td>Guarantee</td><td class="cs-win">In the contract</td><td class="cs-lose">Verbal only</td></tr>
        <tr><td>Support</td><td class="cs-win">Direct line</td><td class="cs-lose">Portal roulette</td></tr>
      </tbody></table></div>`,
  },
  {
    id: 'lib-testimonials',
    title: 'Testimonials — result + context',
    description: 'Quote + role + specific outcome (template).',
    type: 'testimonial-cards',
    purpose: 'trust',
    stage: 'middle',
    variant: 'bold',
    buildInner: () =>
      `<div class="cs-inner"><div class="cs-grid">
        <blockquote class="cs-quote">“Saved us 4 hours on load-in — same footprint as last year.”<strong>Casey L. · Ops Lead, Riverfront Convention</strong><cite>1,200 attendees · two-day show</cite></blockquote>
        <blockquote class="cs-quote">“We stopped getting ‘what will this cost?’ emails after we sent them this breakdown.”<strong>Morgan P. · Marketing, Alloy Retail</strong><cite>Nationwide pop-up tour</cite></blockquote>
      </div></div>`,
  },
  {
    id: 'lib-cta-minimal',
    title: 'CTA — minimal strip',
    description: 'Urgency line + one button.',
    type: 'cta-band',
    purpose: 'convert',
    stage: 'bottom',
    variant: 'minimal',
    sectionClass: 'cs-cta',
    buildInner: () =>
      `<div class="cs-inner" style="text-align:center;padding:1.5rem 0;">
        <p style="margin:0 0 .75rem;font-weight:700;color:#0f172a;">Slots for next Friday are 60% full.</p>
        <a class="cs-btn" href="#">Hold my slot</a>
      </div>`,
  },
  {
    id: 'lib-cta-bold',
    title: 'CTA — bold close',
    description: 'Urgency + subcopy + strong button.',
    type: 'cta-band',
    purpose: 'convert',
    stage: 'bottom',
    variant: 'bold',
    sectionClass: 'cs-cta',
    buildInner: () =>
      `<div class="cs-inner">
        <h3 style="margin:0 0 .35rem;font-size:1.35rem;font-weight:800;">Lock delivery before the calendar fills</h3>
        <p style="opacity:.92;margin:0 0 1rem;font-size:.9rem;">Reply with date + headcount — we send what ships, what it costs, and what happens next.</p>
        <a class="cs-btn cs-btn-darkbg" href="#">Get the quote</a>
      </div>`,
  },
];

export function buildLibrarySectionHtml(item: SectionLibraryItem): string {
  return wrapCsSection(item.type, item.buildInner(), newSectionId(), item.sectionClass ?? '', {
    purpose: item.purpose,
    stage: item.stage,
    variant: item.variant,
  });
}
