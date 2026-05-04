/** Heuristic presets for AI Builder sidebar + Claude spine. Keep RULES aligned with lib/aiBuilder/nicheDesignSystem.js */
export type AiBuilderPresetId =
  | 'cafe_restaurant'
  | 'construction_trades'
  | 'real_estate'
  | 'beauty_salon'
  | 'health_wellness'
  | 'tech_saas'
  | 'law_editorial_research'
  | 'general_premium';

/** Order matters — first regex match wins (mirrors nicheDesignSystem.js). */
const PRESET_RULES: { preset: AiBuilderPresetId; test: RegExp }[] = [
  {
    preset: 'cafe_restaurant',
    test: /\b(café|cafe|coffee\s*shop|coffeehouse|restaurant|bistro|bakery|eatery|deli|brunch|kitchen|wine\s*bar)\b/i,
  },
  {
    preset: 'construction_trades',
    test:
      /\b(roofer|hvac|plumb|electric|contractor|remodel|renovation|handyman|inspector|inspection|gutter|paving|deck\s*builder|flooring\s*installer)\b/i,
  },
  {
    preset: 'real_estate',
    test: /\b(realtor|real\s*estate|brokerage|broker|listings|properties\s*for\s*sale)\b/i,
  },
  {
    preset: 'beauty_salon',
    test: /\b(salon|barber|beauty|hairstylist|nails\s*spa|lashes\b|esthetician)\b/i,
  },
  {
    preset: 'health_wellness',
    test: /\b(spa\b|massage\b|wellness|yoga|meditation|holistic|acupuncture|chiropractor|nutrition\s*coach)\b/i,
  },
  {
    preset: 'tech_saas',
    test: /\b(saas\b|startup|software\b|devtools|api\b|dashboard|cloud\s*platform|app\s+for)\b/i,
  },
  {
    preset: 'law_editorial_research',
    test:
      /\b(soul\s*vault|cestui|que\s*vie|pap(al)?\s*bulls?|classified|suppressed\b|alternative\s*(law|research)|legal\s*research\b|living\s+trust\b|trust\s+fund\b|research\s+hub|independent\s+research\b)\b/i,
  },
];

const SIDEBAR_DEFAULTS: Record<
  AiBuilderPresetId,
  {
    industryNiche: string;
    businessType: string;
    brandPrimary: string;
    brandAccent: string;
    fontVibe: string;
    visualStyle: string;
    voice?: string;
  }
> = {
  cafe_restaurant: {
    industryNiche: 'Neighborhood café • espresso • daytime dining',
    businessType: 'Café / restaurant',
    brandPrimary: '#2C1810',
    brandAccent: '#D4A853',
    fontVibe: 'Playfair Display (headlines) + Lato (body)',
    visualStyle:
      'Warm dark cinematic — terracotta/brown surfaces, muted gold accents, full-bleed hero, eyebrow+kicker typography',
    voice: 'Warm, neighborly, unpretentious; celebrate ritual and locality',
  },
  law_editorial_research: {
    industryNiche: 'Legal / deep research • editorial storytelling',
    businessType: 'Research / editorial',
    brandPrimary: '#0A0A0A',
    brandAccent: '#C9A84C',
    fontVibe: 'Playfair Display (headlines) + Space Mono (labels/eyebrows)',
    visualStyle:
      'Near-black canvas, single restrained gold accent, uppercase tracked nav, monochrome stat bands, serif display hero',
    voice: 'Authoritative, meticulous, calmly urgent — cite-like tone without legalese fluff',
  },
  health_wellness: {
    industryNiche: 'Holistic wellness • restorative care',
    businessType: 'Health / wellness',
    brandPrimary: '#0F1A14',
    brandAccent: '#7EB87E',
    fontVibe: 'Cormorant Garamond (headlines) + Inter (UI/body)',
    visualStyle:
      'Deep forest grounding, sage gradients, serene spacing, luminous soft highlights on CTAs',
    voice: 'Calm expert — gentle reassurance, sensory language',
  },
  tech_saas: {
    industryNiche: 'B2B / product software narrative',
    businessType: 'Technology / SaaS',
    brandPrimary: '#0F0F23',
    brandAccent: '#818CF8',
    fontVibe: 'Inter (UI) + JetBrains Mono (code/KPI eyebrows)',
    visualStyle: 'Dark product UI lattice, monospace micro-labels, indigo accents, subtle mesh gradients via CSS',
    voice: 'Direct, credible, ROI-forward',
  },
  construction_trades: {
    industryNiche: 'Residential / light commercial contracting',
    businessType: 'Construction / trades',
    brandPrimary: '#141414',
    brandAccent: '#F59E0B',
    fontVibe: 'Oswald (headers) + Roboto (body)',
    visualStyle:
      'Charcoal industrial base with safety-amber accents, bold condensed headlines, proof-forward sections',
    voice: 'No-nonsense licensed professional — timelines, warranties, locality',
  },
  beauty_salon: {
    industryNiche: 'Beauty • cuts • color • self-care rituals',
    businessType: 'Salon / beauty',
    brandPrimary: '#120A14',
    brandAccent: '#D4AF8A',
    fontVibe: 'Cormorant Garamond (headlines) + Montserrat (UI)',
    visualStyle: 'Velvet noir palette with rose-gold metallics, intimate luxury, editorial overlays',
    voice: 'Aspirational but inviting — tactile glam',
  },
  real_estate: {
    industryNiche: 'Local listings • buyer/seller advocacy',
    businessType: 'Real estate',
    brandPrimary: '#0D1624',
    brandAccent: '#C9A84C',
    fontVibe: 'Libre Baskerville (headlines) + Open Sans (UI)',
    visualStyle:
      'Urban twilight navy, warm metallic accents, prestige serif hero, skyline-negative space layouts',
    voice: 'Market-savvy concierge — neighborhoods, comps, urgency without hype',
  },
  general_premium: {
    industryNiche: 'Local premium brand — tighten copy per niche',
    businessType: 'Local business',
    brandPrimary: '#0C0C0C',
    brandAccent: '#C9A227',
    fontVibe: 'Playfair Display + DM Sans',
    visualStyle:
      'Dark editorial baseline (avoid sterile white slabs), gold accent restraint, serif hero + uppercase micro-labels',
    voice: 'Confident specialist — specificity over generics',
  },
};

export function detectAiBuilderPresetId(haystack: string): AiBuilderPresetId {
  const h = haystack.toLowerCase();
  for (const r of PRESET_RULES) {
    if (r.test.test(h)) return r.preset;
  }
  if (/\b(law\b|legal\b|attorney|law\s*firm)\b/i.test(h)) return 'law_editorial_research';
  return 'general_premium';
}

export type InferBrandInput = {
  projectName: string;
  /** Client company row if linked */
  clientCompany?: string;
  mergedIndustry?: string;
  mergedBusinessType?: string;
};

export type InferredBrandDefaults = {
  presetId: AiBuilderPresetId;
} & (typeof SIDEBAR_DEFAULTS)['general_premium'];

/**
 * Sidebar + Claude cues when aiBuilder blobs are blank — keyed off names (Soul Vault → dark gold editorial, Nikki Cafe → café).
 */
export function inferAiBuilderBrandDefaults(input: InferBrandInput): InferredBrandDefaults {
  const hay = [input.projectName, input.clientCompany, input.mergedIndustry, input.mergedBusinessType]
    .filter(Boolean)
    .join(' • ');
  const presetId = detectAiBuilderPresetId(hay);
  return { presetId, ...SIDEBAR_DEFAULTS[presetId] };
}
