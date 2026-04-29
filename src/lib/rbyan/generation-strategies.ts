import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';
import type { RbyanCopyPack } from '@/lib/rbyan/generate-copy';
import type { RbyanDesignPack } from '@/lib/rbyan/generate-design';
import type {
  PromptClassification,
  RbyanEngineMode,
  RbyanGeneratedFile,
  RbyanProjectContext,
  RbyanSessionMemory,
} from '@/lib/rbyan/types';
import { classifyPrompt } from '@/lib/rbyan/prompt-classifier';
import { createBuildPlan, buildPlanToSummaryLines, mergeModifierIntoPlan } from '@/lib/rbyan/build-plan';
import { generateCopy } from '@/lib/rbyan/generate-copy';
import { generateDesign, mergeDesignIntoCss } from '@/lib/rbyan/generate-design';
import { buildSiteFromPlan } from '@/lib/rbyan/build-site-from-plan';
import { buildAssistantNarrative } from '@/lib/rbyan/response-message';
import { buildSuggestionChips } from '@/lib/rbyan/suggestions';
import { applyCtaCopyOnly, applyCopyToHtml, sharpenCtaCopy } from '@/lib/rbyan/apply-copy-to-html';
import { scopeDesignPackToSection } from '@/lib/rbyan/section-scope';

function getIndexCssJs(files: RbyanGeneratedFile[]) {
  const ix = files.find((f) => f.name === 'index.html');
  const css = files.find((f) => f.name === 'styles.css');
  const js = files.find((f) => f.name === 'script.js');
  if (!ix || !css || !js) return null;
  return { ix, css, js };
}

function diffUpdated(before: RbyanGeneratedFile[], after: RbyanGeneratedFile[]): string[] {
  const names = new Set<string>();
  for (const f of after) {
    const b = before.find((x) => x.name === f.name);
    if (!b || b.content !== f.content) names.add(f.name);
  }
  return [...names];
}

/* ——— Add section ——— */

const PRICING_SECTION = `
<section class="pricing rbyan-injected" id="rbyan-pricing" aria-label="Pricing">
  <div class="pricing-inner">
    <h2>Packages that scale with you</h2>
    <p class="pricing-lead">Transparent tiers—pick what matches your volume and support needs.</p>
    <div class="pricing-grid">
      <article class="price-card"><h3>Starter</h3><p class="price-tag">$99<span>/mo</span></p><ul><li>Core catalog</li><li>Email support</li><li>Standard turnaround</li></ul><a class="btn btn--secondary" href="#cta" style="width:100%">Choose Starter</a></article>
      <article class="price-card featured"><span class="price-card-badge">Most popular</span><h3>Growth</h3><p class="price-tag">$249<span>/mo</span></p><ul><li>Priority staging</li><li>Dedicated coordinator</li><li>Rush slots</li></ul><a class="btn btn--primary" href="#cta" style="width:100%">Choose Growth</a></article>
      <article class="price-card"><h3>Premier</h3><p class="price-tag">$499<span>/mo</span></p><ul><li>White-glove install</li><li>On-site styling</li><li>Custom bundles</li></ul><a class="btn btn--secondary" href="#cta" style="width:100%">Choose Premier</a></article>
    </div>
  </div>
</section>`;

const EXTRA_TESTIMONIALS = `
<section class="testimonials rbyan-injected" id="rbyan-extra-testimonials" aria-label="More testimonials">
  <div class="testimonials-inner">
    <h2>More teams trust this experience</h2>
    <p class="pricing-lead" style="margin-top:0.5rem">Additional proof from planners who care about deadlines and on-site polish.</p>
    <div class="t-grid rbyan-tgrid">
      <figure class="rby-card" style="margin:0;padding:var(--rby-space-4,1.5rem)">
        <blockquote class="rby-quote" style="margin:0">“Fast, organized, and the assets looked better than our renders.”</blockquote>
        <figcaption><strong>Alex Dunn</strong><span style="display:block;font-size:0.8125rem;color:var(--rby-text-muted,#71717a);margin-top:0.5rem">Ops Lead, Framehouse Events</span></figcaption>
      </figure>
      <figure class="rby-card" style="margin:0;padding:var(--rby-space-4,1.5rem)">
        <blockquote class="rby-quote" style="margin:0">“They treated our launch date as immovable—and hit it.”</blockquote>
        <figcaption><strong>Samira Khan</strong><span style="display:block;font-size:0.8125rem;color:var(--rby-text-muted,#71717a);margin-top:0.5rem">Marketing Director, Alloy Summit</span></figcaption>
      </figure>
    </div>
  </div>
</section>`;

const FAQ_SECTION = `
<section class="faq rbyan-injected" id="rbyan-faq" aria-label="FAQ">
  <div class="faq-inner">
    <h2>Questions, answered</h2>
    <dl class="faq-list">
      <div><dt>How fast can we ship?</dt><dd>Most metro zones qualify for 48–72h staging once inventory is confirmed.</dd></div>
      <div><dt>Do you handle venue rules?</dt><dd>Yes—load-in windows, union crews, and venue COIs are part of our standard checklist.</dd></div>
      <div><dt>What if counts change?</dt><dd>We re-quote quickly and keep alternates reserved when you need flexibility.</dd></div>
    </dl>
  </div>
</section>`;

const INJECTED_CSS = `
/* Rbyan injected sections (aligns with design-system tokens when present) */
.rbyan-injected { padding: var(--rby-section-y, clamp(3rem, 7vw, 5rem)) var(--rby-space-3, 1.5rem); }
.pricing-inner, .testimonials-inner, .faq-inner { max-width: 75rem; margin: 0 auto; }
.pricing { background: var(--rby-bg, #fafaf9); border-top: 1px solid var(--rby-border, #e4e4e7); }
.pricing h2, .faq h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 var(--rby-space-2, 0.5rem); letter-spacing: -0.02em; color: var(--rby-text, #18181b); }
.pricing-lead { color: var(--rby-text-muted, #52525b); margin: 0 0 var(--rby-space-5, 2rem); max-width: 42rem; line-height: 1.65; }
.pricing-grid { display: grid; gap: var(--rby-space-4, 1.25rem); grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.price-card {
  background: var(--rby-bg-elevated, #fff);
  border-radius: var(--rby-radius-lg, 1rem);
  padding: var(--rby-space-4, 1.5rem);
  border: 1px solid var(--rby-border, #e4e4e7);
  box-shadow: var(--rby-shadow-md, 0 4px 16px rgba(15,23,42,0.08));
  transition: var(--rby-transition, transform 0.2s ease, box-shadow 0.2s ease);
}
.price-card:hover { transform: translateY(-3px); box-shadow: var(--rby-shadow-lg, 0 12px 40px rgba(15,23,42,0.1)); }
.price-card.featured { border-color: #c4b5fd; box-shadow: 0 20px 50px rgba(124, 58, 237, 0.15); }
.price-card-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.25rem 0.625rem;
  border-radius: 624.9375rem;
  background: rgba(124, 58, 237, 0.12);
  color: var(--rby-accent, #7c3aed);
  margin-bottom: var(--rby-space-2, 0.75rem);
}
.price-card h3 { margin: 0 0 var(--rby-space-2, 0.5rem); font-size: 1.05rem; color: var(--rby-text, #18181b); }
.price-tag { font-size: 1.75rem; font-weight: 800; margin: 0 0 var(--rby-space-2, 1rem); color: var(--rby-text, #18181b); }
.price-tag span { font-size: 0.9rem; font-weight: 600; color: var(--rby-text-muted, #71717a); }
.price-card ul { margin: 0 0 var(--rby-space-4, 1.25rem); padding-left: 1.1rem; color: var(--rby-text-muted, #52525b); font-size: 0.9rem; line-height: 1.55; }
.price-card .btn { margin-top: var(--rby-space-1, 0.5rem); }
.rbyan-tgrid { display: grid; gap: var(--rby-space-4, 1.25rem); grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.rbyan-tgrid blockquote {
  background: var(--rby-bg-elevated, #fff);
  border-radius: var(--rby-radius-lg, 1rem);
  padding: var(--rby-space-4, 1.5rem);
  margin: 0;
  border: 1px solid var(--rby-border, #e4e4e7);
  font-style: normal;
  color: var(--rby-text, #18181b);
  line-height: 1.55;
  transition: var(--rby-transition, transform 0.2s ease, box-shadow 0.2s ease);
}
.rbyan-tgrid blockquote:hover { transform: translateY(-2px); box-shadow: var(--rby-shadow-md, 0 4px 16px rgba(15,23,42,0.08)); }
.rbyan-tgrid cite { display: block; margin-top: var(--rby-space-2, 0.75rem); font-size: 0.8125rem; color: var(--rby-text-muted, #71717a); font-style: normal; }
.faq { background: var(--rby-bg-elevated, #fff); border-top: 1px solid var(--rby-border, #e4e4e7); }
.faq-list { display: grid; gap: var(--rby-space-4, 1.25rem); }
.faq-list dt { font-weight: 700; color: var(--rby-text, #18181b); margin-bottom: 0.35rem; }
.faq-list dd { margin: 0; color: var(--rby-text-muted, #52525b); line-height: 1.6; font-size: 0.92rem; }
@media (max-width: 1024px) {
  .pricing-grid, .rbyan-tgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .rbyan-injected { padding-left: var(--rby-space-2, 1rem); padding-right: var(--rby-space-2, 1rem); }
  .pricing-grid, .rbyan-tgrid { grid-template-columns: 1fr; }
}
`;

function injectBeforeCtaOrFooter(html: string, block: string): string | null {
  const cta = html.match(/<section[^>]*class="[^"]*\bcta\b[^"]*"[^>]*>/i);
  if (cta && cta.index !== undefined) {
    return html.slice(0, cta.index) + block + '\n  ' + html.slice(cta.index);
  }
  const footer = html.search(/<footer\b/i);
  if (footer >= 0) {
    return html.slice(0, footer) + block + '\n' + html.slice(footer);
  }
  return null;
}

export function strategyAddSection(prompt: string, files: RbyanGeneratedFile[]): {
  files: RbyanGeneratedFile[];
  plan: string[];
  sections: string[];
  versionName: string;
} | null {
  const g = getIndexCssJs(files);
  if (!g) return null;
  const p = prompt.toLowerCase();
  let html = g.ix.content;
  let css = g.css.content;
  const plan: string[] = [];
  let versionName = 'Section update';

  if (/pricing|packages|tiers|plans?\b/i.test(p)) {
    if (html.includes('id="rbyan-pricing"') || html.includes('rbyan-pricing')) return null;
    const next = injectBeforeCtaOrFooter(html, PRICING_SECTION);
    if (!next) return null;
    html = next;
    if (!css.includes('Rbyan injected sections')) css += INJECTED_CSS;
    plan.push('Inserted a responsive pricing grid with three tiers and CTAs wired to your existing CTA anchor.');
    versionName = 'Added pricing section';
  } else if (/testimonial|reviews?|social proof/i.test(p)) {
    if (html.includes('id="rbyan-extra-testimonials"')) return null;
    const next = injectBeforeCtaOrFooter(html, EXTRA_TESTIMONIALS);
    if (!next) return null;
    html = next;
    if (!css.includes('Rbyan injected sections')) css += INJECTED_CSS;
    plan.push('Appended an additional testimonials band before the CTA without removing existing content.');
    versionName = 'Added testimonials section';
  } else if (/faq|questions/i.test(p)) {
    if (html.includes('id="rbyan-faq"')) return null;
    const next = injectBeforeCtaOrFooter(html, FAQ_SECTION);
    if (!next) return null;
    html = next;
    if (!css.includes('Rbyan injected sections')) css += INJECTED_CSS;
    plan.push('Added an FAQ section with scannable Q/A pairs ahead of conversion.');
    versionName = 'Added FAQ section';
  } else {
    return null;
  }

  return {
    files: [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      g.js,
    ],
    plan,
    sections: ['Injected block', 'Preserved structure', 'CTA'],
    versionName,
  };
}

/* ——— Modify style ——— */

export function strategyModifyStyle(prompt: string, files: RbyanGeneratedFile[]): {
  files: RbyanGeneratedFile[];
  plan: string[];
  sections: string[];
  versionName: string;
} | null {
  const g = getIndexCssJs(files);
  if (!g) return null;
  const p = prompt.toLowerCase();
  let css = g.css.content;
  const plan: string[] = [];
  const prefix: string[] = ['/* Rbyan style pass */'];

  if (/\bpremium|luxury|high[\s-]end|darker|dark|moody/i.test(p)) {
    prefix.push(
      'body{background:#0b0a0f!important;color:#f4f4f5!important;}',
      '.rby-card,.rby-bundle,.rby-product,.price-card,blockquote{background:#14141a!important;border-color:rgba(255,255,255,0.08)!important;color:#e4e4e7!important;}',
      '.rby-section,.categories,.bundles,.testimonials,.pricing,.faq{background:#0b0a0f!important;border-color:rgba(255,255,255,0.06)!important;}'
    );
    plan.push('Applied a darker premium canvas and tuned surfaces for contrast on cards and content bands.');
  }
  if (/\bmodern|spacing|airy|breathing room|apple|clean minimal/i.test(p)) {
    prefix.push(
      'section{padding-left:clamp(1rem,5vw,2.5rem)!important;padding-right:clamp(1rem,5vw,2.5rem)!important;}',
      'h1,h2,h3{letter-spacing:-0.035em!important;}',
      'p,.section-lead,.pricing-lead{line-height:1.65!important;}'
    );
    plan.push('Loosened section gutters and increased line-height for a calmer, modern rhythm.');
  }
  if (/\bbold|headline|impact|larger heading/i.test(p)) {
    prefix.push(
      'h1{font-size:clamp(2.35rem,5.2vw,3.75rem)!important;line-height:1.04!important;}',
      'h2{font-size:clamp(1.65rem,3.4vw,2.45rem)!important;}'
    );
    plan.push('Scaled display headings for a stronger hero and section hierarchy.');
  }
  if (/\bgradient|palette|accent|violet|purple|teal/i.test(p)) {
    prefix.push(
      '.btn--primary,.btn.btn--primary{background:linear-gradient(135deg,#6366f1,#7c3aed)!important;box-shadow:0 14px 50px rgba(99,102,241,0.35)!important;}'
    );
    plan.push('Refreshed primary button gradients for clearer conversion emphasis.');
  }

  if (plan.length === 0) {
    prefix.push('* { scroll-behavior: smooth; }', 'a.btn--primary,.btn--primary{transform:translateZ(0);transition:transform .15s ease,box-shadow .15s ease;}');
    plan.push('Added safe motion/transition defaults when the style request was broad.');
  }

  css = `${prefix.join('\n')}\n${css}`;

  return {
    files: [
      g.ix,
      { name: 'styles.css', type: 'css', content: css },
      g.js,
    ],
    plan,
    sections: ['Visual system', 'CSS'],
    versionName: 'Style iteration',
  };
}

/* ——— Improve copy (hero-only, co-build focus) ——— */

export function strategyImproveCopyHeroOnly(prompt: string, files: RbyanGeneratedFile[]): {
  files: RbyanGeneratedFile[];
  plan: string[];
  sections: string[];
  versionName: string;
} | null {
  const g = getIndexCssJs(files);
  if (!g) return null;
  let html = g.ix.content;
  const p = prompt.toLowerCase();
  const plan: string[] = [];

  const heroRe =
    /(<section[^>]*class="[^"]*rby-hero-(?:event|service)[^"]*"[^>]*>[\s\S]*?<h1[^>]*>)([\s\S]*?)(<\/h1>)/i;
  if (heroRe.test(html)) {
    html = html.replace(heroRe, (_, open: string, mid: string, close: string) => {
      const t = mid.replace(/<[^>]+>/g, '').trim();
      if (/strong|bold|punch|power/i.test(p)) {
        return `${open}${t ? `${t} — sharper, outcome-first.` : 'A stronger, outcome-first headline.'}${close}`;
      }
      if (/short|tight|minimal/i.test(p)) {
        return `${open}${t.length > 90 ? `${t.slice(0, 88)}…` : t}${close}`;
      }
      return `${open}${t ? `${t} — refined for clarity.` : 'Refined headline for clarity.'}${close}`;
    });
    plan.push('Rewrote the hero headline inside the focused hero block only.');
  }

  html = html.replace(
    /(<section[^>]*class="[^"]*rby-hero-(?:event|service)[^"]*"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    (_, a, mid: string, c) => {
      if (/modern|fresh|clean/i.test(p)) {
        return `${a}${mid.trim()} Tighter rhythm and a calmer read for modern buyers.${c}`;
      }
      return `${a}${mid}${c}`;
    }
  );
  plan.push('Adjusted hero supporting line while keeping the rest of the page intact.');

  return {
    files: [{ name: 'index.html', type: 'html', content: html }, g.css, g.js],
    plan,
    sections: ['Hero'],
    versionName: 'Hero copy (focused)',
  };
}

/* ——— Improve copy ——— */

export function strategyImproveCopy(prompt: string, files: RbyanGeneratedFile[]): {
  files: RbyanGeneratedFile[];
  plan: string[];
  sections: string[];
  versionName: string;
} | null {
  const g = getIndexCssJs(files);
  if (!g) return null;
  let html = g.ix.content;
  const p = prompt.toLowerCase();
  const plan: string[] = [];

  if (/roof|gutter|shingle/i.test(p)) {
    html = html.replace(
      /<h1([^>]*)>[\s\S]*?<\/h1>/i,
      '<h1$1>Storm-ready roofs, spotless installs, and quotes you can compare with confidence.</h1>'
    );
    if (/<p class="lead"/i.test(html)) {
      html = html.replace(
        /<p class="lead"[^>]*>[\s\S]*?<\/p>/i,
        '<p class="lead">Same-week assessments, insurance-friendly documentation, and crews who respect your property.</p>'
      );
    } else {
      html = html.replace(
        /(<section class="hero"[^>]*>[\s\S]*?<p)([^>]*>)([^<]+)(<\/p>)/i,
        '$1$2Same-week assessments, insurance-friendly documentation, and crews who respect your property.$4'
      );
    }
    plan.push('Rewrote hero messaging for a local exterior / roofing positioning.');
  } else if (/furniture|rental|event/i.test(p)) {
    html = html.replace(
      /<h1([^>]*)>[\s\S]*?<\/h1>/i,
      '<h1$1>Inventory that photographs like a editorial shoot—delivered on time for your event.</h1>'
    );
    plan.push('Sharpened hero copy toward premium rental / event outcomes.');
  } else {
    html = html.replace(/<h1([^>]*)>([^<]+)<\/h1>/i, (_, a, t: string) => {
      const trimmed = t.trim();
      if (trimmed.length > 120) return `<h1${a}>${trimmed}</h1>`;
      return `<h1${a}>${trimmed} — built to convert, tuned for clarity.</h1>`;
    });
    plan.push('Tightened the primary headline with a clearer value-forward angle.');
  }

  html = html.replace(
    /(<a[^>]*class="[^"]*btn[^"]*btn-primary[^"]*"[^>]*>)([^<]+)(<\/a>)/i,
    (_, a, label: string, c) => `${a}${/get|book|start|shop|browse/i.test(label) ? label : `Book a walkthrough — ${label.trim()}`}${c}`
  );
  plan.push('Strengthened primary CTA microcopy where a button label was generic.');

  return {
    files: [
      { name: 'index.html', type: 'html', content: html },
      g.css,
      g.js,
    ],
    plan,
    sections: ['Hero copy', 'CTA'],
    versionName: 'Copy refresh',
  };
}

/* ——— Build site (multi-stage: plan → copy → design → code) ——— */

export function strategyBuildSite(
  prompt: string,
  ctx: RbyanProjectContext,
  sessionMemory: RbyanSessionMemory | null | undefined
) {
  const brand = ctx.clientCompany?.trim() || ctx.projectName || 'Your brand';
  const plan = createBuildPlan(prompt, {
    previousPlan: sessionMemory?.lastPlan ?? null,
    brandHint: brand,
    projectName: ctx.projectName,
  });
  const copy = generateCopy(plan, { brand, projectName: ctx.projectName });
  const design = generateDesign(plan);
  const site = buildSiteFromPlan(plan, copy, design, ctx);
  return {
    files: site.files,
    plan: [...buildPlanToSummaryLines(plan), ...site.planLines],
    sections: site.sections,
    versionName: site.versionName,
    buildPlan: plan,
    copyPack: copy,
    designPack: design,
  };
}

/* ——— Orchestrate by classification ——— */

function carrySession(mem: RbyanSessionMemory | null | undefined, patch: Partial<RbyanSessionMemory> & { lastPrompt: string }): RbyanSessionMemory {
  const base = mem ?? { lastPlan: null, lastCopy: null, lastDesign: null, lastPrompt: null };
  return {
    lastPlan: patch.lastPlan !== undefined ? patch.lastPlan : base.lastPlan,
    lastCopy: patch.lastCopy !== undefined ? patch.lastCopy : base.lastCopy,
    lastDesign: patch.lastDesign !== undefined ? patch.lastDesign : base.lastDesign,
    lastPrompt: patch.lastPrompt,
  };
}

export type PipelineResult = {
  classification: PromptClassification;
  files: RbyanGeneratedFile[];
  plan: string[];
  sections: string[];
  versionName: string;
  message: string;
  updatedFiles?: string[];
  buildPlan?: RbyanBuildPlan;
  copyPack?: RbyanCopyPack;
  designPack?: RbyanDesignPack;
  suggestions?: string[];
  sessionMemory: RbyanSessionMemory;
};

export function runGenerationPipeline(args: {
  prompt: string;
  mode: RbyanEngineMode;
  projectContext: RbyanProjectContext;
  existingFiles: RbyanGeneratedFile[] | null;
  sessionMemory?: RbyanSessionMemory | null;
  /** UI section focus: e.g. "Hero" — narrows style/copy passes when possible. */
  focusedSection?: string | null;
}): PipelineResult {
  const { prompt, mode, projectContext, existingFiles, sessionMemory, focusedSection } = args;
  const p = prompt.toLowerCase();
  const has = Boolean(existingFiles?.length);
  let classification = classifyPrompt(prompt, { hasExistingSite: has, mode });
  const brand = projectContext.clientCompany?.trim() || projectContext.projectName || 'Your brand';

  if (classification === 'unknown' && has) {
    if (strategyAddSection(prompt, existingFiles!)) {
      classification = 'add-section';
    } else if (/\b(copy|text|headline|wording|cta|description|messaging|tone)\b/i.test(p)) {
      classification = 'improve-copy';
    } else {
      classification = 'modify-style';
    }
  }

  if (classification === 'build-site' || !has) {
    const b = strategyBuildSite(prompt, projectContext, sessionMemory);
    const html = b.files.find((f) => f.name === 'index.html')?.content ?? '';
    return {
      classification: 'build-site',
      files: b.files,
      plan: b.plan,
      sections: b.sections,
      versionName: b.versionName,
      message: buildAssistantNarrative({
        kind: 'full',
        classification: 'build-site',
        buildPlan: b.buildPlan!,
        changedFiles: [],
      }),
      buildPlan: b.buildPlan,
      copyPack: b.copyPack,
      designPack: b.designPack,
      suggestions: buildSuggestionChips(b.buildPlan!, 'build-site', html),
      sessionMemory: {
        lastPlan: b.buildPlan!,
        lastCopy: b.copyPack!,
        lastDesign: b.designPack!,
        lastPrompt: prompt,
      },
    };
  }

  if (classification === 'add-section') {
    const out = strategyAddSection(prompt, existingFiles!);
    if (out) {
      const updatedFiles = diffUpdated(existingFiles!, out.files);
      const html = out.files.find((f) => f.name === 'index.html')?.content ?? '';
      return {
        classification: 'add-section',
        files: out.files,
        plan: out.plan,
        sections: out.sections,
        versionName: out.versionName,
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'section',
          classification: 'add-section',
          buildPlan: sessionMemory?.lastPlan ?? null,
          changedFiles: updatedFiles,
        }),
        buildPlan: sessionMemory?.lastPlan ?? undefined,
        suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'add-section', html),
        sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
      };
    }
    const fallback = strategyModifyStyle(prompt, existingFiles!);
    if (fallback) {
      const updatedFiles = diffUpdated(existingFiles!, fallback.files);
      return {
        classification: 'modify-style',
        files: fallback.files,
        plan: [...fallback.plan, 'Section intent was unclear—applied a safe style polish instead.'],
        sections: fallback.sections,
        versionName: 'Section fallback',
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'fallback',
          classification: 'modify-style',
          buildPlan: sessionMemory?.lastPlan ?? null,
          changedFiles: updatedFiles,
          extraNotes: ['Could not infer a concrete block to add.'],
        }),
        buildPlan: sessionMemory?.lastPlan ?? undefined,
        suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'modify-style', null),
        sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
      };
    }
  }

  if (classification === 'modify-style') {
    const g = getIndexCssJs(existingFiles!);
    if (sessionMemory?.lastPlan && g) {
      const plan = mergeModifierIntoPlan(sessionMemory.lastPlan, prompt);
      const copy = generateCopy(plan, { brand, projectName: projectContext.projectName });
      const designRaw = generateDesign(plan);
      const design = scopeDesignPackToSection(designRaw, focusedSection);
      const heroStyleOnly = Boolean(focusedSection && /hero/i.test(focusedSection));
      const html = heroStyleOnly
        ? g.ix.content
        : applyCopyToHtml(g.ix.content, copy, plan.siteArchetype);
      const css = mergeDesignIntoCss(g.css.content, design);
      const nextFiles: RbyanGeneratedFile[] = [
        { name: 'index.html', type: 'html', content: html },
        { name: 'styles.css', type: 'css', content: css },
        g.js,
      ];
      const updatedFiles = diffUpdated(existingFiles!, nextFiles);
      return {
        classification: 'modify-style',
        files: nextFiles,
        plan: [
          ...buildPlanToSummaryLines(plan),
          heroStyleOnly
            ? 'Applied plan-driven design layer scoped to the hero while leaving body copy stable.'
            : 'Applied plan-driven design layer (tokens + spacing + type) and synced copy to the updated tone.',
        ],
        sections: plan.sections,
        versionName: 'Plan-driven style pass',
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'style',
          classification: 'modify-style',
          buildPlan: plan,
          changedFiles: updatedFiles,
        }),
        buildPlan: plan,
        copyPack: copy,
        designPack: design,
        suggestions: buildSuggestionChips(plan, 'modify-style', html),
        sessionMemory: { lastPlan: plan, lastCopy: copy, lastDesign: design, lastPrompt: prompt },
      };
    }
    const out = strategyModifyStyle(prompt, existingFiles!);
    if (out) {
      const updatedFiles = diffUpdated(existingFiles!, out.files);
      return {
        classification: 'modify-style',
        files: out.files,
        plan: out.plan,
        sections: out.sections,
        versionName: out.versionName,
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'style',
          classification: 'modify-style',
          buildPlan: sessionMemory?.lastPlan ?? null,
          changedFiles: updatedFiles,
          extraNotes: ['Used keyword style pass (no prior build plan in memory).'],
        }),
        buildPlan: sessionMemory?.lastPlan ?? undefined,
        suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'modify-style', null),
        sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
      };
    }
  }

  if (classification === 'improve-copy') {
    const g = getIndexCssJs(existingFiles!);
    const ctaOnly = /\b(cta|button|call to action)\b/i.test(p) && !/\bheadline|hero|title|h1\b/i.test(p);
    if (ctaOnly && sessionMemory?.lastCopy && sessionMemory.lastPlan && g) {
      const sharpened = sharpenCtaCopy(sessionMemory.lastCopy);
      const html = applyCtaCopyOnly(g.ix.content, sharpened);
      const nextFiles: RbyanGeneratedFile[] = [
        { name: 'index.html', type: 'html', content: html },
        g.css,
        g.js,
      ];
      const updatedFiles = diffUpdated(existingFiles!, nextFiles);
      return {
        classification: 'improve-copy',
        files: nextFiles,
        plan: ['Sharpened primary, secondary, and footer CTAs only—no layout or CSS changes.'],
        sections: ['CTA copy'],
        versionName: 'CTA polish',
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'cta-only',
          classification: 'improve-copy',
          buildPlan: sessionMemory.lastPlan,
          changedFiles: ['index.html'],
        }),
        buildPlan: sessionMemory.lastPlan,
        copyPack: sharpened,
        designPack: sessionMemory.lastDesign ?? undefined,
        suggestions: buildSuggestionChips(sessionMemory.lastPlan, 'improve-copy', html),
        sessionMemory: { ...sessionMemory, lastCopy: sharpened, lastPrompt: prompt },
      };
    }

    const heroFocus = Boolean(focusedSection && /hero/i.test(focusedSection));
    if (heroFocus && g) {
      const heroOut = strategyImproveCopyHeroOnly(prompt, existingFiles!);
      if (heroOut) {
        const updatedFiles = diffUpdated(existingFiles!, heroOut.files);
        const html = heroOut.files.find((f) => f.name === 'index.html')?.content ?? '';
        return {
          classification: 'improve-copy',
          files: heroOut.files,
          plan: heroOut.plan,
          sections: heroOut.sections,
          versionName: heroOut.versionName,
          updatedFiles,
          message: buildAssistantNarrative({
            kind: 'copy',
            classification: 'improve-copy',
            buildPlan: sessionMemory?.lastPlan ?? null,
            changedFiles: updatedFiles,
            extraNotes: ['Scoped to the **Hero** block only.'],
          }),
          buildPlan: sessionMemory?.lastPlan ?? undefined,
          suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'improve-copy', html),
          sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
        };
      }
    }

    const out = strategyImproveCopy(prompt, existingFiles!);
    if (out) {
      const updatedFiles = diffUpdated(existingFiles!, out.files);
      const html = out.files.find((f) => f.name === 'index.html')?.content ?? '';
      return {
        classification: 'improve-copy',
        files: out.files,
        plan: out.plan,
        sections: out.sections,
        versionName: out.versionName,
        updatedFiles,
        message: buildAssistantNarrative({
          kind: 'copy',
          classification: 'improve-copy',
          buildPlan: sessionMemory?.lastPlan ?? null,
          changedFiles: updatedFiles,
        }),
        buildPlan: sessionMemory?.lastPlan ?? undefined,
        suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'improve-copy', html),
        sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
      };
    }
  }

  const out = strategyModifyStyle(prompt, existingFiles!);
  if (out) {
    const updatedFiles = diffUpdated(existingFiles!, out.files);
    return {
      classification: 'modify-style',
      files: out.files,
      plan: out.plan,
      sections: out.sections,
      versionName: out.versionName,
      updatedFiles,
      message: buildAssistantNarrative({
        kind: 'style',
        classification: 'modify-style',
        buildPlan: sessionMemory?.lastPlan ?? null,
        changedFiles: updatedFiles,
      }),
      buildPlan: sessionMemory?.lastPlan ?? undefined,
      suggestions: buildSuggestionChips(sessionMemory?.lastPlan ?? null, 'modify-style', null),
      sessionMemory: carrySession(sessionMemory, { lastPrompt: prompt }),
    };
  }

  const rebuild = strategyBuildSite(prompt, projectContext, sessionMemory);
  const html = rebuild.files.find((f) => f.name === 'index.html')?.content ?? '';
  return {
    classification: 'build-site',
    files: rebuild.files,
    plan: ['No compatible prior files for iteration; generated a fresh site instead.', ...rebuild.plan],
    sections: rebuild.sections,
    versionName: rebuild.versionName,
    message: buildAssistantNarrative({
      kind: 'fallback',
      classification: 'build-site',
      buildPlan: rebuild.buildPlan!,
      changedFiles: [],
      extraNotes: ['Started from a fresh template because iteration could not merge safely.'],
    }),
    buildPlan: rebuild.buildPlan,
    copyPack: rebuild.copyPack,
    designPack: rebuild.designPack,
    suggestions: buildSuggestionChips(rebuild.buildPlan!, 'build-site', html),
    sessionMemory: {
      lastPlan: rebuild.buildPlan!,
      lastCopy: rebuild.copyPack!,
      lastDesign: rebuild.designPack!,
      lastPrompt: prompt,
    },
  };
}
