/**
 * Outcome-based positioning — agency sells conversion repair, not “websites.”
 * Use these strings in UI, proposals, and client-facing surfaces.
 */

/** Final positioning line — headline promise. */
export const OFFER_STATEMENT =
  'We rebuild underperforming sites into conversion systems that turn visitors into leads and customers.';

/** One-line you say when someone asks what you do. */
export const ELEVATOR_PITCH = 'I fix sites that are not converting — traffic, story, and ask — so you stop leaking revenue.';

/** How the product supports delivery (not the product itself). */
export const DELIVERY_ADVANTAGE =
  'You see every change live as we rebuild — status, preview, and feedback stay in one place so nothing gets lost or delayed.';

/** Four steps clients pay more for when visible. */
export const PROCESS_STEPS = [
  { id: 'diagnose', title: 'Diagnose', body: 'Find where visitors drop and what the ask should be.' },
  { id: 'rebuild', title: 'Rebuild', body: 'Ship a clearer path: proof, offers, CTAs, mobile — tied to revenue.' },
  { id: 'launch', title: 'Launch', body: 'Go live with checks, DNS, and handoff so the funnel stays intact.' },
  { id: 'optimize', title: 'Optimize', body: 'Measure, revise, and tighten until the numbers move.' },
] as const;

/** Risk reversal — reduces hesitation on sales calls. */
export const RISK_REVERSAL =
  'If the site does not feel clearer and stronger after the rebuild, we revise until it does — you are not stuck guessing.';

/** How to talk about price on calls — frame, not a quote. */
export const PRICE_CONFIDENCE_LINE =
  'For a full rebuild like this, most clients land in the $2–3k range. Pause and let them react before you say another number.';

/** After a demo — sequence. */
export const CLOSE_OPEN =
  'I would start by rebuilding your homepage, then roll the same system across the rest of your site.';
export const CLOSE_QUESTION = 'Does that sound like something you want to move forward with?';

/** Before / after framing for pitches and UI. */
export const BEFORE_AFTER = {
  before: ['Confusion on the page', 'Drop-off before the ask', 'No clear next step'],
  after: ['Clarity on the offer', 'Flow toward one action', 'More qualified leads'],
} as const;

export type OfferPackageTier = {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  priceBand: string;
  forWho: string;
  includes: string[];
  outcome: string;
};

/** High-ticket-ready package ladder — edit numbers to match your market. */
export const OFFER_PACKAGES: OfferPackageTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceBand: '$1k–$1.5k',
    forWho: 'Simple businesses that need a fast win on the home page.',
    includes: [
      'Homepage rebuild toward one primary action',
      'Conversion-focused section order',
      'CTA and headline tightening',
      'Mobile pass so the ask works on phones',
    ],
    outcome: 'Clearer message and a stronger first step — fewer visitors bounce before they opt in.',
  },
  {
    id: 'growth',
    name: 'Growth',
    priceBand: '$2k–$3k',
    forWho: 'Teams that need the whole site pulling in the same direction.',
    includes: [
      'Multi-page rebuild with the same conversion spine',
      'Trust + proof + offer blocks wired end-to-end',
      'Messaging pass on key pages',
      'Conversion templates applied sitewide',
    ],
    outcome: 'Consistent path to leads across the full site — not just a prettier homepage.',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceBand: '$3k–$5k+',
    forWho: 'Serious operators who want the site to behave like a lead engine.',
    includes: [
      'Full conversion system (pages + offers + follow-through)',
      'Funnel thinking: entry pages, middle, close',
      'Bundle / offer structure on high-intent pages',
      'Deeper UX on friction points',
      'Post-launch revision window for what you learn live',
    ],
    outcome: 'The site becomes a repeatable lead asset — not a brochure you redo every year.',
  },
];

/** Nav + buttons — avoid “builder” as the product. */
export const CONVERSION_WORKSPACE_LABEL = 'Conversion workspace';

/** Breadcrumb / page title when route is site path. */
export const CONVERSION_WORKSPACE_PAGE_TITLE = 'Conversion workspace';
