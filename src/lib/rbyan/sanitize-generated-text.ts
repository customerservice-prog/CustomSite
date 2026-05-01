/**
 * Replace Unicode punctuation that often renders as mojibake (â€", â€™) when
 * bytes are misinterpreted as Windows-1252. Keeps generated HTML/CSS readable.
 */
export function normalizeGeneratedText(s: string): string {
  return (
    s
      // UTF-8 em/en dash decoded as CP1252: U+00E2 + U+20AC + U+201D / U+201C
      .replace(/\u00e2\u20ac\u201d/g, ' - ')
      .replace(/\u00e2\u20ac\u201c/g, '-')
      // UTF-8 right single quote U+2019 as E2 80 99 misread as CP1252 (â + € + ™)
      .replace(/\u00e2\u20ac\u2122/g, "'")
      // UTF-8 ellipsis E2 80 A6 as CP1252
      .replace(/\u00e2\u20ac\u00a6/g, '...')
      // Same repairs when those sequences already appear as common pasted mojibake
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€¦/g, '...')
      .replace(/\u2014/g, ' - ') // em dash
      .replace(/\u2013/g, '-') // en dash
      .replace(/\u2018|\u2019/g, "'") // smart single quotes
      .replace(/\u201c|\u201d/g, '"') // smart double quotes
      .replace(/\u2026/g, '...') // ellipsis
  );
}
