'use strict';

/**
 * Visual / typography presets for AI Builder (Claude).
 * Keyword detection + palette guidance — keep agency-grade editorial options available.
 */

const PRESETS = {
  cafe_restaurant: {
    id: 'cafe_restaurant',
    labels: ['Café / restaurant / food'],
    headlineFont: 'Playfair Display',
    accentFont: 'Lato',
    bg: '#1c1410',
    surface: '#2c1810',
    accent: '#d4a853',
    muted: '#e8dcc4',
    vibe: 'Warm, inviting, tactile — parchment tones, edible warmth, never sterile white slabs.',
    sectionExamples: '"Our Menu", "Visit Us", "What regulars say", "Hours & location"',
    navTone: 'Menu · Story · Hours · Visit',
    visualDnaExtras:
      'Consider a subtle coffee or pastry texture overlay at low opacity OR warm gradient bands — no stock-photo collage.',
  },
  law_editorial_research: {
    id: 'law_editorial_research',
    labels: ['Law / deep research / editorial dark-gold'],
    headlineFont: 'Playfair Display',
    accentFont: 'Space Mono',
    bg: '#0a0a0a',
    surface: '#121212',
    accent: '#c9a84c',
    muted: '#a8a29e',
    vibe: 'Cinematic noir editorial: one restrained gold accent on near-black — classified-document luxury.',
    sectionExamples:
      '"The Record", "Core documents", "Video archive", "What this means", "Sources & disclaimers"',
    navTone: 'Use uppercase tracked nav (~0.18em letter-spacing); optional middot separators.',
    visualDnaExtras:
      'Eyebrow kicker labels in monospace; optional slim stat-band (counts as text, not widgets); subtle gold horizontal rules.',
  },
  health_wellness: {
    id: 'health_wellness',
    labels: ['Health / wellness / spa emphasis'],
    headlineFont: 'Cormorant Garamond',
    accentFont: 'Inter',
    bg: '#0f1a14',
    surface: '#1a2e1f',
    accent: '#7eb87e',
    muted: '#d4e4d4',
    vibe: 'Calm organic luxury — sage and deep forest, breathable whitespace, restorative tone.',
    sectionExamples: '"Our approach", "Services", "What clients feel", "Book a session"',
    navTone: 'Services · Approach · Stories · Contact',
    visualDnaExtras: 'Soft botanical suggestion via CSS gradients only — no clipart.',
  },
  tech_saas: {
    id: 'tech_saas',
    labels: ['Tech / SaaS / startup'],
    headlineFont: 'Inter',
    accentFont: 'JetBrains Mono',
    bg: '#0f0f1a',
    surface: '#151528',
    accent: '#818cf8',
    muted: '#a5b4fc',
    vibe: 'Crisp dark product UI energy — monospace for labels and KPIs.',
    sectionExamples: '"Product", "How it works", "Pricing teaser", "Security & FAQ"',
    navTone: 'Product · Pricing · Customers · Docs',
    visualDnaExtras: 'Subtle mesh gradient background via CSS allowed.',
  },
  construction_trades: {
    id: 'construction_trades',
    labels: ['Construction / trades / home services'],
    headlineFont: 'Oswald',
    accentFont: 'Roboto',
    bg: '#141414',
    surface: '#1f1f1f',
    accent: '#f59e0b',
    muted: '#d4d4d4',
    vibe: 'High-contrast industrial trust — amber safety accent on charcoal.',
    sectionExamples: '"Services", "Why homeowners choose us", "Reviews", "Free estimate"',
    navTone: 'Services · Why us · Projects · Reviews · Free estimate',
    visualDnaExtras: '',
  },
  beauty_salon: {
    id: 'beauty_salon',
    labels: ['Beauty / salon'],
    headlineFont: 'Cormorant Garamond',
    accentFont: 'Montserrat',
    bg: '#120a14',
    surface: '#1a0f18',
    accent: '#d4af8a',
    muted: '#ece0e6',
    vibe: 'Velvet noir with rose‑gold metallics — intimate premium.',
    sectionExamples: '"The experience", "Services & pricing teaser", "Stylist picks", "Book"',
    navTone: 'Looks · Services · Visit · Book',
    visualDnaExtras: '',
  },
  real_estate: {
    id: 'real_estate',
    labels: ['Real estate / brokerage'],
    headlineFont: 'Libre Baskerville',
    accentFont: 'Open Sans',
    bg: '#0d1624',
    surface: '#111e2f',
    accent: '#c9a84c',
    muted: '#cbd5e1',
    vibe: 'Skyline seriousness with warm metallic accent.',
    sectionExamples: '"Featured listings teaser", "Neighborhood expertise", "Testimonials", "Contact"',
    navTone: 'Buy · Sell · Lease · About',
    visualDnaExtras: '',
  },
  general_premium: {
    id: 'general_premium',
    labels: ['General local premium (default)'],
    headlineFont: 'Playfair Display',
    accentFont: 'DM Sans',
    bg: '#0c0c0c',
    surface: '#161616',
    accent: '#c9a227',
    muted: '#c4c4c4',
    vibe: 'Default to dark-mode editorial premium — avoids cheap white template look.',
    sectionExamples:
      '"What we offer", "Why us", "Social proof", "Get in touch" — rename to niche-specific headings.',
    navTone: 'Short, descriptive labels anchored to REAL sections — no random contractor CTAs.',
    visualDnaExtras: '',
  },
};

/** Order matters: first match wins (more specific bundles first). */
const RULES = [
  {
    preset: 'cafe_restaurant',
    needles: /\b(café|cafe|coffee\s*shop|coffeehouse|restaurant|bistro|bakery|eatery|deli|brunch|kitchen|wine\s*bar)\b/i,
  },
  {
    preset: 'construction_trades',
    needles:
      /\b(roofer|hvac|plumb|electric|contractor|remodel|renovation|handyman|inspector|inspection|gutter|paving|deck\s*builder|flooring\s*installer)\b/i,
  },
  {
    preset: 'real_estate',
    needles: /\b(realtor|real\s*estate|brokerage|broker|listings|properties\s*for\s*sale)\b/i,
  },
  {
    preset: 'beauty_salon',
    needles: /\b(salon|barber|beauty|hairstylist|nails\s*spa|lashes\b|esthetician)\b/i,
  },
  {
    preset: 'health_wellness',
    needles: /\b(spa\b|massage\b|wellness|yoga|meditation|holistic|acupuncture|chiropractor|nutrition\s*coach)\b/i,
  },
  {
    preset: 'tech_saas',
    needles: /\b(saas\b|startup|software\b|devtools|api\b|dashboard|cloud\s*platform|app\s+for)\b/i,
  },
  {
    preset: 'law_editorial_research',
    needles:
      /\b(soul\s*vault|cestui|que\s*vie|pap(al)?\s*bulls?|classified|suppressed\b|alternative\s*(law|research)|legal\s*research\b|living\s+trust\b|trust\s+fund\b|research\s+hub|independent\s+research\b)\b/i,
  },
];

function detectPresetId(haystack) {
  const h = String(haystack || '').toLowerCase();
  for (const r of RULES) {
    const n = r.needles;
    if (typeof n === 'object' && n.test && n.test(h)) return r.preset;
  }
  if (/\b(law\b|legal\b|attorney|law\s*firm)\b/i.test(h)) return 'law_editorial_research';
  return 'general_premium';
}

function buildGoogleFontsInstruction(p) {
  const h = p.headlineFont.replace(/ /g, '+');
  const a = p.accentFont.replace(/ /g, '+');
  return `Load via two <link> tags (fonts.googleapis.com + fonts.gstatic.com preconnect):\n  - headline: "${p.headlineFont}" (400,600,700 as needed)\n  - accent/body: "${p.accentFont}" (400,500,600 as needed)`;
}

/**
 * @param {{
 *   clientName?: string,
 *   companyName?: string,
 *   businessType?: string,
 *   niche?: string,
 *   prompt?: string,
 *   brandColors?: string,
 *   fontVibe?: string,
 *   visualStyle?: string,
 * }} opts
 */
function resolveDesignGuidance(opts) {
  const haystack = [
    opts.clientName,
    opts.companyName,
    opts.businessType,
    opts.niche,
    opts.prompt,
    opts.visualStyle,
  ]
    .filter(Boolean)
    .join(' • ');

  const presetId = detectPresetId(haystack);
  const p = PRESETS[presetId] || PRESETS.general_premium;

  const fonts = buildGoogleFontsInstruction(p);

  let paletteMandatory = `- Background near "${p.bg}" with surfaces "${p.surface}"; accent "${p.accent}"; muted/supporting text "${p.muted}".`;
  if (String(opts.brandColors || '').trim()) {
    paletteMandatory = `- Honor user brand colors where supplied (${opts.brandColors.trim()}), but KEEP the same typography pairing and editorial structure. Adapt contrast for WCAG AA on body text.\n${paletteMandatory.replace('Background near', 'If user colors clash, prefer user primaries yet keep dark editorial structure; fallback palette anchors: near')}`;
  }

  const userFont = String(opts.fontVibe || '').trim();
  const fontNote = userFont ? `\nTypography note from user (respect if compatible): ${userFont}` : '';

  const block = `
PRESET (${presetId.replace(/_/g, ' ')}): ${p.labels[0]}
${fonts}
${paletteMandatory}
Mood: ${p.vibe}
Section naming examples for this archetype (adapt to the real business — do NOT copy verbatim if irrelevant): ${p.sectionExamples}
Nav flavor: ${p.navTone}${fontNote}

Extra for this archetype: ${p.visualDnaExtras}
`.trim();

  return { presetId, block };
}

module.exports = { PRESETS, detectPresetId, resolveDesignGuidance };
