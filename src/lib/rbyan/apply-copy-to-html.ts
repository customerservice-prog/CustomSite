import type { RbyanSiteArchetype } from '@/lib/rbyan/build-plan';
import type { RbyanCopyPack } from '@/lib/rbyan/generate-copy';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceFirst(html: string, re: RegExp, value: string) {
  return html.replace(re, value);
}

function cardHtml(title: string, body: string, link: string) {
  return `<article class="rby-card"><h3>${esc(title)}</h3><p>${esc(body)}</p><a href="#cta" class="rby-text-link">${esc(link || 'View range')}</a></article>`;
}

function applyEventCopy(out: string, copy: RbyanCopyPack): string {
  out = replaceFirst(
    out,
    /(<section class="rby-section" id="categories"[^>]*>[\s\S]*?<div class="rby-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${copy.categories.map((c) => cardHtml(c.title, c.body, c.link)).join('\n          ')}$3`
  );

  const bundleInner = copy.bundles
    .map((b) => {
      const feat = b.featured ? ' rby-bundle--featured' : '';
      const badge = b.badge ? `<span class="rby-bundle__badge">${esc(b.badge)}</span>` : '';
      const ul = b.bullets.map((li) => `<li>${esc(li)}</li>`).join('');
      const btnClass = b.featured ? 'btn btn--primary' : 'btn btn--secondary';
      return `<article class="rby-bundle${feat}">${badge}<h3>${esc(b.title)}</h3><p class="rby-price">${esc(b.price)}</p><ul class="rby-list">${ul}</ul><a class="${btnClass}" href="#cta" style="width:100%">Configure bundle</a></article>`;
    })
    .join('\n          ');

  out = replaceFirst(
    out,
    /(<section class="rby-section" id="bundles"[^>]*>[\s\S]*?<div class="rby-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${bundleInner}$3`
  );

  /* testimonials figures */
  const figs = copy.testimonials
    .map(
      (t) => `<figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">${esc(t.quote)}</blockquote>
            <figcaption><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></figcaption>
          </figure>`
    )
    .join('\n          ');
  out = replaceFirst(
    out,
    /(<section class="rby-section testimonials"[^>]*>[\s\S]*?<div class="rby-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${figs}$3`
  );

  return out;
}

function applyServiceCopy(out: string, copy: RbyanCopyPack): string {
  out = replaceFirst(
    out,
    /(<section class="rby-section" id="services"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
    `$1${esc(copy.categoryTitle)}$3`
  );
  out = replaceFirst(
    out,
    /(id="services"[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.categoryLead)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-section" id="services"[^>]*>[\s\S]*?<div class="rby-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${copy.categories.map((c) => `<article class="rby-card"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></article>`).join('\n          ')}$3`
  );
  const figs = copy.testimonials
    .map(
      (t) => `<figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">${esc(t.quote)}</blockquote>
            <figcaption><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></figcaption>
          </figure>`
    )
    .join('\n          ');
  out = replaceFirst(
    out,
    /(<section class="rby-section" id="reviews"[^>]*>[\s\S]*?<div class="rby-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    `$1${figs}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-section rby-lead-band"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
    `$1${esc(copy.ctaTitle)}$3`
  );
  out = replaceFirst(
    out,
    /(rby-lead-band[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.ctaBody)}$3`
  );
  return out;
}

/** Step 7 (copy): inject slot copy into generated HTML without rebuilding structure. */
export function applyCopyToHtml(html: string, copy: RbyanCopyPack, archetype: RbyanSiteArchetype): string {
  const h1Ids: Record<RbyanSiteArchetype, string> = {
    event_rental: 'hero-heading',
    ecommerce_general: 'shop-h1',
    service_local: 'roof-h1',
    agency: 'ag-h1',
    landing: 'ld-h1',
  };
  const id = h1Ids[archetype];
  let out = replaceFirst(
    html,
    new RegExp(`(<h1 id="${id}"[^>]*>)([\\s\\S]*?)(<\\/h1>)`, 'i'),
    `$1${esc(copy.heroHeadline)}$3`
  );

  out = replaceFirst(
    out,
    /(<section class="rby-hero-event"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.heroSub)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-hero-service"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.heroSub)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-agency-hero"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.heroSub)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-landing-hero"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.heroSub)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-shop-hero"[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
    `$1${esc(copy.heroSub)}$3`
  );

  out = replaceFirst(
    out,
    /(<div class="rby-hero-actions">\s*<a[^>]*class="btn btn--primary[^"]*"[^>]*>)([^<]+)(<\/a>)/i,
    `$1${esc(copy.ctaPrimary)}$3`
  );
  out = replaceFirst(
    out,
    /(<div class="rby-hero-actions">\s*<a[^>]*class="btn btn--primary[^"]*"[^>]*>[^<]+<\/a>\s*<a[^>]*class="btn btn--secondary[^"]*"[^>]*>)([^<]+)(<\/a>)/i,
    `$1${esc(copy.ctaSecondary)}$3`
  );

  if (archetype === 'event_rental') {
    out = replaceFirst(out, /<p class="rby-trust-label">[^<]*<\/p>/i, `<p class="rby-trust-label">${esc(copy.trustLabel)}</p>`);
    out = replaceFirst(
      out,
      /<div class="rby-trust-row">[\s\S]*?<\/div>/i,
      `<div class="rby-trust-row">${copy.trustNames.map((n) => `<span>${esc(n)}</span>`).join('')}</div>`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="categories"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.categoryTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(id="categories"[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.categoryLead)}$3`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="bundles"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.bundlesTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section testimonials"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.testimonialsTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(class="rby-section testimonials"[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.testimonialsLead)}$3`
    );
    out = replaceFirst(
      out,
      /(<h2 id="cta-heading">)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.ctaTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section rby-cta-block"[^>]*>[\s\S]*?<div class="rby-container rby-cta-inner">[\s\S]*?<p>)([\s\S]*?)(<\/p>\s*<a class="btn btn--primary)/i,
      `$1${esc(copy.ctaBody)}$3`
    );
    out = replaceFirst(
      out,
      /(<a class="btn btn--primary btn--lg" href="mailto:[^"]*">)([^<]+)(<\/a>)/i,
      `$1${esc(copy.ctaEmailLabel)}$3`
    );
    out = replaceFirst(out, /<p class="rby-hero-panel__kicker">[^<]*<\/p>/i, `<p class="rby-hero-panel__kicker">${esc(copy.heroPanelKicker)}</p>`);
    out = replaceFirst(out, /<p class="rby-hero-panel__title">[^<]*<\/p>/i, `<p class="rby-hero-panel__title">${esc(copy.heroPanelTitle)}</p>`);
    out = replaceFirst(out, /<p class="rby-hero-panel__text">[^<]*<\/p>/i, `<p class="rby-hero-panel__text">${esc(copy.heroPanelBody)}</p>`);
    out = applyEventCopy(out, copy);
  }

  if (archetype === 'service_local') {
    out = applyServiceCopy(out, copy);
    out = replaceFirst(
      out,
      /(<a class="btn btn--primary btn--lg" href="mailto:[^"]*">)([^<]+)(<\/a>)/i,
      `$1${esc(copy.ctaEmailLabel)}$3`
    );
  }

  if (archetype === 'agency') {
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="work"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.categoryTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(id="work"[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.categoryLead)}$3`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section rby-agency-cta"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.ctaTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(rby-agency-cta[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.ctaBody)}$3`
    );
    out = replaceFirst(
      out,
      /(<a class="btn btn--primary btn--lg" href="mailto:[^"]*">)([^<]+)(<\/a>)/i,
      `$1${esc(copy.ctaEmailLabel)}$3`
    );
  }

  if (archetype === 'landing') {
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="proof"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.categoryTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(<section class="rby-section rby-landing-cta"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.ctaTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(rby-landing-cta[^>]*>[\s\S]*?<p class="rby-lead"[^>]*>)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.ctaBody)}$3`
    );
    out = replaceFirst(
      out,
      /(<a class="btn btn--primary btn--lg" href="mailto:[^"]*">)([^<]+)(<\/a>)/i,
      `$1${esc(copy.ctaEmailLabel)}$3`
    );
  }

  if (archetype === 'ecommerce_general') {
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="shop"[^>]*>[\s\S]*?<h2>)([^<]+)(<\/h2>)/i,
      `$1${esc(copy.categoryTitle)}$3`
    );
    out = replaceFirst(
      out,
      /(id="shop"[^>]*>[\s\S]*?<p class="rby-lead">)([\s\S]*?)(<\/p>)/i,
      `$1${esc(copy.categoryLead)}$3`
    );
    const figs = copy.testimonials
      .map(
        (t) => `<figure class="rby-card rby-quote-block">
            <blockquote class="rby-quote">${esc(t.quote)}</blockquote>
            <figcaption><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></figcaption>
          </figure>`
      )
      .join('\n          ');
    out = replaceFirst(
      out,
      /(<section class="rby-section" id="stories"[^>]*>[\s\S]*?<div class="rby-container rby-grid[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<\/section>)/i,
      `$1${figs}$3`
    );
  }

  return out;
}

/** Sharpen CTA microcopy without touching the rest of the page. */
export function sharpenCtaCopy(copy: RbyanCopyPack): RbyanCopyPack {
  return {
    ...copy,
    ctaPrimary: /shop|browse|collection/i.test(copy.ctaPrimary) ? `${copy.ctaPrimary} — see bundles` : `Get started — ${copy.ctaPrimary}`,
    ctaSecondary: /zone|delivery|area/i.test(copy.ctaSecondary) ? `${copy.ctaSecondary} (metro map)` : `${copy.ctaSecondary} — talk to us`,
    ctaEmailLabel: `Book a time — ${copy.ctaEmailLabel}`,
  };
}

/** Copy-only pass: strengthen final CTA and primary hero CTA labels. */
export function applyCtaCopyOnly(html: string, copy: RbyanCopyPack): string {
  let out = html;
  out = replaceFirst(
    out,
    /(<section class="rby-section rby-cta-block"[^>]*>[\s\S]*?<a class="btn btn--primary btn--lg"[^>]*>)([^<]+)(<\/a>)/i,
    `$1${esc(copy.ctaEmailLabel)}$3`
  );
  out = replaceFirst(
    out,
    /(<section class="rby-lead-band"[^>]*>[\s\S]*?<a class="btn btn--primary btn--lg"[^>]*>)([^<]+)(<\/a>)/i,
    `$1${esc(copy.ctaEmailLabel)}$3`
  );
  out = replaceFirst(
    out,
    /(<div class="rby-hero-actions">\s*<a[^>]*class="btn btn--primary[^"]*"[^>]*>)([^<]+)(<\/a>)/i,
    `$1${esc(copy.ctaPrimary)}$3`
  );
  return out;
}
