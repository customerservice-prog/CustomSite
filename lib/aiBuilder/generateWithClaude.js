'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { resolveDesignGuidance } = require('./nicheDesignSystem');

function isAnthropicConfigured() {
  return Boolean(String(process.env.ANTHROPIC_API_KEY || '').trim());
}

/** Remove ```html fences and surrounding prose. */
function extractHtmlDocument(raw) {
  let s = String(raw || '').trim();
  const fence = /```(?:html)?\s*([\s\S]*?)```/im;
  const m = s.match(fence);
  if (m) s = m[1].trim();
  s = s.replace(/^\uFEFF/, '');
  if (!/<!DOCTYPE/i.test(s) && !/<html[\s>]/i.test(s)) {
    const i = s.search(/<!DOCTYPE/i);
    const j = s.search(/<html[\s>]/i);
    const cut = [i, j].filter((n) => n >= 0).sort((a, b) => a - b)[0];
    if (cut != null && cut >= 0) s = s.slice(cut).trim();
  }
  if (!/<!DOCTYPE/i.test(s) && !/<html[\s>]/i.test(s)) {
    throw new Error('Model output was not a complete HTML document (missing <!DOCTYPE> or <html>).');
  }
  return s;
}

function sectionLabelsFromHtml(html) {
  const out = [];
  const re = /<section[^>]*aria-label=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].trim();
    if (t && !out.includes(t)) out.push(t);
  }
  if (out.length === 0) {
    const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let h;
    while ((h = h2.exec(html)) !== null) {
      const text = String(h[1] || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text && text.length < 80 && !out.includes(text)) out.push(text);
      if (out.length >= 8) break;
    }
  }
  return out.length ? out.slice(0, 12) : ['Homepage'];
}

/**
 * Production homepage HTML via Claude Messages API.
 * @param {{
 *   prompt: string,
 *   businessType?: string,
 *   niche?: string,
 *   offerAudience?: string,
 *   clientName?: string,
 *   companyName?: string,
 *   city?: string,
 *   brandColors?: string,
 *   voice?: string,
 *   visualStyle?: string,
 *   fontVibe?: string,
 *   keyPagesNeeded?: string,
 *   existingIndexHtml?: string | null,
 *   mode: 'new-site'|'update-site',
 *   focusedSection?: string | null,
 *   contactPhone?: string | null,
 * }} opts
 */
async function generateSiteWithClaude(opts) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const model = String(process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022').trim();
  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a senior agency web designer delivering $5k+ tier single-file HTML homepages.

Your output MUST feel hand-crafted — not a white-box Wix slab, never a random orange "free inspection" trades CTA unless the business is genuinely home-services.

Output rules (strict):
- Return ONLY one valid HTML5 document starting with <!DOCTYPE html>. No markdown, no prose outside HTML, no code fences.
- All CSS lives in ONE <style> in <head>. No Bootstrap/Tailwind/CDN frameworks.
- Google Fonts ONLY (1–2 families): load with <link rel="preconnect" href="https://fonts.googleapis.com">, <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>, then stylesheet link(s).
- Mandatory <meta name="viewport" content="width=device-width, initial-scale=1">.

VISUAL DNA (match premium editorial sites — dark cinematic bases read as upscale unless the niche clearly demands airy daylight e.g. beach resort):
- Default to rich dark backgrounds for depth; restrained accent glow on primary CTAs.
- Eyebrow / kicker line above EACH major heading: uppercase or small caps, muted color, pronounced letter-tracking (around 0.12–0.22em).
- Section headings in large serif or display serif (clamp for responsive): min 48px-equivalent presence on desktop.
- Uppercase tracked navigation typical for luxe/editorial layouts (adjust if niche is bubbly cafe — still use real Google fonts, strong hierarchy).
- Full-bleed hero (min-height ~70vh on large screens): centered OR split composition; background gradient/image suggestion via CSS only (svg patterns ok).
- Sticky transparent-to-solid nav on scroll; smooth scroll behavior (scroll-behavior: smooth on html).
- Card grids with subtle 1px border and hover elevation or soft accent outline; respect prefers-reduced-motion.

Copy & UX:
- Killer hero headline + subheadline unique to THIS business (zero template filler like "Trusted services").
- Real section names tied to niche (café ⇒ Menu / Hours / Neighborhood; SaaS ⇒ Product / Pricing — never mislabel café as "Inspection").
- NO lorem ipsum, NO bracket placeholders except optional tasteful fictitious phone ONLY when none supplied.
- Testimonials if included: plausible first name + specific quote + stars (CSS unicode or inline text).
- Optional stat-strip or KPI row WHEN it fits (e.g. "12 single origins · Opens 7am daily") — factual tone, no fake inflated claims unless plausible.
- Accessible focus rings; sufficient contrast.
- Add a small inline <script> before </body> using Intersection Observer to fade-in sections (keep under ~45 lines; respect prefers-reduced-motion).`;

  const design = resolveDesignGuidance({
    clientName: opts.clientName,
    companyName: opts.companyName,
    businessType: opts.businessType,
    niche: opts.niche,
    prompt: opts.prompt,
    brandColors: opts.brandColors,
    fontVibe: opts.fontVibe,
    visualStyle: opts.visualStyle,
  });

  const parts = [];
  parts.push(`Build a complete homepage for this business.

Business / project name: ${opts.clientName || 'Client site'}
Company: ${opts.companyName || '—'}
Business type: ${opts.businessType || 'infer from description'}
Niche / industry: ${opts.niche || 'infer from description'}
City / area: ${opts.city || 'infer or say "local area"'}
Offer & audience: ${opts.offerAudience || '—'}
Brand colors (hex or description): ${opts.brandColors || 'use preset anchors unless user/branding contradicts'}
Voice: ${opts.voice || 'match the niche'}
Visual style: ${opts.visualStyle || 'match the preset + user request'}
Key pages to reflect in nav (single-page anchors ok): ${opts.keyPagesNeeded || 'Home sections only'}
Typography: ${opts.fontVibe || 'use preset pairing in NICHE DESIGN block'}
${opts.contactPhone ? `Real business phone for tel: links and footer: ${opts.contactPhone}` : 'No phone supplied — omit phone or discrete placeholder formatted as tel; never cheesy fake slogan CTAs.'}

--- NICHE DESIGN SYSTEM (mandatory styling spine; preset=${design.presetId}) ---
${design.block}
--- END NICHE DESIGN ---

User request (primary structure, vibe, warmth, sections — obey over generic habits):
${opts.prompt.trim()}`);

  if (opts.focusedSection?.trim()) {
    parts.push(`\nFocus extra attention on this area if it exists; otherwise create it: ${opts.focusedSection.trim()}`);
  }

  if (opts.mode === 'update-site' && opts.existingIndexHtml?.trim()) {
    parts.push(
      `\nYou are revising an EXISTING homepage. Improve it per the user request while preserving working structure. Output the full replacement HTML document only.\n\n--- CURRENT HTML ---\n${opts.existingIndexHtml.trim().slice(0, 180000)}\n--- END ---`
    );
  } else {
    parts.push('\nCreate a new homepage from scratch.');
  }

  const userPrompt = parts.join('\n');

  const message = await client.messages.create({
    model,
    max_tokens: Math.min(Number(process.env.ANTHROPIC_MAX_TOKENS) || 16384, 16384),
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let text = '';
  for (const block of message.content || []) {
    if (block.type === 'text' && block.text) text += block.text;
  }
  const html = extractHtmlDocument(text);
  const sections = sectionLabelsFromHtml(html);

  return {
    html,
    sections,
    model,
    usage: message.usage || null,
  };
}

module.exports = { generateSiteWithClaude, isAnthropicConfigured, extractHtmlDocument };
