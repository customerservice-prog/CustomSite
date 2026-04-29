import type { SitePageDefinition, SiteSection } from '@/lib/site-production/types';

/** Core marketing pages — matches what clients expect to see in publishing. */
export const AGENCY_SITE_PAGES: SitePageDefinition[] = [
  { path: '/', name: 'Home', publishState: 'in_progress', updatedLabel: 'Apr 26' },
  { path: '/services.html', name: 'Services', publishState: 'in_progress', updatedLabel: 'Apr 25' },
  { path: '/about.html', name: 'About', publishState: 'draft', updatedLabel: 'Apr 23' },
  { path: '/contact.html', name: 'Contact', publishState: 'published', updatedLabel: 'Apr 18' },
];

export function createDefaultSections(pagePath: string, pageTitle: string): SiteSection[] {
  const isHome = pagePath === '/' || pagePath === '/index.html';
  if (isHome) {
    return [
      {
        id: 'sec-hero',
        kind: 'hero',
        order: 0,
        visible: true,
        layout: 'full',
        headline: 'Stop leaking leads on the page',
        body: 'Traffic without a clear next step quietly bleeds revenue. Tighten the story, proof, and CTA so visitors become conversations.',
        ctaLabel: 'Book a conversion call',
        ctaUrl: '#contact',
      },
      {
        id: 'sec-proof',
        kind: 'proof',
        order: 1,
        visible: true,
        layout: 'narrow',
        headline: 'Proof clients can feel fast',
        body: 'Outcomes, timelines, and fees belong above the fold — not buried under clever copy nobody reads.',
        ctaLabel: 'See case notes',
        ctaUrl: '#cases',
      },
      {
        id: 'sec-cta',
        kind: 'cta',
        order: 2,
        visible: true,
        layout: 'full',
        headline: 'Ready to ship a clearer site?',
        body: 'Pick a launch window. We diagnose leaks first, then rebuild the path so buyers act.',
        ctaLabel: 'Start with audit',
        ctaUrl: '#audit',
      },
    ];
  }
  return [
    {
      id: `sec-${pageTitle}-hero`,
      kind: 'hero',
      order: 0,
      visible: true,
      layout: 'full',
      headline: pageTitle,
      body: `This section drives the ${pageTitle} page. Edit copy on the right — preview updates in the center.`,
      ctaLabel: 'Primary action',
      ctaUrl: '#',
    },
    {
      id: `sec-${pageTitle}-body`,
      kind: 'text',
      order: 1,
      visible: true,
      layout: 'narrow',
      headline: 'Supporting story',
      body: 'Use this block for process, pricing context, or objections. Toggle visibility if the client should not see it yet.',
      ctaLabel: '',
      ctaUrl: '',
    },
    {
      id: `sec-${pageTitle}-cta`,
      kind: 'cta',
      order: 2,
      visible: true,
      layout: 'full',
      headline: 'One obvious next step',
      body: 'Every page should end with a single action — book, buy, or reply.',
      ctaLabel: 'Contact',
      ctaUrl: '/contact.html',
    },
  ];
}
