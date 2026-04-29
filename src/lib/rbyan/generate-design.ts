import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';

export type RbyanDesignPack = {
  themeLabel: string;
  /** Injected between markers in CSS for replaceable design passes. */
  rootCss: string;
  layoutStyle: 'split-hero' | 'centered' | 'minimal';
  sectionDensity: 'compact' | 'normal' | 'airy';
  extraCss: string;
};

const MARKER_START = '/* RBYAN_DESIGN_LAYER_START */';
const MARKER_END = '/* RBYAN_DESIGN_LAYER_END */';

export function stripDesignLayer(css: string): string {
  const re = new RegExp(
    `${MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  return css.replace(re, '').trim();
}

export function wrapDesignLayer(inner: string): string {
  return `${MARKER_START}\n${inner.trim()}\n${MARKER_END}\n`;
}

/** Step 6: layout + token decisions from the plan (mock; LLM can output tokens). */
export function generateDesign(plan: RbyanBuildPlan): RbyanDesignPack {
  const { spacing, typography, theme } = plan.style;
  const airy = spacing === 'large';
  const tight = spacing === 'compact';
  const boldType = typography === 'bold' || typography === 'editorial';
  const dark = /dark/i.test(theme);

  const sectionY = airy ? 'clamp(4.5rem, 9vw, 7.5rem)' : tight ? 'clamp(2.5rem, 5vw, 3.5rem)' : 'clamp(3.5rem, 7vw, 6rem)';
  const gap = airy ? 'var(--rby-space-5)' : tight ? 'var(--rby-space-3)' : 'var(--rby-space-4)';
  const h1Scale = boldType ? 'clamp(2.5rem, 5.5vw, 4rem)' : 'clamp(2.1rem, 4.5vw, 3.35rem)';

  const palette = dark
    ? `:root {
  --rby-primary: #6366f1;
  --rby-accent: #a78bfa;
  --rby-bg: #0c0b10;
  --rby-bg-elevated: #14141a;
  --rby-text: #fafafa;
  --rby-text-muted: #a1a1aa;
  --rby-border: rgba(255,255,255,0.1);
}`
    : `:root {
  --rby-primary: #4f46e5;
  --rby-accent: #7c3aed;
  --rby-bg: #fafaf9;
  --rby-bg-elevated: #ffffff;
  --rby-text: #18181b;
  --rby-text-muted: #52525b;
  --rby-border: #e4e4e7;
}`;

  const extraCss = `
.rby-section, section.rby-section { padding-top: ${sectionY} !important; padding-bottom: ${sectionY} !important; }
.rby-grid, .rby-grid--tight { gap: ${gap} !important; }
h1 { font-size: ${h1Scale} !important; }
${dark ? `body { background: var(--rby-bg) !important; color: var(--rby-text) !important; }
.rby-card, .rby-bundle, .rby-product, .price-card { background: var(--rby-bg-elevated) !important; color: var(--rby-text) !important; border-color: var(--rby-border) !important; }
.rby-lead { color: var(--rby-text-muted) !important; }
.site-footer { background: #050506 !important; }` : ''}
${typography === 'editorial' ? `h1, h2 { font-family: var(--rby-font-serif) !important; }` : ''}
`;

  const layoutStyle: RbyanDesignPack['layoutStyle'] =
    plan.siteArchetype === 'landing' || plan.siteArchetype === 'agency' ? 'centered' : 'split-hero';

  return {
    themeLabel: theme,
    rootCss: palette,
    layoutStyle,
    sectionDensity: airy ? 'airy' : tight ? 'compact' : 'normal',
    extraCss,
  };
}

export function mergeDesignIntoCss(css: string, design: RbyanDesignPack): string {
  const core = `${design.rootCss}\n${design.extraCss}`;
  const without = stripDesignLayer(css);
  return `${wrapDesignLayer(core)}\n${without}`;
}
