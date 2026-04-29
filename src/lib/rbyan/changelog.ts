import type { PromptClassification, RbyanGeneratedFile } from '@/lib/rbyan/types';

/** Human-readable “what changed” lines for trust + collaboration UX. */
export function computeChangelog(args: {
  before: RbyanGeneratedFile[] | null | undefined;
  after: RbyanGeneratedFile[];
  classification: PromptClassification;
  focusedSection: string | null | undefined;
  updatedFiles?: string[];
}): string[] {
  const { before, after, classification, focusedSection, updatedFiles = [] } = args;
  const lines: string[] = [];
  const focus = focusedSection?.trim() || null;

  if (!before?.length) {
    lines.push('Created `index.html`, `styles.css`, and `script.js` for this build.');
    return lines;
  }

  const touched = updatedFiles.length ? updatedFiles : ['index.html', 'styles.css', 'script.js'].filter((n) => {
    const b = before.find((f) => f.name === n);
    const a = after.find((f) => f.name === n);
    return b && a && b.content !== a.content;
  });

  if (focus) {
    lines.push(`Focused update: ${focus}`);
  }

  if (classification === 'add-section') {
    lines.push('Added a new section block ahead of your CTA/footer.');
  } else if (classification === 'modify-style') {
    lines.push('Refreshed the visual system (colors, spacing, and/or type scale).');
  } else if (classification === 'improve-copy') {
    lines.push('Tightened copy where it moves conversion (hero, CTAs, or both).');
  } else if (classification === 'build-site') {
    lines.push('Rebuilt the homepage from the latest plan + design layer.');
  }

  if (touched.includes('index.html')) lines.push('• Homepage HTML updated');
  if (touched.includes('styles.css')) lines.push('• Stylesheet updated');
  if (touched.includes('script.js')) lines.push('• Script bundle updated');

  if (lines.length === 1 && lines[0].startsWith('Focused')) {
    lines.push('• Scoped edits to the selected section where possible');
  }

  return lines;
}
