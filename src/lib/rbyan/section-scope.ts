import type { RbyanDesignPack } from '@/lib/rbyan/generate-design';

/** Map UI section labels to CSS scope selectors (first match wins per template). */
export function sectionLabelToScope(label: string | null | undefined): string | null {
  if (!label) return null;
  const k = label.trim().toLowerCase();
  const map: Record<string, string> = {
    hero: '.rby-hero-event, .rby-hero-service, .rby-agency-hero, .rby-landing-hero, .rby-shop-hero',
    trust: '.rby-trust, #trust',
    categories: '#categories',
    bundles: '#bundles',
    testimonials: '.testimonials, #reviews, #stories',
    cta: '.rby-cta-block, .rby-lead-band, .rby-landing-cta, #go, #lead, #contact',
    footer: '.site-footer',
    navigation: '.site-header, header.site-header',
  };
  return map[k] ?? null;
}

/**
 * Scope loose `body` / `.rby-section` rules from the design pack to a section subtree (mock-safe).
 */
export function scopeDesignPackToSection(design: RbyanDesignPack, sectionLabel: string | null | undefined): RbyanDesignPack {
  const scope = sectionLabelToScope(sectionLabel);
  if (!scope) return design;
  const primary = scope.split(',')[0]!.trim();
  let extra = design.extraCss;
  extra = extra.replace(/\bbody\s*\{/gi, `${primary} {`);
  extra = extra.replace(/\.rby-section\b/g, primary);
  return { ...design, extraCss: `/* Scoped to ${sectionLabel} */\n${extra}` };
}
