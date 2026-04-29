import type { SiteArchetype } from '@/lib/site-builder/archetypes';
import {
  conversionVoice,
  escapeHtml,
  newSectionId,
  wrapCsSection,
  type CsPurpose,
  type CsStage,
  type CsVariant,
} from '@/lib/site-builder/site-structure-html';

export type SectionBuildContext = {
  siteTitle: string;
  clientCompany?: string;
  /** Interior pages only */
  pageTitle?: string;
};

export type SectionLibraryCategory =
  | 'hero'
  | 'trust'
  | 'offers'
  | 'proof'
  | 'compare'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'story';

/** Row for builder UI + insert flow */
export type SectionTemplateRow = {
  templateId: string;
  libraryTitle: string;
  name: string;
  category: SectionLibraryCategory;
  purposeLabel: string;
  previewText: string;
  description: string;
  /** Codemirror / parse tags */
  type: string;
  purpose: CsPurpose;
  stage: CsStage;
  variant: CsVariant;
  sectionClass?: string;
};

function v(a: SiteArchetype) {
  return conversionVoice(a);
}

function brand(ctx: SectionBuildContext) {
  return escapeHtml(ctx.siteTitle);
}

const builders: Record<string, (a: SiteArchetype, ctx: SectionBuildContext) => string> = {
  'hero-main'(a, ctx) {
    const voice = v(a);
    const co = ctx.clientCompany ? escapeHtml(ctx.clientCompany) : 'your team';
    return wrapCsSection(
      'hero',
      `<div class="cs-inner">
      <h1>${escapeHtml(voice.heroTitle)}</h1>
      <p class="cs-hero-lead">${escapeHtml(voice.heroSub)} Built for ${co} — swap details, keep the promise.</p>
      <div class="cs-hero-actions">
        <a class="cs-btn" href="#cta">${escapeHtml(voice.primaryCta)}</a>
        <a class="cs-btn cs-btn-ghost" href="#bundles">${escapeHtml(voice.secondaryCta)}</a>
      </div>
      <div class="cs-hero-visual" role="img" aria-label="Product or service preview placeholder">Drop hero image / mockup here</div>
    </div>`,
      newSectionId(),
      'cs-hero',
      { purpose: 'convert', stage: 'top', variant: 'bold' }
    );
  },

  'trust-bar'() {
    return wrapCsSection(
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
  },

  'services-grid'(a) {
    const voice = v(a);
    const sub =
      a === 'ecommerce'
        ? 'Short labels + price hints reduce “how much?” friction. One CTA per card.'
        : 'Name the outcome per lane — one obvious next step on each card.';
    return wrapCsSection(
      'services',
      `<div class="cs-inner" id="services">
      <h2 style="margin:0 0 .35rem;font-size:1.4rem;font-weight:800;">Pick the line that fits the job</h2>
      <p class="cs-muted" style="margin:0 0 1.25rem;max-width:40rem;">${escapeHtml(sub)}</p>
      <div class="cs-grid">
        <div class="cs-card">
          <h3>Essentials line</h3>
          <p class="cs-muted" style="margin:0;font-size:.88rem;">Seating, tables, basics — in stock, fast turnaround.</p>
          <p class="cs-price-hint">From $899 / event</p>
          <div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.8rem;padding:.5rem 1rem;">${escapeHtml(voice.primaryCta)}</a></div>
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
  },

  bundles(_a) {
    return wrapCsSection(
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
  },

  comparison(_a, ctx) {
    const b = brand(ctx);
    return wrapCsSection(
      'comparison',
      `<div class="cs-inner cs-compare" id="compare">
      <h2 style="margin:0 0 .75rem;font-size:1.4rem;font-weight:800;">Why teams switch to us — not “another vendor”</h2>
      <table>
        <thead><tr><th>Decision factor</th><th class="cs-win">You (${b})</th><th class="cs-lose">Typical alternative</th></tr></thead>
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
  },

  testimonials() {
    return wrapCsSection(
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
  },

  faq() {
    return wrapCsSection(
      'faq',
      `<div class="cs-inner cs-faq" id="faq">
      <h2 style="margin:0 0 1rem;font-size:1.35rem;font-weight:800;">Questions that block the sale</h2>
      <details><summary>How fast can you deliver?</summary><p>Named windows — not “driver will call.” Edit this to match your real SLA.</p></details>
      <details><summary>What if something arrives damaged?</summary><p>Written replacement path + who pays — say it plainly so procurement stops stalling.</p></details>
      <details><summary>Do you work with our venue’s rules?</summary><p>Yes — list certificates, load-in constraints, and who coordinates on site.</p></details>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'trust', stage: 'middle', variant: 'minimal' }
    );
  },

  'cta-main'(a) {
    const voice = v(a);
    return wrapCsSection(
      'cta',
      `<div class="cs-inner" id="cta">
      <h2>Get your setup sorted in 48 hours</h2>
      <p style="opacity:.95;margin:0 0 .35rem;font-weight:600;">${escapeHtml(voice.urgency)}</p>
      <p style="opacity:.88;margin:0 0 1.25rem;font-size:.9rem;">Tell us date, headcount, and venue — we reply with what ships and what it costs.</p>
      <a class="cs-btn cs-btn-darkbg" href="#">${escapeHtml(voice.finalCta)}</a>
    </div>`,
      newSectionId(),
      'cs-cta',
      { purpose: 'convert', stage: 'bottom', variant: 'bold' }
    );
  },

  footer(_a, ctx) {
    const b = brand(ctx);
    return wrapCsSection(
      'footer',
      `<div class="cs-inner">
      <div class="cs-footer-grid">
        <div><div style="font-weight:800;color:#f8fafc;margin-bottom:.5rem;">${b}</div><div class="cs-footer-trust">Licensed · Insured · References on request</div></div>
        <div><div style="font-weight:700;color:#cbd5e1;margin-bottom:.35rem;">Navigate</div><a href="#services">Offers</a> · <a href="#bundles">Packages</a> · <a href="#compare">Compare</a> · <a href="#cta">Book</a></div>
        <div><div style="font-weight:700;color:#cbd5e1;margin-bottom:.35rem;">Contact</div><span>hello@yourcompany.com</span><br /><span>(555) 010‑0199</span></div>
      </div>
    </div>`,
      newSectionId(),
      'cs-footer',
      { purpose: 'inform', stage: 'bottom', variant: 'minimal' }
    );
  },

  'interior-hero'(a, ctx) {
    const voice = v(a);
    const t = escapeHtml(ctx.pageTitle ?? 'Page');
    const b = brand(ctx);
    return wrapCsSection(
      'hero',
      `<div class="cs-inner" style="padding:1.5rem 0 1rem;">
      <p class="cs-muted" style="margin:0 0 .35rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;">${b}</p>
      <h1 style="margin:0 0 .65rem;font-size:clamp(1.45rem,3vw,2rem);font-weight:800;line-height:1.15;">${t}</h1>
      <p class="cs-muted" style="margin:0 0 1rem;max-width:36rem;">State the outcome in one line — then prove it below. If this page does not move someone toward a quote, cut copy until it does.</p>
      <div class="cs-hero-actions" style="margin-bottom:0;">
        <a class="cs-btn" href="index.html#cta">${escapeHtml(voice.primaryCta)}</a>
        <a class="cs-btn cs-btn-ghost" href="#proof" style="border-color:#e2e8f0;color:#475569;">See proof</a>
      </div>
    </div>`,
      newSectionId(),
      'cs-hero',
      { purpose: 'convert', stage: 'top', variant: 'minimal' }
    );
  },

  problem() {
    return wrapCsSection(
      'problem',
      `<div class="cs-inner cs-problem" id="problem">
      <h2 style="margin:0 0 .5rem;font-size:1.2rem;font-weight:800;">The problem your buyer feels</h2>
      <p class="cs-muted" style="margin:0;max-width:40rem;font-size:.9rem;">Name the cost of inaction — late deliveries, unclear pricing, weak leads. Replace with your client’s real pain in one paragraph.</p>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'convert', stage: 'top', variant: 'minimal' }
    );
  },

  solution(a) {
    const voice = v(a);
    return wrapCsSection(
      'solution',
      `<div class="cs-inner" id="solution">
      <h2 style="margin:0 0 .5rem;font-size:1.2rem;font-weight:800;">How we deliver ${escapeHtml(voice.secondaryCta.toLowerCase())}</h2>
      <p class="cs-muted" style="margin:0 0 1rem;max-width:40rem;font-size:.9rem;">Three beats: what you do differently, how delivery feels, what they get in week one.</p>
      <div class="cs-card" style="max-width:42rem;"><p style="margin:0;font-size:.88rem;">Replace with your mechanism — process beats adjectives.</p></div>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'convert', stage: 'middle', variant: 'bold' }
    );
  },

  'proof-row'() {
    return wrapCsSection(
      'trust',
      `<div class="cs-inner" id="proof">
      <div class="cs-trust-bullets" style="justify-content:flex-start;">
        <span>Named project owner</span><span>·</span><span>Written SLA</span><span>·</span><span>Reference call on request</span>
      </div>
    </div>`,
      newSectionId(),
      'cs-trust',
      { purpose: 'trust', stage: 'middle', variant: 'minimal' }
    );
  },

  'offer-cards'(a) {
    const voice = v(a);
    return wrapCsSection(
      'bundles',
      `<div class="cs-inner cs-bundles" style="border-radius:1rem;padding:1.5rem 1rem;">
      <h3 style="margin:0 0 1rem;font-weight:800;">The offer</h3>
      <div class="cs-grid">
        <div class="cs-card cs-popular"><span class="cs-popular-badge">Recommended</span><h3>Core</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">What most buyers need to say yes.</p><div class="cs-card-footer"><a class="cs-btn" href="#cta">${escapeHtml(voice.primaryCta)}</a></div></div>
        <div class="cs-card"><h3>Plus</h3><p class="cs-muted" style="margin:0;font-size:.85rem;">For teams with compliance / procurement steps.</p><div class="cs-card-footer"><a class="cs-btn" href="#cta" style="font-size:.78rem;background:#64748b;">Talk to us</a></div></div>
      </div>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'convert', stage: 'middle', variant: 'bold' }
    );
  },

  'faq-compact'() {
    return wrapCsSection(
      'faq',
      `<div class="cs-inner cs-faq" id="faq">
      <h3 style="margin:0 0 .75rem;font-size:1.05rem;font-weight:800;">Objections</h3>
      <details><summary>Timeline?</summary><p>Replace with your real install or delivery cadence.</p></details>
      <details><summary>Pricing?</summary><p>Explain how quotes work — kills ghosting.</p></details>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'trust', stage: 'middle', variant: 'minimal' }
    );
  },

  'cta-compact'(a) {
    const voice = v(a);
    return wrapCsSection(
      'cta',
      `<div class="cs-inner cs-cta" style="border-radius:.75rem;padding:2rem 1.25rem;">
      <h2 style="margin:0 0 .35rem;font-size:1.25rem;font-weight:800;">${escapeHtml(voice.urgency)}</h2>
      <p style="opacity:.9;margin:0 0 1rem;font-size:.88rem;">Same-day reply on business days — include context so we can answer in one pass.</p>
      <a class="cs-btn cs-btn-darkbg" href="index.html#cta">${escapeHtml(voice.finalCta)}</a>
    </div>`,
      newSectionId(),
      'cs-cta',
      { purpose: 'convert', stage: 'bottom', variant: 'bold' }
    );
  },

  'service-detail'() {
    return wrapCsSection(
      'service-detail',
      `<div class="cs-inner" id="detail">
      <div class="cs-card" style="max-width:44rem;">
        <h3 style="margin:0 0 .5rem;font-size:1.1rem;font-weight:800;">What’s included</h3>
        <ul class="cs-muted" style="margin:0;padding-left:1.1rem;font-size:.88rem;">
          <li>Deliverables in plain language (no jargon)</li>
          <li>Timeline + who owns each step</li>
          <li>What you need from the client to start</li>
        </ul>
      </div>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'inform', stage: 'middle', variant: 'minimal' }
    );
  },

  process() {
    return wrapCsSection(
      'process',
      `<div class="cs-inner cs-process" id="process">
      <h2 style="margin:0 0 1rem;font-size:1.15rem;font-weight:800;">How we work with you</h2>
      <div class="cs-step"><span class="cs-step-num">1</span><div><strong style="display:block;">Kickoff</strong><span class="cs-muted" style="font-size:.85rem;">Goals, assets, approvals — one thread.</span></div></div>
      <div class="cs-step"><span class="cs-step-num">2</span><div><strong style="display:block;">Build</strong><span class="cs-muted" style="font-size:.85rem;">Draft → review → ship on agreed dates.</span></div></div>
      <div class="cs-step"><span class="cs-step-num">3</span><div><strong style="display:block;">Launch</strong><span class="cs-muted" style="font-size:.85rem;">QA, handoff, training if needed.</span></div></div>
    </div>`,
      newSectionId(),
      '',
      { purpose: 'inform', stage: 'middle', variant: 'bold' }
    );
  },

  'hero-minimal'(a) {
    const voice = v(a);
    return wrapCsSection(
      'hero-minimal',
      `<div class="cs-inner" style="padding:2rem 0;color:#0f172a;">
        <h2 style="margin:0 0 .5rem;font-size:1.65rem;font-weight:800;">${escapeHtml(voice.heroTitle)}</h2>
        <p class="cs-muted" style="margin:0 0 1rem;max-width:32rem;">${escapeHtml(voice.heroSub)}</p>
        <a class="cs-btn" href="#cta">${escapeHtml(voice.primaryCta)}</a>
      </div>`,
      newSectionId(),
      'cs-hero',
      { purpose: 'convert', stage: 'top', variant: 'minimal' }
    );
  },

  'hero-bold'(a) {
    const voice = v(a);
    return wrapCsSection(
      'hero-bold',
      `<div class="cs-inner">
        <h2 style="margin:0 0 .5rem;font-size:1.85rem;font-weight:800;">${escapeHtml(voice.heroTitle)}</h2>
        <p class="cs-hero-lead">${escapeHtml(voice.heroSub)}</p>
        <div class="cs-hero-actions">
          <a class="cs-btn" href="#cta">${escapeHtml(voice.primaryCta)}</a>
          <a class="cs-btn cs-btn-ghost" href="#bundles">${escapeHtml(voice.secondaryCta)}</a>
        </div>
        <div class="cs-hero-visual">Hero visual</div>
      </div>`,
      newSectionId(),
      'cs-hero',
      { purpose: 'convert', stage: 'top', variant: 'bold' }
    );
  },

  'hero-premium'(a) {
    const voice = v(a);
    return wrapCsSection(
      'hero-premium',
      `<div class="cs-inner">
        <h2 style="margin:0 0 .5rem;font-size:1.9rem;font-weight:800;">White-glove delivery for teams that cannot miss</h2>
        <p class="cs-hero-lead">${escapeHtml(voice.heroSub)}</p>
        <div class="cs-hero-actions"><a class="cs-btn" href="#cta">${escapeHtml(voice.primaryCta)}</a></div>
      </div>`,
      newSectionId(),
      'cs-hero',
      { purpose: 'convert', stage: 'top', variant: 'premium' }
    );
  },

  'trust-proof'() {
    return wrapCsSection(
      'trust-proof',
      `<div class="cs-inner">
        <div class="cs-trust-bullets" style="justify-content:center;font-size:.85rem;">
          <span>Insured to the door</span><span>·</span><span>10-year durability backing</span><span>·</span><span>5,000+ events without a no-show crew</span>
        </div>
      </div>`,
      newSectionId(),
      'cs-trust',
      { purpose: 'trust', stage: 'top', variant: 'bold' }
    );
  },

  'cta-minimal'(a) {
    const voice = v(a);
    return wrapCsSection(
      'cta-band',
      `<div class="cs-inner" style="text-align:center;padding:1.5rem 0;">
        <p style="margin:0 0 .75rem;font-weight:700;color:#0f172a;">${escapeHtml(voice.urgency)}</p>
        <a class="cs-btn" href="#">${escapeHtml(voice.finalCta)}</a>
      </div>`,
      newSectionId(),
      'cs-cta',
      { purpose: 'convert', stage: 'bottom', variant: 'minimal' }
    );
  },

  'cta-bold'(a) {
    const voice = v(a);
    return wrapCsSection(
      'cta-band',
      `<div class="cs-inner">
        <h3 style="margin:0 0 .35rem;font-size:1.35rem;font-weight:800;">Lock the next step before the calendar fills</h3>
        <p style="opacity:.92;margin:0 0 1rem;font-size:.9rem;">${escapeHtml(voice.heroSub.slice(0, 120))}…</p>
        <a class="cs-btn cs-btn-darkbg" href="#">${escapeHtml(voice.finalCta)}</a>
      </div>`,
      newSectionId(),
      'cs-cta',
      { purpose: 'convert', stage: 'bottom', variant: 'bold' }
    );
  },
};

export function buildSectionByTemplateId(id: string, archetype: SiteArchetype, ctx: SectionBuildContext): string {
  const fn = builders[id];
  if (!fn) return '';
  return fn(archetype, ctx);
}

/** Metadata for library UI — order is UX order within categories. */
export const SECTION_LIBRARY_ROWS: SectionTemplateRow[] = [
  {
    templateId: 'hero-main',
    libraryTitle: 'Hero — full story',
    name: 'Hero',
    category: 'hero',
    purposeLabel: 'Clarify the offer and drive the first action above the fold.',
    previewText: 'Headline + subhead + dual CTA + visual slot.',
    description: 'Default homepage hero — tuned to your site type’s voice.',
    type: 'hero',
    purpose: 'convert',
    stage: 'top',
    variant: 'bold',
    sectionClass: 'cs-hero',
  },
  {
    templateId: 'hero-minimal',
    libraryTitle: 'Hero — minimal',
    name: 'Hero (minimal)',
    category: 'hero',
    purposeLabel: 'Fast clarity when traffic is already warm.',
    previewText: 'Tight headline, one CTA, light background.',
    description: 'Single CTA hero for retargeting or known audiences.',
    type: 'hero-minimal',
    purpose: 'convert',
    stage: 'top',
    variant: 'minimal',
    sectionClass: 'cs-hero',
  },
  {
    templateId: 'hero-bold',
    libraryTitle: 'Hero — bold gradient',
    name: 'Hero (bold)',
    category: 'hero',
    purposeLabel: 'Maximum contrast for cold traffic.',
    previewText: 'Gradient hero, dual CTA, visual placeholder.',
    description: 'Bold gradient layout with two actions.',
    type: 'hero-bold',
    purpose: 'convert',
    stage: 'top',
    variant: 'bold',
    sectionClass: 'cs-hero',
  },
  {
    templateId: 'hero-premium',
    libraryTitle: 'Hero — premium dark',
    name: 'Hero (premium)',
    category: 'hero',
    purposeLabel: 'Signal authority for upmarket buyers.',
    previewText: 'Dark premium hero, single strong CTA.',
    description: 'Dark gradient for B2B premium or high-ticket.',
    type: 'hero-premium',
    purpose: 'convert',
    stage: 'top',
    variant: 'premium',
    sectionClass: 'cs-hero',
  },
  {
    templateId: 'trust-bar',
    libraryTitle: 'Trust — stat bar',
    name: 'Trust bar',
    category: 'trust',
    purposeLabel: 'Reduce doubt with proof, guarantees, and delivery signals.',
    previewText: '4 stats + proof bullets + legal footnote line.',
    description: 'Numbers and guarantees in one scannable strip.',
    type: 'trust',
    purpose: 'trust',
    stage: 'top',
    variant: 'minimal',
    sectionClass: 'cs-trust',
  },
  {
    templateId: 'trust-proof',
    libraryTitle: 'Trust — proof strip',
    name: 'Trust (proof row)',
    category: 'trust',
    purposeLabel: 'One-line credibility for scanners.',
    previewText: 'Insured · warranty · volume proof.',
    description: 'Compact centered proof row.',
    type: 'trust-proof',
    purpose: 'trust',
    stage: 'top',
    variant: 'bold',
    sectionClass: 'cs-trust',
  },
  {
    templateId: 'services-grid',
    libraryTitle: 'Services / products — cards',
    name: 'Services grid',
    category: 'offers',
    purposeLabel: 'Help visitors pick a lane and act.',
    previewText: 'Three cards with price hints and CTAs.',
    description: 'Decision cards for services or product lines.',
    type: 'services',
    purpose: 'convert',
    stage: 'middle',
    variant: 'bold',
  },
  {
    templateId: 'bundles',
    libraryTitle: 'Offer / bundles — 3 tiers',
    name: 'Bundle cards',
    category: 'offers',
    purposeLabel: 'Make comparison easy; highlight the middle tier.',
    previewText: 'Starter / Pro (badge) / Premium.',
    description: 'Three-tier comparison with “most chosen”.',
    type: 'bundles',
    purpose: 'convert',
    stage: 'middle',
    variant: 'bold',
  },
  {
    templateId: 'comparison',
    libraryTitle: 'Comparison table',
    name: 'Comparison',
    category: 'compare',
    purposeLabel: 'Explain why this option beats alternatives.',
    previewText: 'You vs typical vendor on 5 factors.',
    description: 'Win/lose column table.',
    type: 'comparison',
    purpose: 'convert',
    stage: 'middle',
    variant: 'minimal',
  },
  {
    templateId: 'testimonials',
    libraryTitle: 'Testimonials',
    name: 'Testimonials',
    category: 'story',
    purposeLabel: 'Replace claims with specific outcomes.',
    previewText: 'Two quotes with role + cite line.',
    description: 'Result + context quotes.',
    type: 'testimonials',
    purpose: 'trust',
    stage: 'middle',
    variant: 'bold',
  },
  {
    templateId: 'faq',
    libraryTitle: 'FAQ — objections',
    name: 'FAQ',
    category: 'faq',
    purposeLabel: 'Handle objections before they kill the form submit.',
    previewText: 'Three expandable questions with answer stubs.',
    description: 'Details/summary FAQ block.',
    type: 'faq',
    purpose: 'trust',
    stage: 'middle',
    variant: 'minimal',
  },
  {
    templateId: 'problem',
    libraryTitle: 'Problem — pain frame',
    name: 'Problem',
    category: 'story',
    purposeLabel: 'Name the cost of inaction so your solution feels necessary.',
    previewText: 'Short heading + paragraph stub.',
    description: 'Landing-style problem section.',
    type: 'problem',
    purpose: 'convert',
    stage: 'top',
    variant: 'minimal',
  },
  {
    templateId: 'solution',
    libraryTitle: 'Solution — mechanism',
    name: 'Solution',
    category: 'story',
    purposeLabel: 'Show how you deliver the outcome (process beats hype).',
    previewText: 'Heading + card placeholder.',
    description: 'Explains “how it works” in plain language.',
    type: 'solution',
    purpose: 'convert',
    stage: 'middle',
    variant: 'bold',
  },
  {
    templateId: 'process',
    libraryTitle: 'Process — numbered steps',
    name: 'Process',
    category: 'story',
    purposeLabel: 'Reduce fear of the unknown with a clear path.',
    previewText: 'Three numbered steps with short copy.',
    description: 'Kickoff → build → launch pattern.',
    type: 'process',
    purpose: 'inform',
    stage: 'middle',
    variant: 'bold',
  },
  {
    templateId: 'service-detail',
    libraryTitle: 'Service details — checklist',
    name: 'Service details',
    category: 'offers',
    purposeLabel: 'Spell deliverables so procurement can say yes.',
    previewText: 'Included list + timeline hints.',
    description: 'Card with bullet checklist for a service page.',
    type: 'service-detail',
    purpose: 'inform',
    stage: 'middle',
    variant: 'minimal',
  },
  {
    templateId: 'cta-minimal',
    libraryTitle: 'CTA — minimal strip',
    name: 'CTA (minimal)',
    category: 'cta',
    purposeLabel: 'Turn interest into action with urgency + one button.',
    previewText: 'Urgency line + single CTA.',
    description: 'Minimal closing strip.',
    type: 'cta-band',
    purpose: 'convert',
    stage: 'bottom',
    variant: 'minimal',
    sectionClass: 'cs-cta',
  },
  {
    templateId: 'cta-bold',
    libraryTitle: 'CTA — bold close',
    name: 'CTA (bold)',
    category: 'cta',
    purposeLabel: 'Strong final push after proof.',
    previewText: 'Headline + supporting line + dark button.',
    description: 'Bold gradient CTA band.',
    type: 'cta-band',
    purpose: 'convert',
    stage: 'bottom',
    variant: 'bold',
    sectionClass: 'cs-cta',
  },
  {
    templateId: 'cta-main',
    libraryTitle: 'CTA — full band',
    name: 'CTA (full)',
    category: 'cta',
    purposeLabel: 'Primary conversion band with urgency and subcopy.',
    previewText: 'Large headline, urgency, final CTA.',
    description: 'Same as homepage main CTA.',
    type: 'cta',
    purpose: 'convert',
    stage: 'bottom',
    variant: 'bold',
    sectionClass: 'cs-cta',
  },
  {
    templateId: 'footer',
    libraryTitle: 'Footer — links + trust',
    name: 'Footer',
    category: 'footer',
    purposeLabel: 'Navigation, contact, and trust signals at the end of the journey.',
    previewText: 'Brand + nav links + contact block.',
    description: 'Dark footer with grid columns.',
    type: 'footer',
    purpose: 'inform',
    stage: 'bottom',
    variant: 'minimal',
    sectionClass: 'cs-footer',
  },
];

export function libraryRowByTemplateId(id: string): SectionTemplateRow | undefined {
  return SECTION_LIBRARY_ROWS.find((r) => r.templateId === id);
}
