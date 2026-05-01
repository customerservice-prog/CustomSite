import type { ProjectSite } from '@/lib/site-builder/project-site-model';
import { newFile } from '@/lib/site-builder/project-site-model';

export type SiteStarterTemplateId =
  | 'restaurant'
  | 'portfolio'
  | 'ecommerce'
  | 'landing'
  | 'services'
  | 'appointments';

export type SiteStarterTemplateMeta = {
  id: SiteStarterTemplateId;
  title: string;
  blurb: string;
};

export const SITE_STARTER_TEMPLATE_LIST: SiteStarterTemplateMeta[] = [
  { id: 'restaurant', title: 'Restaurant', blurb: 'Menu hero, hours, and reservation CTA.' },
  { id: 'portfolio', title: 'Portfolio', blurb: 'Project grid and about strip for creatives.' },
  { id: 'ecommerce', title: 'E‑Commerce', blurb: 'Product spotlight, trust row, checkout CTA.' },
  { id: 'landing', title: 'Landing page', blurb: 'Single long-scroll pitch with social proof.' },
  { id: 'services', title: 'Services business', blurb: 'Three packages, testimonials, contact block.' },
  { id: 'appointments', title: 'Appointment booking', blurb: 'Service intro, calendar-style slots, book CTA.' },
];

function shell(title: string, bodyInner: string, accent: string): ProjectSite['files'] {
  const css = `* { box-sizing: border-box; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #fafafa; }
a { color: ${accent}; font-weight: 600; text-decoration: none; }
a:hover { text-decoration: underline; }
header { padding: 1rem 1.5rem; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
main { max-width: 56rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
footer { text-align: center; padding: 1.5rem; font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; background: #fff; }
.btn { display: inline-block; padding: 0.65rem 1.25rem; border-radius: 0.5rem; background: ${accent}; color: #fff; font-weight: 700; }
`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  ${bodyInner}
  <script src="script.js"></script>
</body>
</html>`;
  const js = `document.querySelectorAll('[data-scroll]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href');
    if (!id || id.charAt(0) !== '#') return;
    var el = document.querySelector(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
  });
});
`;
  return [newFile('index.html', html), newFile('styles.css', css), newFile('script.js', js)];
}

/** Minimal branded starters — swap copy and images later in AI Builder or code. */
export function buildSiteFromStarterTemplate(projectId: string, id: SiteStarterTemplateId): ProjectSite {
  const accent = '#7c3aed';
  const meta = SITE_STARTER_TEMPLATE_LIST.find((t) => t.id === id);
  const title = meta?.title ?? 'Site';

  const blocks: Record<SiteStarterTemplateId, string> = {
    restaurant: `<header><strong>${title}</strong><a class="btn" href="#reserve">Reserve</a></header>
<main>
  <section style="text-align:center;padding:2rem 0">
    <p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:700;letter-spacing:0.12em;color:${accent}">TONIGHT'S MENU</p>
    <h1 style="margin:0 0 1rem;font-size:2rem">Seasonal plates &amp; natural wine</h1>
    <p style="margin:0 auto 1.5rem;max-width:32rem;line-height:1.6;color:#475569">Replace with your cuisine story. Link to menu PDF or DoorDash when ready.</p>
    <a class="btn" data-scroll href="#reserve">View reservations</a>
  </section>
  <section id="reserve" style="margin-top:2.5rem;padding:1.5rem;border-radius:1rem;background:#fff;border:1px solid #e2e8f0">
    <h2 style="margin:0 0 0.5rem">Hours &amp; location</h2>
    <p style="margin:0;color:#64748b">Edit address, hours, and map link here.</p>
  </section>
</main>
<footer>© Your restaurant — starter template</footer>`,
    portfolio: `<header><strong>${title}</strong><a href="#work">Work</a></header>
<main>
  <section style="padding:2rem 0">
    <h1 style="margin:0 0 0.5rem;font-size:2rem">Designer · Photographer · Builder</h1>
    <p style="margin:0 0 1.5rem;color:#475569">One-liner about what you ship. Swap for your disciplines.</p>
  </section>
  <section id="work" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
    <div style="aspect-ratio:4/3;border-radius:0.75rem;background:linear-gradient(135deg,#e9d5ff,#fff);border:1px solid #e9d5ff"></div>
    <div style="aspect-ratio:4/3;border-radius:0.75rem;background:linear-gradient(135deg,#dbeafe,#fff);border:1px solid #bfdbfe"></div>
    <div style="aspect-ratio:4/3;border-radius:0.75rem;background:linear-gradient(135deg,#fef3c7,#fff);border:1px solid #fde68a"></div>
  </section>
</main>
<footer>Portfolio starter — add case studies in Site Builder</footer>`,
    ecommerce: `<header><strong>${title}</strong><a class="btn" href="#shop">Shop</a></header>
<main>
  <section style="display:grid;gap:2rem;grid-template-columns:1fr;align-items:center;padding:2rem 0">
    <div>
      <p style="margin:0 0 0.35rem;font-size:0.75rem;font-weight:700;color:${accent}">FEATURED</p>
      <h1 style="margin:0 0 0.75rem;font-size:1.85rem">Product name goes here</h1>
      <p style="margin:0 0 1rem;line-height:1.6;color:#475569">Short benefit-led description. Hook your payment provider when you go live.</p>
      <span class="btn">Add to cart</span>
    </div>
    <div style="min-height:12rem;border-radius:1rem;background:#f1f5f9;border:1px dashed #94a3b8"></div>
  </section>
</main>
<footer>Shipping &amp; returns copy goes here.</footer>`,
    landing: `<header><strong>${title}</strong><a class="btn" href="#cta">Get started</a></header>
<main>
  <section style="padding:3rem 0;text-align:center">
    <h1 style="margin:0 0 1rem;font-size:clamp(1.75rem,4vw,2.5rem)">One clear promise in a single headline</h1>
    <p style="margin:0 auto 1.5rem;max-width:36rem;color:#475569">Supporting line that explains who it's for. Below: logos or metrics.</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;font-size:0.75rem;font-weight:600;color:#94a3b8;text-transform:uppercase">Logo A · Logo B · Logo C</div>
  </section>
  <section id="cta" style="margin:2rem 0;padding:2rem;border-radius:1rem;background:#0f172a;color:#e2e8f0;text-align:center">
    <h2 style="margin:0 0 0.5rem">Ready?</h2>
    <p style="margin:0 0 1rem;color:#94a3b8">Primary conversion — form embed or calendar link.</p>
    <span class="btn" style="background:#a78bfa">Book a call</span>
  </section>
</main>
<footer>Landing starter template</footer>`,
    services: `<header><strong>${title}</strong><a class="btn" href="#contact">Contact</a></header>
<main>
  <section style="padding:2rem 0">
    <h1 style="margin:0 0 0.5rem">Services that move the needle</h1>
    <p style="margin:0 0 2rem;color:#475569">Positioning line for your agency or consultancy.</p>
    <div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      <div style="padding:1.25rem;border-radius:0.75rem;background:#fff;border:1px solid #e2e8f0"><strong>Starter</strong><p style="margin:0.5rem 0 0;font-size:0.9rem;color:#64748b">Scope &amp; price</p></div>
      <div style="padding:1.25rem;border-radius:0.75rem;background:#fff;border:1px solid #e2e8f0"><strong>Growth</strong><p style="margin:0.5rem 0 0;font-size:0.9rem;color:#64748b">Scope &amp; price</p></div>
      <div style="padding:1.25rem;border-radius:0.75rem;background:#fff;border:1px solid #e2e8f0"><strong>Partner</strong><p style="margin:0.5rem 0 0;font-size:0.9rem;color:#64748b">Scope &amp; price</p></div>
    </div>
  </section>
  <section id="contact" style="padding:1.5rem;border-radius:1rem;background:#faf5ff;border:1px solid #e9d5ff">
    <h2 style="margin:0 0 0.5rem">Contact</h2>
    <p style="margin:0;color:#64748b">Replace with form or Calendly link.</p>
  </section>
</main>
<footer>Services starter</footer>`,
    appointments: `<header><strong>${title}</strong><a class="btn" href="#book">Book</a></header>
<main>
  <section style="padding:2rem 0">
    <h1 style="margin:0 0 0.5rem">Book an appointment</h1>
    <p style="margin:0 0 1.5rem;color:#475569">Hair, health, coaching — describe session types here.</p>
    <div id="book" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;max-width:28rem">
      <div style="padding:0.75rem;text-align:center;border-radius:0.5rem;background:#fff;border:1px solid #e2e8f0;font-size:0.85rem">Mon 9a</div>
      <div style="padding:0.75rem;text-align:center;border-radius:0.5rem;background:#fff;border:1px solid #e2e8f0;font-size:0.85rem">Mon 11a</div>
      <div style="padding:0.75rem;text-align:center;border-radius:0.5rem;background:#fff;border:1px solid #e2e8f0;font-size:0.85rem">Tue 2p</div>
    </div>
    <p style="margin-top:1rem;font-size:0.85rem;color:#64748b">Wire to your real scheduler in production.</p>
  </section>
</main>
<footer>Booking starter</footer>`,
  };

  const files = shell(`${title} — starter`, blocks[id], accent);
  return { projectId, files };
}
