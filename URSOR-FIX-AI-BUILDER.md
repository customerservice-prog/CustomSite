# CURSOR TASK: Fix the AI Builder ("Bryan the Brain")

**Priority:** CRITICAL — The AI builder is producing garbage output  
**Project:** CustomSite / Studio Pulse (Node.js + Express + Supabase + React admin SPA)

---

## WHAT IS BROKEN AND WHY

The AI builder at `/admin.html#/ai-builder` (route alias: `#/rbyan`) calls a backend  
generate endpoint that uses `lib/siteTemplates.js` — a file of hardcoded HTML template  
strings. The template file literally contains:

```html
Your website
Edit HTML, CSS, and JavaScript in the Site builder — no WordPress required.
Get in touch
```

This is NOT AI. It's string substitution on static templates. When a user types  
"Build a cozy cafe homepage for Nikki Cafe in Syracuse NY", it returns a generic  
contractor/service-business template with nav items like "Services · Why us · Free inspection".  
The prompt is completely ignored for design, layout, copy, and style.

The sites that look great on this platform (cestuiquevietrust.com, thesoulvault.org)  
were NOT built by this builder — they were hand-coded manually. The AI builder has  
never produced anything close to that quality.

---

## WHAT GOOD LOOKS LIKE (study these before touching any code)

### cestuiquevietrust.com — visual DNA to replicate:

- Background: `#0a0a0a` (near-black)
- Accent: `#c9a84c` (rich gold) — used ONLY for headlines, borders, buttons
- Nav: uppercase, `letter-spacing: 0.18em`, transparent bg that darkens on scroll
- Font headline: Playfair Display (Google Fonts), weight 700
- Font body/nav: Space Mono or similar monospace for eyebrow labels
- Hero: centered layout, large embossed logo image, spaced eyebrow label, serif headline
- Stat bar: 4-column grid with large numbers + small uppercase labels
- Sections: alternating `#0a0a0a` / `#0f0f0f`, full-bleed, each with eyebrow + serif h2
- Cards: dark border `#1a1a1a`, hover → gold border glow
- CTAs: solid gold primary + ghost gold outline secondary (side by side)

### thesoulvault.org — additional visual DNA:

- Split hero: 50% text left / 50% 3D render image right
- Headline: 3-line, 72px+, Playfair Display, gold color
- Eyebrow above hero: "THE TRUTH THEY SUPPRESSED" tracked uppercase, muted gold
- Animated floating particles in hero background (CSS or canvas)
- 4-column card grid: each card has a unicode symbol + bold heading + 2-line desc
- All-caps navigation, dot separator character at end: `HOME · VIDEOS · DEBATE ·`

---

## THE FIX — EXACT STEPS

### STEP 1: Create `lib/aiBuilder/generateWithClaude.js`

Create this new file:

```javascript
'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// Niche → font + color palette map
const NICHE_THEMES = {
  cafe: {
    bg: '#1a0d07', accent: '#d4a853', text: '#f5f0e8',
    headlineFont: 'Playfair Display', bodyFont: 'Lato',
    mood: 'warm, inviting, artisan coffee shop energy'
  },
  restaurant: {
    bg: '#0f0a05', accent: '#c9a84c', text: '#f0ebe0',
    headlineFont: 'Playfair Display', bodyFont: 'Lato',
    mood: 'upscale dining, sophisticated, culinary excellence'
  },
  law: {
    bg: '#0a0a0a', accent: '#c9a84c', text: '#e8e0d0',
    headlineFont: 'Playfair Display', bodyFont: 'Space Mono',
    mood: 'authoritative, editorial, documentary-grade gravitas'
  },
  research: {
    bg: '#0a0a0a', accent: '#c9a84c', text: '#e8e0d0',
    headlineFont: 'Playfair Display', bodyFont: 'Space Mono',
    mood: 'investigative, cinematic, classified-document aesthetic'
  },
  wellness: {
    bg: '#0d1a12', accent: '#7eb87e', text: '#e8f0e8',
    headlineFont: 'Cormorant Garamond', bodyFont: 'Inter',
    mood: 'calm, healing, natural, premium spa energy'
  },
  tech: {
    bg: '#0f0f23', accent: '#6366f1', text: '#e8e8f8',
    headlineFont: 'Inter', bodyFont: 'JetBrains Mono',
    mood: 'modern SaaS, clean, technical precision'
  },
  construction: {
    bg: '#111111', accent: '#f59e0b', text: '#f5f5f0',
    headlineFont: 'Oswald', bodyFont: 'Roboto',
    mood: 'strong, reliable, industrial, built-to-last'
  },
  beauty: {
    bg: '#1a0a14', accent: '#d4af8a', text: '#f5ede8',
    headlineFont: 'Cormorant Garamond', bodyFont: 'Montserrat',
    mood: 'luxury beauty, feminine elegance, premium salon'
  },
  realestate: {
    bg: '#0d1b2a', accent: '#c9a84c', text: '#e8ecf0',
    headlineFont: 'Libre Baskerville', bodyFont: 'Open Sans',
    mood: 'premium property, trust, aspirational lifestyle'
  },
  default: {
    bg: '#0a0a0a', accent: '#c9a84c', text: '#f0ece0',
    headlineFont: 'Playfair Display', bodyFont: 'Inter',
    mood: 'premium local business, confident, professional'
  }
};

function detectNiche(businessType, niche, clientName, prompt) {
  const combined = `${businessType} ${niche} ${clientName} ${prompt}`.toLowerCase();
  if (/cafe|coffee|espresso|bakery|pastry/.test(combined)) return 'cafe';
  if (/restaurant|dining|bistro|eatery|food|menu/.test(combined)) return 'restaurant';
  if (/law|legal|attorney|trust|code|statute|rights/.test(combined)) return 'law';
  if (/research|investigat|truth|conspir|sovereign|hidden/.test(combined)) return 'research';
  if (/spa|wellness|yoga|healing|holistic|therapy/.test(combined)) return 'wellness';
  if (/tech|saas|software|app|digital|dev/.test(combined)) return 'tech';
  if (/construct|plumb|electric|roofing|contractor|build/.test(combined)) return 'construction';
  if (/salon|beauty|hair|nail|makeup|cosmetic/.test(combined)) return 'beauty';
  if (/real estate|realtor|property|homes|mortgage/.test(combined)) return 'realestate';
  return 'default';
}

async function generateSiteWithClaude({ prompt, businessType, niche, offer, clientName, city, brandColors }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in environment variables');

  const client = new Anthropic({ apiKey });

  const detectedNiche = detectNiche(businessType, niche, clientName, prompt);
  const theme = NICHE_THEMES[detectedNiche];

  const systemPrompt = `You are an elite web designer who builds complete, stunning, 
production-ready single-file HTML websites. Your sites look like they were custom-built 
for $5,000–$10,000 by a top agency. They NEVER look like templates.

VISUAL STANDARD TO MATCH:
You must match the quality of these two real sites built by this agency:
1. cestuiquevietrust.com — Deep black bg, rich gold accents, Playfair Display headlines,
   spaced uppercase navigation, stat counter bar, video card grid, cinematic editorial feel
2. thesoulvault.org — Split hero with 3D image, massive serif headline, eyebrow labels
   above every section, 4-column card grid with unicode icons, floating particle effect

MANDATORY DESIGN RULES — NEVER BREAK THESE:
1. Output ONLY valid raw HTML — no markdown, no code fences, no explanation text
2. Single file — all CSS in <style> in <head>, all JS in inline <script> before </body>
3. Load Google Fonts via link + preconnect
4. Use EXACTLY the color palette and fonts provided in the user message
5. Every section MUST have: an eyebrow label (small, tracked uppercase, muted) + bold serif headline
6. Navigation: uppercase, letter-spacing: 0.15em, sticky, changes opacity on scroll
7. Hero section: full-bleed, dark bg, large serif headline (64px+), subheadline, 2 CTA buttons
   (one solid accent-colored, one ghost/outline), business name in the nav
8. At least 4 sections total: hero + 2-3 content sections + footer
9. Footer: business name, city, phone placeholder, email placeholder, copyright year
10. Mobile-first responsive: use CSS Grid and Flexbox, no external CSS frameworks
11. Smooth scroll: scroll-behavior: smooth on html element
12. Hover states on ALL buttons, nav links, and cards (transition: all 0.3s ease)
13. Animated counter numbers using Intersection Observer if stat numbers are present
14. NO placeholder text — write REAL, compelling, niche-specific copy
15. The nav CTA button label must match the business (cafe → "Visit Us", law → "Research Now")
16. Section background alternates: bg-color / slightly-lighter-bg / bg-color
17. Cards: dark border, border-radius: 4px, padding: 2rem, hover → accent-color border glow

COPY RULES:
- Hero headline must be SPECIFIC to this business — not generic
- Write as if you know this business deeply
- Use the industry language (cafe: "single-origin", "artisan roast"; law: "statute", "instrument")
- Testimonial names must sound real and location-appropriate
- No "Lorem ipsum", no "[INSERT PHONE]", no placeholder brackets of any kind`;

  const colorBg = brandColors || theme.bg;
  const colorAccent = theme.accent;
  const colorText = theme.text;

  const userPrompt = `Build a complete homepage for this business:

Business name: ${clientName || 'The Business'}
Type: ${businessType || detectedNiche}
Niche/industry: ${niche || detectedNiche}
City: ${city || 'local area'}
Offer/description: ${offer || prompt}

DESIGN SPEC:
- Background color: ${colorBg}
- Accent color: ${colorAccent}  
- Text color: ${colorText}
- Headline font: ${theme.headlineFont} (load from Google Fonts)
- Body font: ${theme.bodyFont} (load from Google Fonts)
- Mood: ${theme.mood}

User's build request: ${prompt}

Output the complete, single-file HTML document now. Start with <!DOCTYPE html>.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  let html = message.content[0].text.trim();

  // Strip any accidental markdown code fences
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    throw new Error('AI returned non-HTML content — check system prompt');
  }

  return html;
}

module.exports = { generateSiteWithClaude, detectNiche };
```

---

### STEP 2: Add ANTHROPIC_API_KEY to Railway

In Railway dashboard → CustomSite service → Variables → add:

`ANTHROPIC_API_KEY=sk-ant-api03-...`

Get the key from https://console.anthropic.com. Use `claude-opus-4-5` model.  
Cost: ~$0.12 per full generation. Worth every penny.

---

### STEP 3: Install the Anthropic SDK

In your project root terminal:

```bash
npm install @anthropic-ai/sdk
```

---

### STEP 4: Find and replace the mock generate endpoint in `routes/siteBuilder.js`

Search in `routes/siteBuilder.js` for the route that handles AI generation.

It will be something like:

- `router.post('/projects/:id/ai-generate'`
- or `router.post('/projects/:id/generate'`
- or `router.post('/ai/generate'`

When you find it, look for where it calls `getTemplateFiles()` or uses `TEMPLATE_KEYS`  
or builds HTML from the template strings. Replace that logic with:

```javascript
// ADD THIS IMPORT at the top of routes/siteBuilder.js:
const { generateSiteWithClaude } = require('../lib/aiBuilder/generateWithClaude');

// REPLACE the template-generation section inside the route handler with:
const {
  prompt,
  businessType,
  niche,
  offer,
  city,
  brandColors,
  focusSection, // 'whole page' or a specific section name
} = req.body;

const project = await loadProjectWithClientLabel(supabase, projectId, adminId);
const clientName = project?.name || project?.client_name || 'Business';
const projectCity = city || project?.site_settings?.city || '';

let generatedHtml;

if (!focusSection || focusSection === 'whole page' || focusSection === 'whole_page') {
  // Full page generation via Claude
  generatedHtml = await generateSiteWithClaude({
    prompt,
    businessType,
    niche,
    offer,
    clientName,
    city: projectCity,
    brandColors,
  });
} else {
  // Section-only refinement: load existing index.html, pass to Claude to modify just that section
  const existingFile = await supabase
    .from('site_files')
    .select('content, content_encoding')
    .eq('project_id', projectId)
    .eq('path', 'index.html')
    .maybeSingle();

  const existingHtml = existingFile?.data?.content_encoding === 'base64'
    ? Buffer.from(existingFile.data.content, 'base64').toString('utf8')
    : existingFile?.data?.content || '';

  // For section edits, use a targeted prompt
  const sectionPrompt = `Here is an existing HTML page:\n\n${existingHtml}\n\n
The user wants to improve only the "${focusSection}" section.
Request: ${prompt}
Return the complete updated HTML page with ONLY the ${focusSection} section changed.
Keep everything else identical. Output raw HTML only.`;

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: sectionPrompt }],
  });
  generatedHtml = msg.content[0].text.trim()
    .replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}

// Save generated HTML to site_files (this part likely already exists — keep as-is)
// The route probably already saves to site_files after generation
// Just replace the HTML source from template → generatedHtml
```

---

### STEP 5: Fix the preview iframe in the React admin SPA

Find the AI Builder React component. It's in `src/` somewhere — search for:

- `ai-builder` or `rbyan` or `Bryan` or `AiBuilder` in the `src/` directory
- Look for `<iframe` or `srcDoc` or `Live preview`

When you find the iframe, change its height from whatever it is now (probably 120-150px) to:

```jsx
<iframe
  srcDoc={generatedHtml}
  title="Live preview"
  style={{
    width: '100%',
    height: '640px',
    border: 'none',
    borderRadius: '8px',
    background: '#0a0a0a',
  }}
  sandbox="allow-scripts allow-same-origin"
/>
```

Also add an "Open full preview" button right above the iframe:

```jsx
{generatedHtml && (
  <button
    onClick={() => {
      const blob = new Blob([generatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }}
    style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
  >
    ↗ Open full preview in new tab
  </button>
)}
```

---

### STEP 6: Auto-populate the Business & Brand context sidebar from project data

In the same React component, when a project is selected, auto-fill the context fields  
from the project's `site_settings` if they exist:

```javascript
// When project selection changes:
async function onProjectSelect(projectId) {
  const project = await fetchProject(projectId); // already exists

  // Auto-fill sidebar from stored settings
  if (project.site_settings?.aiBuilder) {
    const s = project.site_settings.aiBuilder;
    setBusinessType(s.businessType || '');
    setNiche(s.niche || '');
    setOffer(s.offer || '');
    setCity(s.city || '');
    setBrandColors(s.brandColors || '');
  }
}

// Save sidebar context to Supabase when it changes:
async function saveSidebarContext() {
  await fetch(`/api/admin/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      site_settings: {
        ...existingSiteSettings,
        aiBuilder: { businessType, niche, offer, city, brandColors }
      }
    })
  });
}
```

---

### STEP 7: Add streaming support (optional but recommended for UX)

Claude API supports streaming. Instead of waiting 15-30 seconds for the full response,  
stream the HTML token by token so the user sees it building in real time.

In the backend route, add a streaming version:

```javascript
// Use stream: true and pipe to response
const stream = await client.messages.stream({
  model: 'claude-opus-4-5',
  max_tokens: 8192,
  messages: [{ role: 'user', content: userPrompt }],
  system: systemPrompt,
});

res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
    res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
  }
}
res.write('data: [DONE]\n\n');
res.end();
```

---

## QUICK TEST AFTER IMPLEMENTING

Once wired up, test with this exact prompt for Nikki Cafe:

> "Build a full homepage for Nikki Cafe, a cozy artisan coffee shop in Syracuse NY.  
> Warm espresso-brown tones, gold accents. Show the menu categories, a hero with  
> the tagline, 5-star Google review highlights, and a find us / hours section."

Expected output should look NOTHING like the current white/grey contractor template.  
It should have: dark warm bg, Playfair Display headline, gold accents, menu card grid,  
review stars section, sticky nav. Comparable quality to thesoulvault.org.

If it still generates generic content — the system prompt or model connection is wrong.  
Check Railway logs: `railway logs` to see if `ANTHROPIC_API_KEY` is being read correctly.

---

## FILES MODIFIED IN TOTAL

1. `lib/aiBuilder/generateWithClaude.js` — CREATE NEW
2. `routes/siteBuilder.js` — MODIFY: replace template call with Claude call
3. `src/.../AiBuilder.jsx` (or similar) — MODIFY: iframe height + open preview btn + auto-fill
4. `package.json` — ADD: `@anthropic-ai/sdk` dependency
5. Railway env vars — ADD: `ANTHROPIC_API_KEY`

That's it. 5 changes. The entire quality gap closes.
