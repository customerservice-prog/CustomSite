# CURSOR TASK: Rebuild `lib/siteTemplates.js` With Premium Templates

**Goal:** Soul Vault / Cestui-tier starter sites for every major service niche  
**Project:** CustomSite / Studio Pulse

---

## CURRENT STATE

**File:** `lib/siteTemplates.js`

Today there are a few starters (`basic`, `business`, `ecommerce`, `portfolio`, `restaurant`). The `basic` pack is minimal (system fonts, purple hero, stub copy). Quality gap vs hand-built editorial sites is large.

---

## CUSTOMSITE REALITY CHECK (implementers must read)

Backend **`getTemplateFiles(templateId)`** must return an object whose keys become **`site_files` paths**:

- **`index.html`**
- **`styles.css`**
- **`app.js`**

Initialization replaces **`__CS_PROJECT_UUID__`** with the project UUID in **every** string. Contact forms **must** keep:

- `id="cs-contact-form"`
- Server-side wired `fetch('/api/forms/' + pid + '/submit', …)` pattern (same as current templates)

Single-file HTML in this spec belongs in **`index.html`**; move shared layout CSS into **`styles.css`** and scroll/nav JS into **`app.js`**, **or** keep inline `<style>` / `<script>` in `index.html` and ship empty/minimal `styles.css` / `app.js` (preview and deploy must still resolve `styles.css` if linked).

Classic site builder **`js/site-builder/app.js`** hardcodes an **ordered** template list (`openInit`): extend **`TEMPLATE_LABELS`**, **`TEMPLATE_THUMB`**, **`TEMPLATE_SECTIONS`**, **`getTemplateWireframeHtml`**, and the **`order`** array whenever you add template IDs beyond the defaults.

React **Site starter** UX (`site-starter-templates.ts`) is separate from `lib/siteTemplates.js`; align naming if you expose the same starters in both surfaces.

---

## VISUAL DNA — APPLY TO EVERY TEMPLATE

From cestuiquevietrust.com and thesoulvault.org:

### Typography

- Headline font: **Playfair Display** (Google Fonts), preconnect + stylesheet (niche swaps allowed per matrix below).
- Nav / eyebrow: **Space Mono** or tight uppercase body with **letter-spacing: 0.15–0.2em**.
- Body: Inter, Lato, or Open Sans by niche.

### Eyebrows

`font-size: ~0.75rem`, `letter-spacing: 0.25em`, `uppercase`, muted accent color.

### Colors

- Near-black background (not pure `#fff`).
- **1–2 accent colors maximum.**
- Body text off-white (`#f0ece0` range), not pure `#ffffff`.

### Cards

Slightly lighter than page bg; border `accent @ ~20%` opacity; **hover** full accent border + slight `translateY`.

### Layout

- Sticky nav; **darken/blur on scroll**.
- Logo left, links center (desktop), **CTA pill** right.
- Hero **min-height 100vh**, centered or split.
- Sections: `max-width: 1200px`, horizontal padding `2rem`, vertical `5–6rem`, alternating **`--bg`** / **`--bg-alt`**.

### Motion & polish

`html { scroll-behavior: smooth }`, Intersection Observer **count-up** on `.stat-num[data-target]`, transitions **`0.3s ease`**, `prefers-reduced-motion` respected.

---

## SHARED JS (sticky nav + counters)

Use this in **`app.js`** (or inline before `</body>` if you keep monolithic HTML):

```javascript
'use strict';

(function () {
  var nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  var counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length) return;

  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute('data-target'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        if (isNaN(target)) target = 0;
        var current = 0;
        var step = Math.max(1, Math.ceil(target / 60));
        var timer = setInterval(function () {
          current = Math.min(current + step, target);
          el.textContent = current.toLocaleString() + suffix;
          if (current >= target) clearInterval(timer);
        }, 25);
        obs.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(function (c) {
    obs.observe(c);
  });
})();
```

---

## BASE_CSS (paste into each template’s stylesheet or `<style>`)

The following is the **shared foundation**. Each niche then sets **`:root`** variables (`--bg`, `--bg-alt`, `--card-bg`, `--accent`, `--accent-rgb`, `--text`, `--bg-rgb`, `--font-head`, `--font-body`).

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 3rem;
  transition: background 0.4s ease, padding 0.3s ease;
  background: transparent;
}
nav.scrolled {
  background: rgba(var(--bg-rgb), 0.96);
  backdrop-filter: blur(12px);
  padding: 0.85rem 3rem;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.15);
}
.nav-logo {
  font-family: var(--font-head);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: 0.05em;
}
.nav-links {
  display: flex;
  gap: 2.5rem;
  list-style: none;
}
.nav-links a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: color 0.3s;
  opacity: 0.8;
}
.nav-links a:hover { color: var(--accent); opacity: 1; }
.nav-cta {
  background: var(--accent);
  color: var(--bg);
  padding: 0.6rem 1.5rem;
  border-radius: 2px;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  font-weight: 700;
  transition: opacity 0.3s, transform 0.3s;
}
.nav-cta:hover { opacity: 0.85; transform: translateY(-1px); }

.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8rem 2rem 5rem;
  position: relative;
  overflow: hidden;
}
.hero-inner { max-width: 800px; }
.eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.75;
  margin-bottom: 1.25rem;
  display: block;
}
h1 {
  font-family: var(--font-head);
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.1;
  color: var(--accent);
  margin-bottom: 1.5rem;
}
.hero p {
  font-size: 1.15rem;
  opacity: 0.75;
  max-width: 580px;
  margin: 0 auto 2.5rem;
}
.btn-row {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  padding: 0.85rem 2.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: none;
  border-radius: 2px;
  transition: opacity 0.3s, transform 0.3s;
}
.btn-primary:hover { opacity: 0.85; transform: translateY(-2px); }
.btn-ghost {
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.85rem 2.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 700;
  text-decoration: none;
  border-radius: 2px;
  transition: all 0.3s;
  background: transparent;
}
.btn-ghost:hover {
  background: var(--accent);
  color: var(--bg);
  transform: translateY(-2px);
}

section { padding: 6rem 2rem; }
.section-inner { max-width: 1200px; margin: 0 auto; }
.section-alt { background: var(--bg-alt); }
.section-header { text-align: center; margin-bottom: 4rem; }
h2 {
  font-family: var(--font-head);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
h2 span { color: var(--accent); }
.section-sub {
  opacity: 0.65;
  max-width: 560px;
  margin: 1rem auto 0;
  font-size: 1.05rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
}
.stat {
  padding: 2.5rem 2rem;
  text-align: center;
  border-right: 1px solid rgba(var(--accent-rgb), 0.2);
}
.stat:last-child { border-right: none; }
.stat-num {
  font-family: var(--font-head);
  font-size: 2.8rem;
  font-weight: 700;
  color: var(--accent);
  display: block;
  line-height: 1;
}
.stat-label {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.55;
  margin-top: 0.5rem;
  display: block;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}
.card {
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  padding: 2.25rem;
  border-radius: 3px;
  transition: border-color 0.3s, transform 0.3s;
}
.card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
}
.card-icon { font-size: 1.75rem; margin-bottom: 1rem; display: block; }
.card h3 {
  font-family: var(--font-head);
  font-size: 1.2rem;
  color: var(--accent);
  margin-bottom: 0.75rem;
}
.card p { opacity: 0.65; font-size: 0.95rem; line-height: 1.6; }

.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.testimonial {
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
  padding: 2rem;
  border-radius: 0 3px 3px 0;
}
.stars {
  color: var(--accent);
  font-size: 0.9rem;
  letter-spacing: 2px;
  margin-bottom: 1rem;
}
.testimonial blockquote {
  font-style: italic;
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.7;
}
.testimonial cite {
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
}

footer {
  background: var(--bg-alt);
  border-top: 1px solid rgba(var(--accent-rgb), 0.2);
  padding: 3rem 2rem;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 2rem;
}
.footer-brand {
  font-family: var(--font-head);
  font-size: 1.1rem;
  color: var(--accent);
  font-weight: 700;
}
.footer-links {
  display: flex;
  gap: 2rem;
  list-style: none;
}
.footer-links a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
  transition: opacity 0.3s;
}
.footer-links a:hover { opacity: 1; }
.footer-copy {
  opacity: 0.35;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

@media (max-width: 768px) {
  nav { padding: 1rem 1.25rem; }
  nav.scrolled { padding: 0.75rem 1.25rem; }
  .nav-links { display: none; }
  h1 { font-size: 2.4rem; }
  section { padding: 4rem 1.25rem; }
  .footer-inner { flex-direction: column; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

---

## 12 TEMPLATE IDs + NICHE MATRIX

| # | Export key (`TEMPLATES` key) | Headline font | Accent | Mood |
|---|------------------------------|---------------|--------|------|
| 1 | `trades` (or remap `business`) | Oswald | `#f59e0b` | Licensed contractor / HVAC / electrical |
| 2 | `restaurant` | Playfair Display | `#d4a853` | Café / chef-led dining |
| 3 | `law` | Playfair Display | `#c9a84c` | Firm / advocacy |
| 4 | `wellness` | Cormorant Garamond | `#7eb87e` | Spa / holistic clinic |
| 5 | `tech_saas` | Inter | `#818cf8` | Product / SaaS |
| 6 | `real_estate` | Libre Baskerville | `#c9a84c` | Agents / brokerage |
| 7 | `beauty` | Cormorant Garamond | `#d4af8a` | Salon / med-spa lite |
| 8 | `medical` | Playfair Display | `#5ea3a3` | Dental / clinic trust |
| 9 | `fitness` | Oswald | `#f43f5e` | Gym / coaching energy |
| 10 | `editorial` | Playfair Display | `#c9a84c` | Research hub / Soul Vault cousin |
| 11 | `nonprofit` | Playfair Display | `#93c5fd` | Mission / donate CTA |
| 12 | `basic` | Playfair Display | `#c9a84c` | General premium fallback |

Keep legacy ids **`ecommerce`**, **`portfolio`** as aliases or remap their HTML to **`retail`** / **`agency`** visuals so older projects stay valid.

---

## PLACEHOLDER CONTRACT

Replace at init time **or** document for manual edit:

`{{BUSINESS_NAME}}`, `{{CITY}}`, `{{YEAR}}`, `{{HEADLINE}}`, `{{SUBHEADLINE}}`, `{{PHONE}}`, `{{SERVICE_n}}`, `{{TESTIMONIAL_n}}`, menu items, practice areas.

**Optional:** Extend `routes/siteBuilder.js` `site/init` to substitute from `projects.name` / client row when placeholders are detected.

---

## FULL REFERENCE IMPLEMENTATIONS (copy into `siteTemplates.js` structure)

The original briefing included two **complete single-file** HTML implementations:

1. **Trades / service business** — dark charcoal + amber CTAs + stats + services + testimonials + **`cs-contact-form`**.
2. **Restaurant / café** — Playfair + Lato + menu grid + ambient hero (optional muted Unsplash backdrop) + **`cs-contact-form`** in visit section **or** keep one global contact section.

### 3. Law firm (original paste truncated — completed pattern)

Law layout highlights:

- Same nav / hero / stats / testimonials / footer rhythm as trades.
- Middle section: **`#practice`** — vertical list `.practice-area` rows with monospace index (`01`, `02`…) and serif titles.
- CTA microcopy: “Free consultation”.
- Fonts: `:root --font-head: Playfair Display; --font-body: Space Mono` (body mono is editorial; shorten line-length with `max-width` on prose).

Implement by copying **trades** HTML structure, swapping:

- `:root` colors to `#0a0a0a` / `#c9a84c` / `#e8e0d0`,
- Stats to years / wins / jurisdictions / satisfaction,
- Card grid → practice area list + optional “results” strip,
- Nav CTA: “Free consultation”, primary hero button: “Schedule consultation”.

### 4–12 — fast path for Cursor agents

Generate each by **duplicate trades template**, changing only:

- Google Fonts `<link>`
- `:root` variables (table above)
- Nav link labels + CTA wording
- Card titles / stat labels to match niche
- Hero microcopy (“THE TRUTH THEY SUPPRESSED” style eyebrow on **`editorial`**)

**Editorial (#10)** — add `#particles` div with subtle CSS radial-gradient dots animation (`@keyframes drift`) behind hero split layout.

---

## CONTACT FORM SNIPPET (must appear in each `index.html`)

Match existing working pattern:

```html
<form id="cs-contact-form">
  <!-- fields: name, email, message (+ optional phone) -->
  <p id="cs-form-status" aria-live="polite"></p>
</form>
<script>
(function(){
  var pid = '__CS_PROJECT_UUID__';
  /* same fetch POST /api/forms/ as current lib/siteTemplates.js */
})();
</script>
```

---

## QA CHECKLIST

- [ ] `GET /api/admin/site-builder/templates` lists all **12** IDs.
- [ ] Init project with each ID creates **three** rows in `site_files`.
- [ ] Live preview resolves fonts (Google not blocked).
- [ ] Forms submit succeed with `multipart`/`json` parity to today’s backend.
- [ ] Keyboard / focus rings visible on dark bg.
- [ ] Reduced-motion disables count-up churn.

---

## FILES TO TOUCH

| File | Change |
|------|--------|
| `lib/siteTemplates.js` | Replace `TEMPLATES` with premium packs |
| `js/site-builder/app.js` | Labels, thumbnails, wireframes, `openInit` order |
| `src/lib/site-builder/archetypes.ts` | Map new ids → archetypes if used |
| (optional) `routes/siteBuilder.js` | Substitute placeholders from DB on init |

---

*End of spec. Original briefing paste was truncated mid–law template; this document completes integration requirements and finishing guidance for Cursor.*
