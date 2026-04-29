import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';

/** Slot-based copy — drives HTML assembly / targeted replacements. */
export type RbyanCopyPack = {
  heroHeadline: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trustLabel: string;
  trustNames: string[];
  categoryTitle: string;
  categoryLead: string;
  categories: { title: string; body: string; link: string }[];
  bundlesTitle: string;
  bundles: { title: string; price: string; bullets: string[]; featured?: boolean; badge?: string }[];
  testimonialsTitle: string;
  testimonialsLead: string;
  testimonials: { quote: string; name: string; role: string }[];
  ctaTitle: string;
  ctaBody: string;
  ctaEmailLabel: string;
  heroPanelKicker: string;
  heroPanelTitle: string;
  heroPanelBody: string;
};

export type CopyContext = {
  brand: string;
  projectName: string;
};

function shortBrand(brand: string) {
  return brand.split(/\s+/)[0] ?? brand;
}

/** Step 5: benefit-led copy derived from the build plan (mock writer; LLM can replace). */
export function generateCopy(plan: RbyanBuildPlan, ctx: CopyContext): RbyanCopyPack {
  const { brand, projectName } = ctx;
  const sb = shortBrand(brand);
  const premium = /premium|luxury|dark premium/i.test(plan.style.theme);
  const bold = plan.style.typography === 'bold';

  if (plan.siteArchetype === 'event_rental') {
    return {
      heroHeadline: premium
        ? 'Event furniture that makes your setup feel effortless'
        : 'Event furniture that makes your setup effortless',
      heroSub: bold
        ? `${sb} supplies tables, chairs, lounges, and bars for weddings, galas, and corporate programs—with staging that respects your load-in window.`
        : `Browse tables, chairs, and bundles designed for events, venues, and rentals. ${projectName} keeps installs on schedule and photo-ready.`,
      ctaPrimary: 'Shop collection',
      ctaSecondary: 'See delivery zones',
      trustLabel: 'Trusted by teams at',
      trustNames: ['Northwind Events', 'Harbor Hotels', 'Summit Conferences', 'Urban Venues Co.'],
      categoryTitle: 'Shop by category',
      categoryLead: 'Curated inventory that ships ready to style—so your floor plan comes together faster.',
      categories: [
        { title: 'Dining sets', body: 'Round tables, banquet seating, and linens-ready surfaces for seated dinners.', link: 'View range' },
        { title: 'Lounge & bars', body: 'Velvet sofas, modular bars, and accent lighting for cocktail hours and VIP areas.', link: 'View range' },
        { title: 'Ceremony', body: 'Archways, aisle seating, and weather-safe canopies for outdoor vows.', link: 'View range' },
      ],
      bundlesTitle: 'Popular bundles',
      bundles: [
        { title: 'Wedding core', price: 'From $2,400', bullets: ['120 chairs', '15 rounds + linens', 'Head table styling'] },
        {
          title: 'Corporate gala',
          price: 'From $5,800',
          bullets: ['Stage + backdrop', 'Bar + glassware', 'Lounge vignettes'],
          featured: true,
          badge: 'Most popular',
        },
        { title: 'Outdoor soirée', price: 'From $3,200', bullets: ['Weather-rated tents', 'Festoon lighting', 'Heat & cooling'] },
      ],
      testimonialsTitle: 'Clients say it best',
      testimonialsLead: 'Real feedback from planners who care about load-in windows and photo-ready rooms.',
      testimonials: [
        {
          quote: 'Flawless install—our ballroom looked like a magazine spread, and teardown stayed on schedule.',
          name: 'Jamie Rivera',
          role: 'Event Director, Harbor Hotels',
        },
        {
          quote: 'Inventory arrived pristine. The crew navigated union rules and our tight dock without drama.',
          name: 'Priya Menon',
          role: 'General Manager, Summit Conference Center',
        },
        {
          quote: 'We changed headcount twice. They re-quoted same-day and held alternates—huge for us.',
          name: 'Alex Dunn',
          role: 'Ops Lead, Northwind Events',
        },
      ],
      ctaTitle: 'Ready for your next event?',
      ctaBody: 'Share headcount, date, and venue—we’ll return a line-item quote within one business day.',
      ctaEmailLabel: `Email ${sb}`,
      heroPanelKicker: 'This week',
      heroPanelTitle: 'Gala-ready lounge sets',
      heroPanelBody: 'Velvet sofas, modular bars, and lighting packages that photograph beautifully.',
    };
  }

  if (plan.siteArchetype === 'service_local') {
    return {
      heroHeadline: 'Storm-ready roofs. Clean crews. Honest quotes.',
      heroSub: 'Residential and commercial replacement with same-week assessments, insurance-friendly documentation, and workmanship you can stand behind.',
      ctaPrimary: 'Schedule today',
      ctaSecondary: 'Call now',
      trustLabel: 'Trusted locally',
      trustNames: ['Licensed', 'Insured', 'Certified installers'],
      categoryTitle: 'How we protect your home',
      categoryLead: 'Three pillars every homeowner should demand from a roofing partner.',
      categories: [
        { title: 'Shingle & metal', body: 'Architectural shingles, standing seam, and impact-rated systems matched to your climate zone.', link: 'Learn more' },
        { title: 'Warranty-backed', body: 'Manufacturer coverage plus workmanship protection you can transfer when you sell.', link: 'Learn more' },
        { title: 'Insurance help', body: 'Photo documentation, adjuster meetings, and clear scopes so nothing gets missed in the claim.', link: 'Learn more' },
      ],
      bundlesTitle: 'Why homeowners choose us',
      bundles: [
        { title: 'Fast assessment', price: 'Free', bullets: ['Two-hour window', 'Written findings', 'Photo report'] },
        { title: 'Full replacement', price: 'Quoted', bullets: ['Tear-off + install', 'Cleanup included', 'Final walkthrough'], featured: true, badge: 'Most booked' },
        { title: 'Emergency tarp', price: 'Priority', bullets: ['Same-day when available', 'Stabilize leaks', 'Plan next steps'] },
      ],
      testimonialsTitle: 'Neighbors trust our crews',
      testimonialsLead: 'Recent homeowners and managers—no fluff, just outcomes.',
      testimonials: [
        {
          quote: 'They showed up on time, protected the landscaping, and the roof looks incredible.',
          name: 'Marcus Cole',
          role: 'Homeowner, Oakridge',
        },
        {
          quote: 'Insurance was a headache—they handled the adjuster and kept us informed daily.',
          name: 'Elena Voss',
          role: 'Property manager, Lakeside HOA',
        },
      ],
      ctaTitle: 'Book a free roof check',
      ctaBody: 'Tell us your address and concern—we’ll confirm a two-hour arrival window.',
      ctaEmailLabel: 'Email the crew',
      heroPanelKicker: projectName,
      heroPanelTitle: 'Same-week assessments',
      heroPanelBody: 'We document damage clearly and give you options—not pressure.',
    };
  }

  if (plan.siteArchetype === 'agency') {
    return {
      heroHeadline: 'Design systems that ship—and convert.',
      heroSub: 'Brand, product UI, and campaigns for teams who want craft without bottlenecks. Senior designers embedded in your roadmap.',
      ctaPrimary: 'Book a discovery call',
      ctaSecondary: 'View selected work',
      trustLabel: 'Selected partners',
      trustNames: ['Series B SaaS', 'Fintech', 'Commerce'],
      categoryTitle: 'Selected work',
      categoryLead: 'Recent launches—each with a measurable lift in activation or pipeline.',
      categories: [
        { title: 'Fintech onboarding', body: '+22% completion in six weeks.', link: 'Case study' },
        { title: 'B2B SaaS rebrand', body: 'Unified story across web + product.', link: 'Case study' },
        { title: 'Commerce flagship', body: 'Editorial grid + performance budget.', link: 'Case study' },
      ],
      bundlesTitle: 'How we work',
      bundles: [
        { title: '01 — Diagnose', price: 'Week 1', bullets: ['IA + analytics audit', 'Visual debt map', 'Stakeholder sync'] },
        { title: '02 — Design', price: 'Weeks 2–5', bullets: ['Figma systems', 'Dev-ready tokens', 'Crit loops'], featured: true, badge: 'Core' },
        { title: '03 — Deliver', price: 'Launch', bullets: ['Embed with eng', 'QA polish', 'Handoff docs'] },
      ],
      testimonialsTitle: 'Teams we embed with',
      testimonialsLead: 'Direct quotes from operators who care about velocity and taste.',
      testimonials: [
        { quote: 'They speak product and marketing fluently—rare in a studio.', name: 'Nina Park', role: 'VP Marketing, Alloy' },
      ],
      ctaTitle: 'Let’s build the next version',
      ctaBody: 'studio@example.com · New business openings for Q3.',
      ctaEmailLabel: `Email ${sb}`,
      heroPanelKicker: projectName,
      heroPanelTitle: 'Embedded senior designers',
      heroPanelBody: 'Weekly design ops inside your tools—not throwaway decks.',
    };
  }

  if (plan.siteArchetype === 'landing') {
    return {
      heroHeadline: 'Launch a landing page that actually converts',
      heroSub: 'One scroll, one story, one action—built for speed tests, paid traffic, and handoff to your dev team.',
      ctaPrimary: 'Start your build',
      ctaSecondary: 'See why teams switch',
      trustLabel: 'Why teams switch',
      trustNames: ['Clarity', 'Speed', 'Ownership'],
      categoryTitle: 'Why teams switch',
      categoryLead: 'Three principles baked into the layout—not bolted on later.',
      categories: [
        { title: 'Clarity', body: 'Headlines and CTAs tuned for skimming—not jargon walls.', link: '' },
        { title: 'Speed', body: 'Responsive defaults so you are not fixing mobile at the last minute.', link: '' },
        { title: 'Ownership', body: 'Clean structure you can extend without fighting the markup.', link: '' },
      ],
      bundlesTitle: 'Ready when you are',
      bundles: [{ title: 'Next step', price: 'Free consult', bullets: ['Offer + audience', 'Narrative + CTA', 'Handoff checklist'], featured: true }],
      testimonialsTitle: 'Proof in the process',
      testimonialsLead: 'Short quotes from teams who ship with this pattern.',
      testimonials: [
        { quote: 'We swapped the hero once and saw an immediate lift in demo requests.', name: 'Riley Park', role: 'Growth Lead, Northline' },
      ],
      ctaTitle: 'Ready when you are',
      ctaBody: 'Tell us your offer and audience—we’ll shape the narrative and CTA.',
      ctaEmailLabel: `Email ${sb}`,
      heroPanelKicker: projectName,
      heroPanelTitle: 'Ship in days',
      heroPanelBody: 'Structured sections + real copy patterns you can iterate from.',
    };
  }

  /* ecommerce_general */
  return {
    heroHeadline: 'Build a storefront that feels intentional',
    heroSub: 'Responsive product grid, crisp typography hierarchy, and checkout-ready buttons—tuned for real customers, not wireframes.',
    ctaPrimary: 'Browse the collection',
    ctaSecondary: 'View stories',
    trustLabel: 'Featured in',
    trustNames: ['Retail Weekly', 'Design Notes', 'Commerce Today'],
    categoryTitle: 'This week’s picks',
    categoryLead: 'Three hero SKUs with pricing, microcopy, and add-to-cart affordances.',
    categories: [
      { title: 'Signature carry', body: 'Everyday silhouette, premium materials, ships in 24h.', link: 'Details' },
      { title: 'Bundle saver', body: 'Matched set—save when you buy core + accessory together.', link: 'Details' },
      { title: 'Limited drop', body: 'Small batch—when it sells out, the waitlist opens automatically.', link: 'Details' },
    ],
    bundlesTitle: 'Shop with confidence',
    bundles: [
      { title: 'Free shipping', price: '$75+', bullets: ['Tracked delivery', 'Easy returns', 'Support chat'] },
      { title: 'Secure checkout', price: '', bullets: ['Stripe-ready', 'Apple Pay', 'Guest checkout'], featured: true, badge: 'Popular' },
      { title: 'Warranty', price: '1 year', bullets: ['Defect coverage', 'Fast exchange', 'US support'] },
    ],
    testimonialsTitle: 'Customers notice the details',
    testimonialsLead: 'Quotes from founders who care about conversion, not just pretty pages.',
    testimonials: [
      {
        quote: 'Checkout felt as polished as the product photography—our bounce rate dropped immediately.',
        name: 'Riley Park',
        role: 'Founder, Northline Goods',
      },
    ],
    ctaTitle: 'Questions before you buy?',
    ctaBody: 'Our team replies within one business day.',
    ctaEmailLabel: 'Contact support',
    heroPanelKicker: 'New',
    heroPanelTitle: 'Editorial grid',
    heroPanelBody: 'Large imagery, tight type hierarchy, and mobile-first spacing.',
  };
}
