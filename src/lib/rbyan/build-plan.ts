/**
 * Structured build plan — mock inference today; an LLM can emit the same JSON shape later.
 */

export type RbyanSiteArchetype =
  | 'event_rental'
  | 'ecommerce_general'
  | 'service_local'
  | 'agency'
  | 'landing';

export type RbyanBuildPlan = {
  goal: string;
  audience: string;
  tone: string;
  pages: string[];
  sections: string[];
  style: {
    theme: string;
    spacing: 'compact' | 'comfortable' | 'large';
    typography: 'standard' | 'bold' | 'editorial';
  };
  siteArchetype: RbyanSiteArchetype;
};

const DEFAULT_SECTIONS = ['Hero', 'Trust', 'Categories', 'Bundles', 'Testimonials', 'CTA', 'Footer'] as const;

function detectArchetype(p: string): RbyanSiteArchetype {
  const t = p.toLowerCase();
  if (/nonprofit|charity|foundation|501\s*c|donate|volunteer|mission-driven|fundraising/i.test(t)) return 'landing';
  if (/saas|b2b\s+software|cloud\s+platform|api\s+product|developer\s+tool|web\s*app|subscription\s+software/i.test(t)) return 'landing';
  if (/roof|gutter|shingle|hvac|plumb|contractor|inspection|local service/i.test(t)) return 'service_local';
  if (/restaurant|cafe|bakery|food\s+truck|brewpub|wine\s+bar|chef|dining room/i.test(t)) return 'service_local';
  if (/book\s+online|appointment|scheduling|salon|spa|clinic|dental|therapy|fitness\s+studio/i.test(t)) return 'service_local';
  if (/agency|portfolio|studio|creative agency|branding studio/i.test(t)) return 'agency';
  if (/landing|single page|one page|lead magnet/i.test(t)) return 'landing';
  if (/furniture|rental|event|chair|table|gala|wedding|venue/i.test(t)) return 'event_rental';
  return 'ecommerce_general';
}

function baseTone(p: string): string {
  if (/premium|luxury|high-end|editorial/i.test(p)) return 'premium, confident';
  if (/playful|bold|youth/i.test(p)) return 'bold, energetic';
  if (/minimal|clean|apple|quiet/i.test(p)) return 'minimal, precise';
  return 'modern, trustworthy';
}

function baseSpacing(p: string): RbyanBuildPlan['style']['spacing'] {
  if (/airy|spacious|breathing|large layout/i.test(p)) return 'large';
  if (/dense|compact|tight/i.test(p)) return 'compact';
  return 'comfortable';
}

function baseTypography(p: string): RbyanBuildPlan['style']['typography'] {
  if (/editorial|magazine|serif/i.test(p)) return 'editorial';
  if (/bold|impact|headline/i.test(p)) return 'bold';
  return 'standard';
}

function baseTheme(p: string): string {
  if (/dark|moody|night/i.test(p)) return 'dark premium';
  if (/minimal|clean/i.test(p)) return 'light minimal';
  if (/premium|luxury/i.test(p)) return 'dark premium';
  return 'light elevated';
}

/** Merge style-changing prompts into an existing plan (smart modifiers). */
export function mergeModifierIntoPlan(plan: RbyanBuildPlan, prompt: string): RbyanBuildPlan {
  const p = prompt.toLowerCase();
  const next = { ...plan, style: { ...plan.style }, pages: [...plan.pages], sections: [...plan.sections] };

  if (/\bpremium|luxury|high-end|upscale|sophisticat/i.test(p)) {
    next.style.theme = 'dark premium';
    next.style.spacing = next.style.spacing === 'compact' ? 'comfortable' : 'large';
    next.style.typography = next.style.typography === 'standard' ? 'bold' : next.style.typography;
    next.tone = [plan.tone, 'more premium'].filter(Boolean).join(' · ');
  }
  if (/\bmodern|contemporary|fresh|2026/i.test(p)) {
    next.style.theme = next.style.theme.includes('dark') ? 'dark modern' : 'light modern';
    next.style.spacing = 'large';
    next.style.typography = next.style.typography === 'editorial' ? next.style.typography : 'bold';
    next.tone = [plan.tone, 'contemporary rhythm'].filter(Boolean).join(' · ');
  }
  if (/\bmobile|phone|small screen/i.test(p)) {
    next.tone = [plan.tone, 'mobile-first polish'].filter(Boolean).join(' · ');
  }
  if (/\bbold|headline|impact/i.test(p)) {
    next.style.typography = 'bold';
  }
  if (/\bminimal|clean|simple/i.test(p) && !/\bpremium|dark/i.test(p)) {
    next.style.theme = 'light minimal';
    next.style.spacing = 'comfortable';
  }

  return next;
}

export type CreateBuildPlanOptions = {
  /** When iterating, merge modifiers into this plan instead of starting cold. */
  previousPlan?: RbyanBuildPlan | null;
  brandHint?: string;
  projectName?: string;
  /** Merged into routing signals with the user prompt (AI Builder niche field). */
  industryNiche?: string | null;
};

/**
 * Step 1–4 of the pipeline: analyze prompt → structured plan (intent-aware heuristics).
 */
export function createBuildPlan(prompt: string, opts: CreateBuildPlanOptions = {}): RbyanBuildPlan {
  const trimmed = prompt.trim();
  const p = trimmed.toLowerCase();
  const niche = (opts.industryNiche ?? '').toLowerCase().trim();
  const combined = `${p} ${niche}`.replace(/\s+/g, ' ').trim();

  if (opts.previousPlan && !/^(build|create|design|generate|make)\b/i.test(trimmed) && trimmed.length < 420) {
    return mergeModifierIntoPlan(opts.previousPlan, trimmed);
  }

  const archetype = detectArchetype(combined);
  const tone = baseTone(combined);
  const spacing = baseSpacing(combined);
  const typography = baseTypography(combined);
  const theme = baseTheme(combined);

  let goal = 'Professional marketing homepage';
  let audience = 'Business buyers and site visitors';

  switch (archetype) {
    case 'event_rental':
      goal = 'E-commerce event furniture rental';
      audience = 'Event planners, venues, and corporate program leads';
      break;
    case 'ecommerce_general':
      goal = 'Product-led e-commerce storefront';
      audience = 'Online shoppers comparing quality and delivery';
      break;
    case 'service_local':
      if (/restaurant|cafe|bakery|food|dining|chef|wine\s+bar/i.test(combined)) {
        goal = 'Restaurant & hospitality presence';
        audience = 'Guests choosing where to dine, reserve, or order';
      } else if (/book|appointment|scheduling|salon|spa|clinic|dental|therapy|fitness/i.test(combined)) {
        goal = 'Appointment-first local service';
        audience = 'Clients booking time online with confidence';
      } else {
        goal = 'Local service lead generation';
        audience = 'Homeowners and property managers in your service area';
      }
      break;
    case 'agency':
      goal = 'Creative agency positioning';
      audience = 'Marketing leaders hiring design and product partners';
      break;
    case 'landing':
      if (/nonprofit|charity|foundation|donate|volunteer|mission|501/i.test(combined)) {
        goal = 'Nonprofit storytelling & conversion';
        audience = 'Donors, volunteers, and community partners';
      } else if (/saas|software|platform|api|trial|signup|b2b|dashboard|integration/i.test(combined)) {
        goal = 'SaaS product marketing';
        audience = 'Buyers evaluating features, onboarding, and security';
      } else {
        goal = 'Single-offer landing conversion';
        audience = 'Cold traffic and retargeting visitors';
      }
      break;
    default:
      break;
  }

  const pages =
    archetype === 'landing'
      ? ['Home']
      : archetype === 'agency'
        ? ['Home', 'Work', 'Contact']
        : ['Home', 'Shop', 'Bundles', 'Contact'];

  const sections = [...DEFAULT_SECTIONS];

  return {
    goal,
    audience,
    tone,
    pages,
    sections,
    style: { theme, spacing, typography },
    siteArchetype: archetype,
  };
}

export function buildPlanToSummaryLines(plan: RbyanBuildPlan): string[] {
  return [
    `Goal: ${plan.goal}`,
    `Audience: ${plan.audience}`,
    `Tone: ${plan.tone}`,
    `Visual system: ${plan.style.theme} · spacing ${plan.style.spacing} · type ${plan.style.typography}`,
    `Pages: ${plan.pages.join(', ')}`,
    `Sections: ${plan.sections.join(' → ')}`,
  ];
}
