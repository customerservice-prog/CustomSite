import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';
import type { PromptClassification } from '@/lib/rbyan/types';

/** Short prompts for suggestion chips (after each assistant turn). */
export function buildSuggestionChips(
  plan: RbyanBuildPlan | null,
  classification: PromptClassification,
  indexHtml: string | null
): string[] {
  const html = indexHtml ?? '';
  const chips: string[] = [];

  if (!html.includes('id="rbyan-pricing"') && !html.includes('rbyan-pricing')) {
    chips.push('Add a pricing section');
  }
  if (!html.includes('id="rbyan-extra-testimonials"')) {
    chips.push('Add testimonials section');
  }

  chips.push('Improve hero headline');
  chips.push('Make it more modern');
  chips.push('Optimize spacing for mobile');

  if (plan?.style.theme && !/dark/i.test(plan.style.theme)) {
    chips.push('Make it more premium');
  }

  if (classification === 'improve-copy' || classification === 'add-section') {
    chips.push('Strengthen the main CTA');
  }

  return [...new Set(chips)].slice(0, 5);
}
