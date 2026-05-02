/** Light checks for the Site builder — not exhaustive. */

export function collectMobileHtmlWarnings(html: string): string[] {
  const warnings: string[] = [];
  const s = html || '';
  if (!/\bviewport\b/i.test(s)) {
    warnings.push('Missing viewport meta — mobile scaling may look wrong.');
  }
  const pxSizes = [...s.matchAll(/font-size\s*:\s*([0-9]+)\s*px/gi)].map((m) => Number(m[1]));
  const smallFonts = pxSizes.filter((n) => n > 0 && n < 14);
  if (smallFonts.length) {
    warnings.push(`Smallest detected font-size is ${Math.min(...smallFonts)}px (< 14px can be hard on phones).`);
  }
  if (/\bmin-width\s*:\s*(\d+)px\b/gi.test(s)) {
    let maxMin = 0;
    for (const m of s.matchAll(/\bmin-width\s*:\s*(\d+)px\b/gi)) {
      maxMin = Math.max(maxMin, Number(m[1]));
    }
    if (maxMin > 560) warnings.push(`Very large min-width (${maxMin}px) may cause horizontal scrolling on phones.`);
  }
  if (/height\s*:\s*(?:[12][0-9]|30|32|34|36)px/i.test(s) && /<button\b/i.test(s)) {
    warnings.push('Some controls may use short tap heights — aim for ≥ 44px for primary actions.');
  }
  return [...new Set(warnings)];
}
