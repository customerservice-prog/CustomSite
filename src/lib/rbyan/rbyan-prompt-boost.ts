import type { RbyanProjectContext } from '@/lib/rbyan/types';

/**
 * Prepends structured client / brand context so the mock pipeline (and a future LLM)
 * can differentiate output instead of relying on the raw user sentence alone.
 */
export function appendProjectContextToPrompt(prompt: string, ctx: RbyanProjectContext): string {
  const lines: string[] = [
    '[Client context — use to differentiate layout, copy, and CSS from generic templates]',
    `- Contact: ${ctx.clientContactName?.trim() || '—'}`,
    `- Business / company: ${ctx.clientCompany?.trim() || ctx.projectName}`,
    `- Project: ${ctx.projectName}`,
  ];
  if (ctx.clientEmail?.trim()) lines.push(`- Email: ${ctx.clientEmail.trim()}`);
  if (ctx.clientPhone?.trim()) lines.push(`- Phone: ${ctx.clientPhone.trim()}`);
  if (ctx.industryNiche?.trim()) {
    lines.push(`- Industry / niche: ${ctx.industryNiche.trim()}`);
  }
  if (ctx.businessType?.trim()) {
    lines.push(`- Business type: ${ctx.businessType.trim()}`);
  }
  if (ctx.keyPagesNeeded?.trim()) {
    lines.push(`- Pages / sections to prioritize: ${ctx.keyPagesNeeded.trim()}`);
  }
  if (ctx.siteBuildArchetype) {
    lines.push(`- Project site pattern: ${ctx.siteBuildArchetype.replace(/_/g, ' ')}`);
  }
  const kit = ctx.brandKit;
  if (kit?.businessSummary?.trim()) {
    lines.push(`- Offer & audience: ${kit.businessSummary.trim()}`);
  }
  if (kit?.voice?.trim()) {
    lines.push(`- Brand voice: ${kit.voice.trim()}`);
  }
  if (kit?.visualStyle?.trim()) {
    lines.push(`- Visual style: ${kit.visualStyle.trim()}`);
  }
  if (kit?.fontVibe?.trim()) {
    lines.push(`- Typography direction: ${kit.fontVibe.trim()}`);
  }
  if (kit?.primaryHex?.trim() || kit?.accentHex?.trim()) {
    lines.push(
      `- Brand colors (use in :root / buttons / accents): primary ${kit.primaryHex?.trim() || '—'}, accent ${kit.accentHex?.trim() || '—'}`
    );
  }
  lines.push(
    '[/Client context]',
    'Instruction: Reflect this business type in section order and copy (food service → menu/hours/reservations; ecommerce → product hero and trust; trades → services/guarantee/contact). Use the real company or project name everywhere — never "Your Brand". Do not duplicate identical hero blocks.',
    ''
  );
  return `${lines.join('\n')}${prompt.trim()}`;
}
