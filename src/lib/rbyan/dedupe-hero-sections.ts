/**
 * Removes a second consecutive hero band with the same primary class (mock pipeline bug).
 */
export function dedupeConsecutiveHeroSections(html: string): string {
  const heroClass = [
    'rby-hero-event',
    'rby-hero-service',
    'rby-agency-hero',
    'rby-shop-hero',
    'rby-landing-hero',
  ];
  let out = html;
  for (const c of heroClass) {
    const re = new RegExp(
      `(<section[^>]*class="[^"]*\\b${c}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/section>)(\\s*)(<section[^>]*class="[^"]*\\b${c}\\b[^"]*")`,
      'gi'
    );
    out = out.replace(re, `$1$2<!-- deduped duplicate ${c} -->`);
  }
  return out;
}
