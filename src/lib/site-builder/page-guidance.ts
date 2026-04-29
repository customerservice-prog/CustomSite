import type { SiteArchetype } from '@/lib/site-builder/archetypes';

/** Plain-language purpose line for the editor chrome (non-technical). */
export function pageGuidanceFor(path: string, pageName: string, archetype: SiteArchetype): string {
  const p = path.toLowerCase();
  if (p === 'index.html') {
    switch (archetype) {
      case 'ecommerce':
        return 'This page should move shoppers from first impression to checkout: proof, bundles, and one obvious primary action.';
      case 'landing':
        return 'This page should turn a cold visitor into one next step — one offer, one story, one CTA.';
      case 'agency':
        return 'This page should win the next engagement: proof, process, and a confident ask — no portfolio wall.';
      default:
        return 'This page should convert visitors into leads: trust, offer clarity, and a single next step above the fold.';
    }
  }
  if (p.includes('service') || p.includes('product')) {
    return `“${pageName}” explains what you deliver, for whom, and why it is the right choice — so visitors self-qualify before they reach out.`;
  }
  if (p.includes('about')) {
    return `“${pageName}” builds credibility — who you are, why you care, and why clients stick with you.`;
  }
  if (p.includes('contact')) {
    return `“${pageName}” removes friction from reaching you — keep the path short and expectations clear.`;
  }
  return `“${pageName}” should have one clear job in the journey — tighten the headline and CTA so visitors know what to do next.`;
}
