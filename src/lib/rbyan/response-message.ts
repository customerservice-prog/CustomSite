import type { PromptClassification } from '@/lib/rbyan/types';
import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';

export type NarrativeKind = 'full' | 'section' | 'style' | 'copy' | 'cta-only' | 'fallback';

export function buildAssistantNarrative(args: {
  kind: NarrativeKind;
  classification: PromptClassification;
  buildPlan: RbyanBuildPlan | null;
  changedFiles?: string[];
  extraNotes?: string[];
}): string {
  const { kind, classification, buildPlan, changedFiles = [], extraNotes = [] } = args;
  const planBits = buildPlan
    ? `I’m targeting **${buildPlan.goal}** for **${buildPlan.audience}** with a **${buildPlan.style.theme}** look (${buildPlan.style.spacing} spacing, ${buildPlan.style.typography} type).`
    : '';

  const fileLine =
    changedFiles.length > 0 ? ` Files touched: **${changedFiles.join(', ')}**.` : '';

  const notes = extraNotes.length ? ` ${extraNotes.join(' ')}` : '';

  if (kind === 'full' && buildPlan) {
    return `I analyzed your brief and locked a build plan: ${buildPlan.sections.slice(0, 4).join(', ')}${buildPlan.sections.length > 4 ? ', …' : ''}. ${planBits} Then I generated layout, copy slots, and a coordinated design layer so the page reads as one system—not a loose template.${fileLine}${notes} Want me to add a pricing band, tighten the hero, or optimize mobile spacing next?`;
  }

  if (kind === 'section') {
    return `I treated that as a **${classification}** request and **only extended the HTML** (plus scoped styles) so the rest of your page stays intact.${fileLine}${notes} Want pricing next, or should we sharpen the CTA copy?`;
  }

  if (kind === 'style' && buildPlan) {
    return `I refreshed your **visual system from the plan** (not a random CSS patch): updated **${buildPlan.style.theme}** with ${buildPlan.style.spacing} spacing and ${buildPlan.style.typography} typography.${planBits}${fileLine}${notes} I can tune copy to match the new tone, or add a section if you tell me which one.`;
  }

  if (kind === 'copy' || kind === 'cta-only') {
    return `I kept structure and styles stable and **rewrote targeted copy** so messaging stays aligned with your build intent.${fileLine}${notes} If you want a stronger offer line, say the audience and I’ll tune headlines only.`;
  }

  return `Here’s an update (${classification}).${planBits}${fileLine}${notes}`;
}
