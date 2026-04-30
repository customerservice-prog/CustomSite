/**
 * Bryan the Brain shared design system — prepended to every generated `styles.css`.
 * 8px-based spacing, type scale, buttons, cards, containers, responsive rules.
 */

/** Max content width (px) — centered layouts */
export const RBYAN_CONTAINER_MAX = '75rem'; /* 1200px */

export function getRbyanDesignSystemBase(): string {
  return `/* ——— Bryan the Brain design system ——— */
:root {
  --rby-primary: #4f46e5;
  --rby-primary-hover: #4338ca;
  --rby-secondary: #64748b;
  --rby-secondary-hover: #475569;
  --rby-bg: #fafaf9;
  --rby-bg-elevated: #ffffff;
  --rby-bg-inverse: #0f0f10;
  --rby-text: #18181b;
  --rby-text-muted: #52525b;
  --rby-text-on-dark: #fafafa;
  --rby-text-muted-on-dark: #a1a1aa;
  --rby-accent: #7c3aed;
  --rby-accent-soft: rgba(124, 58, 237, 0.12);
  --rby-border: #e4e4e7;
  --rby-border-strong: #d4d4d8;
  --rby-radius-sm: 0.5rem;
  --rby-radius-md: 0.75rem;
  --rby-radius-lg: 1rem;
  --rby-radius-xl: 1.25rem;
  --rby-radius-pill: 624.9375rem;
  --rby-space-1: 0.5rem;
  --rby-space-2: 1rem;
  --rby-space-3: 1.5rem;
  --rby-space-4: 2rem;
  --rby-space-5: 2.5rem;
  --rby-space-6: 3rem;
  --rby-space-8: 4rem;
  --rby-space-10: 5rem;
  --rby-section-y: clamp(4rem, 7vw, 6.5rem);
  --rby-font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --rby-font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --rby-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --rby-shadow-md: 0 4px 16px rgba(15, 23, 42, 0.08);
  --rby-shadow-lg: 0 12px 40px rgba(15, 23, 42, 0.1);
  --rby-shadow-xl: 0 24px 60px rgba(15, 23, 42, 0.12);
  --rby-transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease, transform 0.2s ease;
}

*, *::before, *::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  font-family: var(--rby-font-sans);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--rby-text);
  background: var(--rby-bg);
}

.rby-container {
  width: 100%;
  max-width: ${RBYAN_CONTAINER_MAX};
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--rby-space-3);
  padding-right: var(--rby-space-3);
}

.rby-section {
  padding-top: var(--rby-section-y);
  padding-bottom: var(--rby-section-y);
}

h1, h2, h3, h4 {
  font-family: var(--rby-font-sans);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: var(--rby-text);
  margin: 0 0 var(--rby-space-2);
}

h1 { font-size: clamp(2.25rem, 4.5vw, 3.5rem); }
h2 { font-size: clamp(1.625rem, 3vw, 2.25rem); }
h3 { font-size: clamp(1.125rem, 2vw, 1.35rem); }
h4 { font-size: 1.0625rem; }

p {
  margin: 0 0 var(--rby-space-2);
  max-width: 42rem;
}

p:last-child { margin-bottom: 0; }

.rby-lead {
  font-size: clamp(1.0625rem, 2vw, 1.2rem);
  line-height: 1.65;
  color: var(--rby-text-muted);
  max-width: 36rem;
}

.rby-eyebrow {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rby-accent);
  margin-bottom: var(--rby-space-2);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--rby-space-1);
  padding: 0.75rem 1.375rem;
  font-family: var(--rby-font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  border-radius: var(--rby-radius-pill);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--rby-transition);
}

.btn:focus-visible {
  outline: 2px solid var(--rby-primary);
  outline-offset: 2px;
}

.btn--primary {
  color: #fff;
  background: linear-gradient(135deg, var(--rby-accent), var(--rby-primary));
  box-shadow: 0 10px 36px rgba(79, 70, 229, 0.35);
}

.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 44px rgba(79, 70, 229, 0.42);
}

.btn--secondary {
  color: var(--rby-text);
  background: var(--rby-bg-elevated);
  border-color: var(--rby-border-strong);
  box-shadow: var(--rby-shadow-sm);
}

.btn--secondary:hover {
  border-color: var(--rby-primary);
  color: var(--rby-primary);
  transform: translateY(-1px);
}

.btn--ghost {
  color: inherit;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.35);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.08);
}

.btn--lg {
  padding: 0.9375rem 1.75rem;
  font-size: 1rem;
}

/* Cards */
.rby-card {
  background: var(--rby-bg-elevated);
  border: 1px solid var(--rby-border);
  border-radius: var(--rby-radius-lg);
  padding: var(--rby-space-4);
  box-shadow: var(--rby-shadow-md);
  transition: var(--rby-transition);
}

.rby-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--rby-shadow-lg);
  border-color: var(--rby-border-strong);
}

.rby-card h3 { margin-bottom: var(--rby-space-1); }

/* Grids */
.rby-grid {
  display: grid;
  gap: var(--rby-space-4);
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
}

.rby-grid--tight {
  gap: var(--rby-space-3);
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}

/* Site chrome */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 250, 249, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--rby-border);
}

.site-header--dark {
  background: rgba(15, 15, 16, 0.9);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--rby-space-3);
  min-height: 4rem;
}

.site-logo {
  font-weight: 800;
  font-size: 1.0625rem;
  letter-spacing: -0.03em;
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.site-logo:hover { opacity: 0.85; }

.site-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rby-space-1) var(--rby-space-3);
}

.site-nav a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--rby-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.site-nav a:hover { color: var(--rby-text); }

.site-header--dark .site-nav a {
  color: var(--rby-text-muted-on-dark);
}

.site-header--dark .site-nav a:hover {
  color: var(--rby-text-on-dark);
}

.site-footer {
  padding: var(--rby-space-8) var(--rby-space-3) var(--rby-space-4);
  background: var(--rby-bg-inverse);
  color: var(--rby-text-muted-on-dark);
  font-size: 0.875rem;
}

.site-footer a {
  color: var(--rby-text-on-dark);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.site-footer a:hover { opacity: 0.8; }

.site-footer__grid {
  display: grid;
  gap: var(--rby-space-4);
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  margin-bottom: var(--rby-space-6);
}

.site-footer__col strong {
  display: block;
  color: var(--rby-text-on-dark);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: var(--rby-space-2);
}

.site-footer__bottom {
  padding-top: var(--rby-space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

/* Testimonial cards */
.rby-quote {
  margin: 0;
  font-style: normal;
  line-height: 1.55;
}

.rby-quote cite {
  display: block;
  margin-top: var(--rby-space-2);
  font-size: 0.8125rem;
  font-style: normal;
  color: var(--rby-text-muted);
}

/* Bundle / pricing */
.rby-bundle {
  position: relative;
  background: var(--rby-bg-elevated);
  border: 1px solid var(--rby-border);
  border-radius: var(--rby-radius-xl);
  padding: var(--rby-space-5);
  box-shadow: var(--rby-shadow-md);
  transition: var(--rby-transition);
}

.rby-bundle:hover {
  transform: translateY(-4px);
  box-shadow: var(--rby-shadow-xl);
}

.rby-bundle--featured {
  border-color: #c4b5fd;
  box-shadow: 0 20px 50px rgba(124, 58, 237, 0.18);
}

.rby-bundle__badge {
  position: absolute;
  top: var(--rby-space-3);
  right: var(--rby-space-3);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.25rem 0.625rem;
  border-radius: var(--rby-radius-pill);
  background: var(--rby-accent-soft);
  color: var(--rby-accent);
}

.rby-price {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--rby-accent);
  margin: 0 0 var(--rby-space-2);
}

/* Responsive */
@media (max-width: 1024px) {
  h1 { font-size: clamp(2rem, 4vw, 2.85rem); }
  .rby-section { padding-top: clamp(3rem, 6vw, 4.5rem); padding-bottom: clamp(3rem, 6vw, 4.5rem); }
}

@media (max-width: 768px) {
  .rby-container { padding-left: var(--rby-space-2); padding-right: var(--rby-space-2); }
  h1 { font-size: clamp(1.85rem, 6vw, 2.5rem); }
  h2 { font-size: clamp(1.35rem, 5vw, 1.85rem); }
  .rby-grid, .rby-grid--tight {
    grid-template-columns: 1fr;
  }
  .site-header__inner { flex-wrap: wrap; min-height: 3.5rem; }
  .site-nav { width: 100%; justify-content: flex-start; }
}
`;
}

/** Concatenate design system + theme overrides + page-specific layout CSS */
export function concatRbyanStyles(themeOverrides: string, layoutCss: string): string {
  return `${getRbyanDesignSystemBase()}
${themeOverrides.trim()}
${layoutCss.trim()}
`;
}
