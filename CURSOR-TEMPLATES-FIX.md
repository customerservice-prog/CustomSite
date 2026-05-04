# CURSOR TASK: Replace `lib/siteTemplates.js` With Premium Quality Templates

**Priority:** HIGH — Every new project starts from a weak template right now  
**Project:** CustomSite / Studio Pulse (Node.js + Express + React admin SPA)

---

## THE PROBLEM IN ONE SENTENCE

Starter packs in `lib/siteTemplates.js` used to ship a thin `basic` shell (stub hero, generic copy, split CSS/JS files). New projects deserved a Soul Vault / Cestui-tier dark editorial baseline instead.

---

## YOUR ONLY JOB IN THIS TASK

Replace the contents of **`lib/siteTemplates.js`** completely so `getTemplateFiles(key)` returns **single-file premium HTML** (`index.html` only) per niche.

Preserve exports: **`TEMPLATES`**, **`TEMPLATE_KEYS`**, **`getTemplateFiles`**.

Legacy template ids **`business`** and **`portfolio`** may alias **`service`** and **`creative`** so existing flows keep working without editing routes or admin.

---

## VISUAL STANDARD

### cestuiquevietrust.com DNA

- Background: `#0a0a0a` (near-black)
- Accent: `#c9a84c` (rich gold) for headlines, borders, hovers, CTAs
- Text: `#e8e0d0` (warm off-white)
- Nav: fixed, all-caps, letter-spacing ~0.18em, transparent → dark + blur on scroll
- Headline: Playfair Display (Google Fonts + preconnect)
- Body: Space Mono (editorial) or Inter/Lato (service)
- Hero: min-height 100vh, eyebrow + large headline + 2 CTAs
- Stat bar: 3–4 cols, gold numbers, count-up via Intersection Observer
- Cards: dark fill, `rgba(accent,0.15)` border, hover gold + `translateY(-4px)`
- Sections: alternate `--bg` / `--bg-alt`
- Footer: dark, gold brand, spaced links

### thesoulvault.org DNA

- Optional split hero (text / visual column)
- Eyebrow + h2 + thin gold divider
- Card icons (unicode)
- All-caps nav with middot (`·`) styling where appropriate
- Optional subtle CSS particle layer in hero

---

## TEMPLATE KEYS

| Key | Use case |
|-----|----------|
| `basic` | Default premium dark |
| `service` | Trades, cleaning, local service |
| `restaurant` | Café, bistro, bar |
| `law` | Attorney, legal |
| `realestate` | Realtor, brokerage |
| `beauty` | Salon, spa |
| `fitness` | Gym, studio, coach |
| `medical` | Clinic, dental, therapy |
| `creative` | Designer, photo, video |
| `ecommerce` | Boutique, product brand |
| `construction` | Contractor, builder |
| `consulting` | Coach, advisor, B2B |

---

## RULES (SUMMARY)

1. One self-contained `index.html`: `<style>` in `<head>`, scripts before `</body>`.
2. Google Fonts: preconnect + stylesheet, `display=swap`.
3. `viewport` meta on every page.
4. Semantic `<nav>`, `<section>`, `<footer>`.
5. Form: `id="cs-contact-form"`, named fields, platform submit script with `__CS_PROJECT_UUID__`.
6. Dark bases only; CSS variables in `:root`.
7. Sticky nav + scroll class; stat count-up; vanilla JS only.

---

## TESTING

1. Admin → project → Site Builder → init with a template key.
2. Confirm fonts, sticky nav, count-up, card hovers, form submit.

---

## WHAT NOT TO CHANGE (when following this doc alone)

- Do not require route or admin changes for the same export shape.

---

*Hand this file to Cursor with: “Read CURSOR-TEMPLATES-FIX.md and rewrite `lib/siteTemplates.js` following it.”*
