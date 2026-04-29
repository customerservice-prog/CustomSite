import { concatRbyanStyles } from '@/lib/rbyan/design-system';
import type { RbyanGeneratedFile } from '@/lib/rbyan/types';

function pack(
  plan: string,
  sections: string[],
  files: RbyanGeneratedFile[],
  versionLabel: string
): { plan: string; sections: string[]; files: RbyanGeneratedFile[]; versionLabel: string } {
  return { plan, sections, files, versionLabel };
}

const THEME_EVENT = `:root {
  --rby-primary: #4f46e5;
  --rby-primary-hover: #4338ca;
  --rby-accent: #7c3aed;
  --rby-bg: #fafaf9;
  --rby-text: #1c1917;
  --rby-text-muted: #57534e;
}`;

const THEME_SERVICE_ORANGE = `:root {
  --rby-primary: #ea580c;
  --rby-primary-hover: #c2410c;
  --rby-accent: #f97316;
  --rby-bg: #f8fafc;
  --rby-text: #0f172a;
  --rby-text-muted: #475569;
}`;

const THEME_AGENCY = `:root {
  --rby-primary: #7c3aed;
  --rby-accent: #a78bfa;
  --rby-bg: #09090b;
  --rby-bg-elevated: #18181b;
  --rby-text: #fafafa;
  --rby-text-muted: #a1a1aa;
  --rby-border: #27272a;
}`;

const THEME_LANDING = `:root {
  --rby-primary: #4f46e5;
  --rby-accent: #6366f1;
  --rby-bg: #ffffff;
  --rby-text: #0f172a;
  --rby-text-muted: #64748b;
}`;

const THEME_SHOP = `:root {
  --rby-primary: #18181b;
  --rby-accent: #16a34a;
  --rby-bg: #fafafa;
  --rby-text: #18181b;
  --rby-text-muted: #525252;
}`;

export function buildEventFurniturePack(brand: string, projectName: string) {
  const shortBrand = brand.split(' ')[0] ?? 'Rent';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} — Event furniture rentals</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header site-header--dark">
    <div class="rby-container site-header__inner">
      <a class="site-logo" href="#" style="color:#fafafa">${shortBrand}</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#categories">Categories</a>
        <a href="#bundles">Bundles</a>
        <a href="#trust">Why us</a>
        <a href="#testimonials">Reviews</a>
        <a href="#cta" class="btn btn--ghost btn--sm">Get a quote</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="rby-hero-event" aria-labelledby="hero-heading">
      <div class="rby-container">
        <div class="rby-hero-grid">
          <div class="rby-hero-copy">
            <span class="rby-eyebrow">${projectName}</span>
            <h1 id="hero-heading">Event furniture that makes your setup effortless</h1>
            <p class="rby-lead" style="color:#d4d4d8">Browse tables, chairs, and bundles designed for events, venues, and rentals—delivered on your timeline.</p>
            <div class="rby-hero-actions">
              <a href="#categories" class="btn btn--primary">Shop collection</a>
              <a href="#trust" class="btn btn--secondary" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.25);color:#fafafa">See delivery zones</a>
            </div>
            <div class="rby-hero-stats" role="list">
              <div class="rby-stat" role="listitem"><strong>48h</strong><span>Rush staging</span></div>
              <div class="rby-stat" role="listitem"><strong>500+</strong><span>Events supplied</span></div>
              <div class="rby-stat" role="listitem"><strong>4.9</strong><span>Client rating</span></div>
            </div>
          </div>
          <aside class="rby-hero-panel" aria-label="Highlights">
            <p class="rby-hero-panel__kicker">This week</p>
            <p class="rby-hero-panel__title">Gala-ready lounge sets</p>
            <p class="rby-hero-panel__text">Velvet sofas, modular bars, and lighting packages that photograph beautifully.</p>
          </aside>
        </div>
      </div>
    </section>

    <section class="rby-section rby-trust" id="trust" aria-label="Trusted by">
      <div class="rby-container rby-trust-inner">
        <p class="rby-trust-label">Trusted by teams at</p>
        <div class="rby-trust-row">
          <span>Northwind Events</span>
          <span>Harbor Hotels</span>
          <span>Summit Conferences</span>
          <span>Urban Venues Co.</span>
        </div>
      </div>
    </section>

    <section class="rby-section" id="categories" style="background:var(--rby-bg-elevated)">
      <div class="rby-container">
        <h2>Shop by category</h2>
        <p class="rby-lead">Curated inventory that ships ready to style—so your floor plan comes together faster.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <article class="rby-card">
            <h3>Dining sets</h3>
            <p>Round tables, banquet seating, and linens-ready surfaces for seated dinners.</p>
            <a href="#cta" class="rby-text-link">View range</a>
          </article>
          <article class="rby-card">
            <h3>Lounge &amp; bars</h3>
            <p>Velvet sofas, modular bars, and accent lighting for cocktail hours and VIP areas.</p>
            <a href="#cta" class="rby-text-link">View range</a>
          </article>
          <article class="rby-card">
            <h3>Ceremony</h3>
            <p>Archways, aisle seating, and weather-safe canopies for outdoor vows.</p>
            <a href="#cta" class="rby-text-link">View range</a>
          </article>
        </div>
      </div>
    </section>

    <section class="rby-section" id="bundles" style="background:var(--rby-bg)">
      <div class="rby-container">
        <h2>Popular bundles</h2>
        <p class="rby-lead">Fixed packages with clear line items—upgrade tiers when headcount or complexity grows.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <article class="rby-bundle">
            <h3>Wedding core</h3>
            <p class="rby-price">From $2,400</p>
            <ul class="rby-list"><li>120 chairs</li><li>15 rounds + linens</li><li>Head table styling</li></ul>
            <a class="btn btn--secondary" href="#cta" style="width:100%">Configure bundle</a>
          </article>
          <article class="rby-bundle rby-bundle--featured">
            <span class="rby-bundle__badge">Most popular</span>
            <h3>Corporate gala</h3>
            <p class="rby-price">From $5,800</p>
            <ul class="rby-list"><li>Stage + backdrop</li><li>Bar + glassware</li><li>Lounge vignettes</li></ul>
            <a class="btn btn--primary" href="#cta" style="width:100%">Configure bundle</a>
          </article>
          <article class="rby-bundle">
            <h3>Outdoor soirée</h3>
            <p class="rby-price">From $3,200</p>
            <ul class="rby-list"><li>Weather-rated tents</li><li>Festoon lighting</li><li>Heat &amp; cooling</li></ul>
            <a class="btn btn--secondary" href="#cta" style="width:100%">Configure bundle</a>
          </article>
        </div>
      </div>
    </section>

    <section class="rby-section testimonials" id="testimonials" style="background:var(--rby-bg-elevated)">
      <div class="rby-container">
        <h2>Clients say it best</h2>
        <p class="rby-lead">Real feedback from planners who care about load-in windows and photo-ready rooms.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">“Flawless install—our ballroom looked like a magazine spread, and teardown stayed on schedule.”</blockquote>
            <figcaption><strong>Jamie Rivera</strong><span>Event Director, Harbor Hotels</span></figcaption>
          </figure>
          <figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">“Inventory arrived pristine. The crew navigated union rules and our tight dock without drama.”</blockquote>
            <figcaption><strong>Priya Menon</strong><span>General Manager, Summit Conference Center</span></figcaption>
          </figure>
          <figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">“We changed headcount twice. They re-quoted same-day and held alternates—huge for us.”</blockquote>
            <figcaption><strong>Alex Dunn</strong><span>Ops Lead, Northwind Events</span></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="rby-section rby-cta-block" id="cta" aria-labelledby="cta-heading">
      <div class="rby-container rby-cta-inner">
        <h2 id="cta-heading">Ready for your next event?</h2>
        <p>Share headcount, date, and venue—we’ll return a line-item quote within one business day.</p>
        <a class="btn btn--primary btn--lg" href="mailto:hello@example.com">Email ${shortBrand}</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="rby-container site-footer__grid">
      <div class="site-footer__col">
        <strong>${brand}</strong>
        <p style="margin:0;color:inherit;max-width:none">Premium rental furnishings for weddings, galas, and corporate programs.</p>
      </div>
      <div class="site-footer__col">
        <strong>Contact</strong>
        <p style="margin:0;max-width:none"><a href="mailto:hello@example.com">hello@example.com</a><br /><a href="tel:+18005551234">(800) 555-1234</a></p>
      </div>
      <div class="site-footer__col">
        <strong>Service area</strong>
        <p style="margin:0;max-width:none">Metro Northeast · Mid-Atlantic · Chicago hub</p>
      </div>
    </div>
    <div class="rby-container site-footer__bottom">
      © ${new Date().getFullYear()} ${brand} · ${projectName}
    </div>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

  const layoutCss = `
.btn--sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
.rby-text-link { font-weight: 600; font-size: 0.875rem; color: var(--rby-accent); text-decoration: none; transition: opacity 0.2s ease; }
.rby-text-link:hover { opacity: 0.85; }
.rby-list { margin: 0 0 var(--rby-space-4); padding-left: 1.15rem; color: var(--rby-text-muted); line-height: 1.55; }
.rby-hero-event {
  padding: var(--rby-space-10) 0 var(--rby-space-8);
  background: radial-gradient(1000px 480px at 12% -8%, rgba(124, 58, 237, 0.45), transparent),
    linear-gradient(145deg, #0c0a09 0%, #1e1b4b 42%, #0c4a6e 100%);
  color: var(--rby-text-on-dark);
}
.rby-hero-event .rby-lead { color: #d4d4d8 !important; }
.rby-hero-event h1 { color: #fafafa; }
.rby-hero-grid {
  display: grid;
  gap: var(--rby-space-6);
  align-items: center;
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .rby-hero-grid { grid-template-columns: 1.15fr 0.85fr; }
}
.rby-hero-actions { display: flex; flex-wrap: wrap; gap: var(--rby-space-2); margin: var(--rby-space-4) 0 var(--rby-space-5); }
.rby-hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--rby-space-2);
  max-width: 26rem;
}
.rby-stat {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--rby-radius-lg);
  padding: var(--rby-space-3);
  transition: var(--rby-transition);
}
.rby-stat:hover { background: rgba(255, 255, 255, 0.1); }
.rby-stat strong { display: block; font-size: 1.35rem; color: #fff; }
.rby-stat span { font-size: 0.75rem; color: #d4d4d4; }
.rby-hero-panel {
  border-radius: var(--rby-radius-xl);
  padding: var(--rby-space-5);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--rby-shadow-xl);
}
.rby-hero-panel__kicker { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.12em; color: #a5b4fc; margin: 0 0 var(--rby-space-1); font-weight: 600; }
.rby-hero-panel__title { font-size: 1.25rem; font-weight: 700; margin: 0 0 var(--rby-space-2); color: #fafafa; }
.rby-hero-panel__text { margin: 0; font-size: 0.9rem; line-height: 1.55; color: #d4d4d8; max-width: none; }
.rby-trust { background: var(--rby-bg-elevated); border-block: 1px solid var(--rby-border); text-align: center; padding-top: var(--rby-space-4) !important; padding-bottom: var(--rby-space-4) !important; }
.rby-trust-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--rby-text-muted); margin: 0 0 var(--rby-space-2); font-weight: 600; }
.rby-trust-row { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--rby-space-3) var(--rby-space-5); font-weight: 600; color: var(--rby-text); font-size: 0.9rem; }
.rby-quote-block figcaption strong { display: block; color: var(--rby-text); margin-bottom: 0.2rem; }
.rby-quote-block figcaption span { font-size: 0.8125rem; color: var(--rby-text-muted); }
.rby-cta-block {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  color: #eef2ff;
  text-align: center;
}
.rby-cta-inner { max-width: 40rem; margin: 0 auto; }
.rby-cta-block h2 { color: #fafafa; }
.rby-cta-block p { margin-left: auto; margin-right: auto; color: #c7d2fe; max-width: 36rem; }
@media (max-width: 768px) {
  .rby-hero-stats { grid-template-columns: 1fr; max-width: 100%; }
}
`;

  const css = concatRbyanStyles(THEME_EVENT, layoutCss);
  const js = `document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")?.slice(1);
    const el = id && document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});
`;

  return pack(
    `Design a premium, conversion-led storefront for ${brand} under project “${projectName}”: split hero, trust strip, category grid, highlighted bundles, testimonial cards, and a decisive CTA band.`,
    ['Navigation', 'Hero', 'Trust', 'Categories', 'Bundles', 'Testimonials', 'CTA', 'Footer'],
    [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      { name: 'script.js', type: 'js', content: js },
    ],
    'Event furniture e-commerce'
  );
}

export function buildRoofingPack(brand: string, projectName: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} — ${projectName}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="rby-container site-header__inner">
      <a class="site-logo" href="#">${brand}</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#services">Services</a>
        <a href="#proof">Why us</a>
        <a href="#reviews">Reviews</a>
        <a href="#lead" class="btn btn--primary btn--sm">Free inspection</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="rby-hero-service" aria-labelledby="roof-h1">
      <div class="rby-container rby-hero-service__inner">
        <div>
          <span class="rby-eyebrow" style="color:#fdba74">${projectName}</span>
          <h1 id="roof-h1">Storm-ready roofs. Clean crews. Honest quotes.</h1>
          <p class="rby-lead" style="color:#e2e8f0;max-width:34rem">Residential and commercial replacement with same-week assessments, insurance-friendly documentation, and workmanship you can stand behind.</p>
          <div class="rby-hero-actions">
            <a class="btn btn--primary" href="#lead">Schedule today</a>
            <a class="btn btn--secondary" href="tel:+18005557891" style="background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.35);color:#fff">Call now</a>
          </div>
        </div>
      </div>
    </section>

    <section class="rby-section" id="services" style="background:var(--rby-bg-elevated)">
      <div class="rby-container">
        <h2>How we protect your home</h2>
        <p class="rby-lead">Three pillars every homeowner should demand from a roofing partner.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <article class="rby-card">
            <h3>Shingle &amp; metal</h3>
            <p>Architectural shingles, standing seam, and impact-rated systems matched to your climate zone.</p>
          </article>
          <article class="rby-card">
            <h3>Warranty-backed</h3>
            <p>Manufacturer coverage plus workmanship protection you can transfer when you sell.</p>
          </article>
          <article class="rby-card">
            <h3>Insurance help</h3>
            <p>Photo documentation, adjuster meetings, and clear scopes so nothing gets missed in the claim.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="rby-section" id="proof" style="background:var(--rby-bg)">
      <div class="rby-container rby-grid rby-grid--tight">
        <div class="rby-card" style="text-align:center">
          <p class="rby-price" style="margin:0;font-size:2rem;color:var(--rby-primary)">15+</p>
          <p style="margin:0;max-width:none;font-weight:600">Years in business</p>
        </div>
        <div class="rby-card" style="text-align:center">
          <p class="rby-price" style="margin:0;font-size:2rem;color:var(--rby-primary)">2.4k</p>
          <p style="margin:0;max-width:none;font-weight:600">Roofs completed</p>
        </div>
        <div class="rby-card" style="text-align:center">
          <p class="rby-price" style="margin:0;font-size:2rem;color:var(--rby-primary)">4.9★</p>
          <p style="margin:0;max-width:none;font-weight:600">Google rating</p>
        </div>
      </div>
    </section>

    <section class="rby-section" id="reviews" style="background:var(--rby-bg-elevated)">
      <div class="rby-container">
        <h2>Neighbors trust our crews</h2>
        <div class="rby-grid" style="margin-top:var(--rby-space-4)">
          <figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">“They showed up on time, protected the landscaping, and the roof looks incredible.”</blockquote>
            <figcaption><strong>Marcus Cole</strong><span>Homeowner, Oakridge</span></figcaption>
          </figure>
          <figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">“Insurance was a headache—they handled the adjuster and kept us informed daily.”</blockquote>
            <figcaption><strong>Elena Voss</strong><span>Property manager, Lakeside HOA</span></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="rby-section rby-lead-band" id="lead">
      <div class="rby-container rby-lead-band__inner">
        <h2>Book a free roof check</h2>
        <p class="rby-lead" style="margin-left:auto;margin-right:auto">Tell us your address and concern—we’ll confirm a two-hour arrival window.</p>
        <a class="btn btn--primary btn--lg" href="mailto:roofing@example.com">Email the crew</a>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="rby-container site-footer__grid">
      <div class="site-footer__col">
        <strong>${brand}</strong>
        <p style="margin:0;max-width:none">Licensed · Insured · Manufacturer-certified installers.</p>
      </div>
      <div class="site-footer__col">
        <strong>Hours</strong>
        <p style="margin:0;max-width:none">Mon–Sat 7am–7pm<br />Emergency tarping available</p>
      </div>
      <div class="site-footer__col">
        <strong>Links</strong>
        <p style="margin:0;max-width:none"><a href="#services">Services</a> · <a href="#lead">Book</a></p>
      </div>
    </div>
    <div class="rby-container site-footer__bottom">© ${new Date().getFullYear()} ${brand}</div>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

  const layoutCss = `
.btn--sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
.rby-hero-service {
  padding: var(--rby-space-10) 0 var(--rby-space-8);
  background: linear-gradient(120deg, #0f172a 0%, #1e3a5f 55%, #0f172a 100%);
  color: #fff;
}
.rby-hero-service h1 { color: #fff; }
.rby-hero-service__inner { max-width: 48rem; }
.rby-hero-actions { display: flex; flex-wrap: wrap; gap: var(--rby-space-2); margin-top: var(--rby-space-4); }
.rby-quote-block figcaption strong { display: block; color: var(--rby-text); margin-bottom: 0.2rem; }
.rby-quote-block figcaption span { font-size: 0.8125rem; color: var(--rby-text-muted); }
.rby-lead-band {
  text-align: center;
  background: linear-gradient(180deg, #fff7ed, #fff);
  border-top: 1px solid var(--rby-border);
}
.rby-lead-band__inner { max-width: 36rem; margin: 0 auto; }
.rby-lead-band .btn--primary {
  background: linear-gradient(135deg, var(--rby-accent), var(--rby-primary));
  box-shadow: 0 12px 40px rgba(234, 88, 12, 0.35);
}
`;

  const css = concatRbyanStyles(THEME_SERVICE_ORANGE, layoutCss);
  const js = `document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")?.slice(1);
    const el = id && document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});
`;

  return pack(
    `Local lead-gen experience for ${brand}: authoritative hero, proof metrics, testimonial cards, and a single high-intent conversion band.`,
    ['Navigation', 'Hero', 'Services', 'Proof', 'Testimonials', 'Lead CTA', 'Footer'],
    [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      { name: 'script.js', type: 'js', content: js },
    ],
    'Roofing lead-gen'
  );
}

export function buildAgencyPack(brand: string, projectName: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} — Creative studio</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body style="background:var(--rby-bg);color:var(--rby-text)">
  <header class="site-header site-header--dark" style="background:rgba(9,9,11,0.92);border-color:#27272a">
    <div class="rby-container site-header__inner">
      <a class="site-logo" href="#" style="color:#fafafa;font-family:var(--rby-font-serif)">${brand}</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#work">Work</a>
        <a href="#process">Process</a>
        <a href="#contact" class="btn btn--primary btn--sm">Start a project</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="rby-section rby-agency-hero" aria-labelledby="ag-h1">
      <div class="rby-container">
        <span class="rby-eyebrow">${projectName}</span>
        <h1 id="ag-h1" style="font-family:var(--rby-font-serif);font-size:clamp(2.5rem,5vw,3.75rem)">Design systems that ship—and convert.</h1>
        <p class="rby-lead" style="color:var(--rby-text-muted);max-width:38rem">Brand, product UI, and campaigns for teams who want craft without bottlenecks. Senior designers embedded in your roadmap.</p>
        <div class="rby-hero-actions">
          <a href="#contact" class="btn btn--primary">Book a discovery call</a>
          <a href="#work" class="btn btn--ghost" style="border-color:#3f3f46;color:#e4e4e7">View selected work</a>
        </div>
      </div>
    </section>

    <section class="rby-section" id="work" style="border-top:1px solid var(--rby-border)">
      <div class="rby-container">
        <h2>Selected work</h2>
        <p class="rby-lead">Recent launches—each with a measurable lift in activation or pipeline.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <article class="rby-work-tile">
            <div class="rby-work-tile__media" aria-hidden="true"></div>
            <h3>Fintech onboarding</h3>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0">+22% completion in six weeks.</p>
          </article>
          <article class="rby-work-tile">
            <div class="rby-work-tile__media" aria-hidden="true"></div>
            <h3>B2B SaaS rebrand</h3>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0">Unified story across web + product.</p>
          </article>
          <article class="rby-work-tile">
            <div class="rby-work-tile__media" aria-hidden="true"></div>
            <h3>Commerce flagship</h3>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0">Editorial grid + performance budget.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="rby-section" id="process" style="background:var(--rby-bg-elevated);border-block:1px solid var(--rby-border)">
      <div class="rby-container rby-grid rby-grid--tight">
        <div>
          <h3 style="margin-top:0">01 — Diagnose</h3>
          <p class="rby-lead" style="font-size:0.95rem">Audit IA, visual debt, and analytics gaps in week one.</p>
        </div>
        <div>
          <h3 style="margin-top:0">02 — Design</h3>
          <p class="rby-lead" style="font-size:0.95rem">Figma systems + dev-ready tokens. No throwaway comps.</p>
        </div>
        <div>
          <h3 style="margin-top:0">03 — Deliver</h3>
          <p class="rby-lead" style="font-size:0.95rem">Embed with your team until launch—and handoff docs that stick.</p>
        </div>
      </div>
    </section>

    <section class="rby-section rby-agency-cta" id="contact">
      <div class="rby-container" style="text-align:center">
        <h2>Let’s build the next version</h2>
        <p class="rby-lead" style="margin-left:auto;margin-right:auto">studio@example.com · New business openings for Q3.</p>
        <a class="btn btn--primary btn--lg" href="mailto:studio@example.com">Email ${brand}</a>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="rby-container site-footer__bottom" style="border:0;padding-top:0">
      © ${new Date().getFullYear()} ${brand} · ${projectName}
    </div>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

  const layoutCss = `
.rby-agency-hero {
  padding-top: var(--rby-space-10);
  background: radial-gradient(700px 380px at 20% 0%, rgba(76, 29, 149, 0.5), transparent);
}
.rby-agency-hero h1 { color: #fafafa; }
.rby-hero-actions { display: flex; flex-wrap: wrap; gap: var(--rby-space-2); margin-top: var(--rby-space-4); }
.rby-work-tile { transition: var(--rby-transition); }
.rby-work-tile:hover { transform: translateY(-4px); }
.rby-work-tile__media {
  aspect-ratio: 4 / 3;
  border-radius: var(--rby-radius-lg);
  background: linear-gradient(145deg, #27272a, #18181b);
  border: 1px solid #3f3f46;
  margin-bottom: var(--rby-space-2);
  box-shadow: var(--rby-shadow-md);
}
.rby-work-tile h3 { margin: 0 0 var(--rby-space-1); font-size: 1.05rem; color: #fafafa; }
.rby-agency-cta .btn--primary { box-shadow: 0 14px 48px rgba(124, 58, 237, 0.4); }
`;

  const css = concatRbyanStyles(THEME_AGENCY, layoutCss);
  const js = `console.log("${brand} — studio");`;

  return pack(
    `Editorial agency experience for ${brand}: dark canvas, serif display, case tiles with outcomes, process strip, and a focused contact CTA.`,
    ['Navigation', 'Hero', 'Work', 'Process', 'CTA', 'Footer'],
    [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      { name: 'script.js', type: 'js', content: js },
    ],
    'Agency portfolio'
  );
}

export function buildLandingPack(brand: string, projectName: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${projectName} — ${brand}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="rby-container site-header__inner">
      <a class="site-logo" href="#">${brand}</a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#proof">Why us</a>
        <a href="#go" class="btn btn--primary btn--sm">Get started</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="rby-landing-hero" aria-labelledby="ld-h1">
      <div class="rby-container rby-landing-hero__grid">
        <div>
          <p class="rby-eyebrow">${projectName}</p>
          <h1 id="ld-h1">Launch a landing page that actually converts</h1>
          <p class="rby-lead">One scroll, one story, one action—built for speed tests, paid traffic, and handoff to your dev team.</p>
          <div class="rby-hero-actions">
            <a class="btn btn--primary btn--lg" href="#go">Start your build</a>
            <a class="btn btn--secondary" href="#proof">See why teams switch</a>
          </div>
        </div>
        <aside class="rby-landing-card" aria-label="Summary">
          <ul class="rby-landing-list">
            <li><strong>Ship in days</strong><span>Structured sections + real copy patterns</span></li>
            <li><strong>On-brand</strong><span>Design tokens you can extend in code</span></li>
            <li><strong>Handoff-ready</strong><span>Semantic HTML + organized CSS</span></li>
          </ul>
        </aside>
      </div>
    </section>

    <section class="rby-section" id="proof" style="background:var(--rby-bg-elevated);border-top:1px solid var(--rby-border)">
      <div class="rby-container">
        <h2>Why teams switch</h2>
        <div class="rby-grid" style="margin-top:var(--rby-space-4)">
          <article class="rby-card"><h3>Clarity</h3><p style="margin:0;font-size:0.9rem">Headlines and CTAs tuned for skimming—not jargon walls.</p></article>
          <article class="rby-card"><h3>Speed</h3><p style="margin:0;font-size:0.9rem">Responsive defaults so you are not fixing mobile at the last minute.</p></article>
          <article class="rby-card"><h3>Ownership</h3><p style="margin:0;font-size:0.9rem">Clean structure you can extend without fighting the markup.</p></article>
        </div>
      </div>
    </section>

    <section class="rby-section rby-landing-cta" id="go">
      <div class="rby-container" style="text-align:center;max-width:32rem;margin:0 auto">
        <h2>Ready when you are</h2>
        <p class="rby-lead" style="margin-left:auto;margin-right:auto">Tell us your offer and audience—we’ll shape the narrative and CTA.</p>
        <a class="btn btn--primary btn--lg" href="mailto:hello@example.com">Email ${brand}</a>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="rby-container site-footer__grid">
      <div class="site-footer__col"><strong>Contact</strong><p style="margin:0;max-width:none"><a href="mailto:hello@example.com">hello@example.com</a></p></div>
      <div class="site-footer__col"><strong>Legal</strong><p style="margin:0;max-width:none"><a href="#">Privacy</a> · <a href="#">Terms</a></p></div>
    </div>
    <div class="rby-container site-footer__bottom">© ${new Date().getFullYear()} ${brand}</div>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

  const layoutCss = `
.btn--sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
.rby-landing-hero {
  padding: var(--rby-space-10) 0 var(--rby-space-8);
  background: linear-gradient(185deg, #eef2ff 0%, #ffffff 45%, #f8fafc 100%);
}
.rby-landing-hero__grid {
  display: grid;
  gap: var(--rby-space-6);
  align-items: start;
  grid-template-columns: 1fr;
}
@media (min-width: 880px) {
  .rby-landing-hero__grid { grid-template-columns: 1.1fr 0.9fr; }
}
.rby-hero-actions { display: flex; flex-wrap: wrap; gap: var(--rby-space-2); margin-top: var(--rby-space-4); }
.rby-landing-card {
  background: var(--rby-bg-elevated);
  border-radius: var(--rby-radius-xl);
  border: 1px solid var(--rby-border);
  padding: var(--rby-space-4);
  box-shadow: var(--rby-shadow-lg);
}
.rby-landing-list { list-style: none; margin: 0; padding: 0; }
.rby-landing-list li {
  padding: var(--rby-space-3) 0;
  border-bottom: 1px solid var(--rby-border);
  display: grid;
  gap: 0.25rem;
}
.rby-landing-list li:last-child { border-bottom: 0; }
.rby-landing-list strong { font-size: 0.95rem; color: var(--rby-text); }
.rby-landing-list span { font-size: 0.8125rem; color: var(--rby-text-muted); }
.rby-landing-cta { background: #f1f5f9; border-top: 1px solid var(--rby-border); }
`;

  const css = concatRbyanStyles(THEME_LANDING, layoutCss);
  const js = `document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")?.slice(1);
    const el = id && document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});
`;

  return pack(
    `High-converting single-page layout for ${brand}: hero + supporting panel, proof cards, and one primary conversion block.`,
    ['Navigation', 'Hero', 'Proof', 'CTA', 'Footer'],
    [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      { name: 'script.js', type: 'js', content: js },
    ],
    'Landing page'
  );
}

export function buildDefaultEcommercePack(brand: string, projectName: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} — Shop</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header site-header--dark" style="background:#0a0a0a;border-color:#27272a">
    <div class="rby-container site-header__inner">
      <a class="site-logo" href="#" style="color:#fafafa">${brand}</a>
      <nav class="site-nav" aria-label="Primary">
        <span style="font-size:0.8125rem;color:#a3a3a3">${projectName}</span>
        <a href="#shop">Shop</a>
        <a href="#stories">Stories</a>
        <a href="#cart" class="btn btn--primary btn--sm">View cart</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="rby-section rby-shop-hero" aria-labelledby="shop-h1">
      <div class="rby-container">
        <h1 id="shop-h1">Build a storefront that feels intentional</h1>
        <p class="rby-lead" style="max-width:40rem">Responsive product grid, crisp typography hierarchy, and checkout-ready buttons—tuned for real customers, not wireframes.</p>
        <a href="#shop" class="btn btn--primary btn--lg" style="margin-top:var(--rby-space-2)">Browse the collection</a>
      </div>
    </section>

    <section class="rby-section" id="shop" style="background:var(--rby-bg-elevated);border-top:1px solid var(--rby-border)">
      <div class="rby-container">
        <h2>This week’s picks</h2>
        <p class="rby-lead">Three hero SKUs with pricing, microcopy, and add-to-cart affordances.</p>
        <div class="rby-grid" style="margin-top:var(--rby-space-5)">
          <article class="rby-product">
            <div class="rby-product__img" aria-hidden="true"></div>
            <h3>Signature carry</h3>
            <p class="rby-product__price">$128</p>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0 0 var(--rby-space-3)">Everyday silhouette, premium materials, ships in 24h.</p>
            <button type="button" class="btn btn--primary" style="width:100%;border:0;cursor:pointer">Add to cart</button>
          </article>
          <article class="rby-product">
            <div class="rby-product__img" aria-hidden="true"></div>
            <h3>Bundle saver</h3>
            <p class="rby-product__price">$240</p>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0 0 var(--rby-space-3)">Matched set—save when you buy core + accessory together.</p>
            <button type="button" class="btn btn--primary" style="width:100%;border:0;cursor:pointer">Add to cart</button>
          </article>
          <article class="rby-product">
            <div class="rby-product__img" aria-hidden="true"></div>
            <h3>Limited drop</h3>
            <p class="rby-product__price">$89</p>
            <p style="font-size:0.875rem;color:var(--rby-text-muted);margin:0 0 var(--rby-space-3)">Small batch—when it sells out, the waitlist opens automatically.</p>
            <button type="button" class="btn btn--secondary" style="width:100%;cursor:pointer">Join waitlist</button>
          </article>
        </div>
      </div>
    </section>

    <section class="rby-section" id="stories">
      <div class="rby-container rby-grid rby-grid--tight">
        <figure class="rby-card rby-quote-block">
          <blockquote class="rby-quote">“Checkout felt as polished as the product photography—our bounce rate dropped immediately.”</blockquote>
          <figcaption><strong>Riley Park</strong><span>Founder, Northline Goods</span></figcaption>
        </figure>
        <figure class="rby-card rby-quote-block">
          <blockquote class="rby-quote">“We wired Stripe on a Friday and were taking real orders Monday morning.”</blockquote>
          <figcaption><strong>Jordan Lee</strong><span>Head of E-commerce, Alloy Supply</span></figcaption>
        </figure>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="rby-container site-footer__grid">
      <div class="site-footer__col"><strong>Shop</strong><p style="margin:0;max-width:none"><a href="#shop">All products</a> · <a href="#">Shipping</a></p></div>
      <div class="site-footer__col"><strong>Support</strong><p style="margin:0;max-width:none"><a href="mailto:support@example.com">support@example.com</a></p></div>
    </div>
    <div class="rby-container site-footer__bottom">© ${new Date().getFullYear()} ${brand}</div>
  </footer>
  <script src="script.js"></script>
</body>
</html>`;

  const layoutCss = `
.btn--sm { padding: 0.5rem 1rem; font-size: 0.8125rem; }
.rby-shop-hero { padding-top: var(--rby-space-8); background: linear-gradient(180deg, #fafafa, #fff); }
.rby-product {
  background: var(--rby-bg-elevated);
  border: 1px solid var(--rby-border);
  border-radius: var(--rby-radius-xl);
  padding: var(--rby-space-3);
  box-shadow: var(--rby-shadow-md);
  transition: var(--rby-transition);
}
.rby-product:hover { transform: translateY(-4px); box-shadow: var(--rby-shadow-xl); }
.rby-product__img {
  height: 10rem;
  border-radius: var(--rby-radius-md);
  background: linear-gradient(120deg, #e4e4e7, #fafafa);
  margin-bottom: var(--rby-space-2);
}
.rby-product h3 { margin: 0 0 var(--rby-space-1); font-size: 1.05rem; }
.rby-product__price { font-size: 1.35rem; font-weight: 800; color: var(--rby-accent); margin: 0 0 var(--rby-space-1); }
#stories .rby-quote-block figcaption strong { display: block; color: var(--rby-text); margin-bottom: 0.2rem; }
#stories .rby-quote-block figcaption span { font-size: 0.8125rem; color: var(--rby-text-muted); }
#stories .rby-quote-block .rby-quote { color: var(--rby-text); }
`;

  const css = concatRbyanStyles(THEME_SHOP, layoutCss);
  const js = `document.querySelectorAll(".rby-product button").forEach((b) =>
  b.addEventListener("click", () => alert("Cart is a demo — connect Stripe next."))
);
`;

  return pack(
    `Modern commerce homepage for ${brand}: bold header, editorial hero, product cards with hover, and social proof before a structured footer.`,
    ['Navigation', 'Hero', 'Products', 'Testimonials', 'Footer'],
    [
      { name: 'index.html', type: 'html', content: html },
      { name: 'styles.css', type: 'css', content: css },
      { name: 'script.js', type: 'js', content: js },
    ],
    'E-commerce homepage'
  );
}
