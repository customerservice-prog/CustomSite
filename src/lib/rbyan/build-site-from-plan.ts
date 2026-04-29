import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';
import { applyCopyToHtml } from '@/lib/rbyan/apply-copy-to-html';
import { mergeDesignIntoCss } from '@/lib/rbyan/generate-design';
import type { RbyanCopyPack } from '@/lib/rbyan/generate-copy';
import type { RbyanDesignPack } from '@/lib/rbyan/generate-design';
import { generateSiteTemplate, type SiteTemplateType } from '@/lib/rbyan/template-generator';
import type { RbyanGeneratedFile, RbyanProjectContext } from '@/lib/rbyan/types';

function archetypeToTemplate(plan: RbyanBuildPlan): { type: SiteTemplateType; hint: string } {
  switch (plan.siteArchetype) {
    case 'event_rental':
      return { type: 'ecommerce', hint: 'event furniture rental premium' };
    case 'ecommerce_general':
      return { type: 'ecommerce', hint: 'shop catalog products' };
    case 'service_local':
      return { type: 'service', hint: 'roof inspection local' };
    case 'agency':
      return { type: 'agency', hint: 'creative studio' };
    case 'landing':
      return { type: 'landing', hint: 'conversion landing' };
    default:
      return { type: 'ecommerce', hint: plan.goal };
  }
}

/**
 * Step 7 (code): assemble files from template + design layer + copy slots.
 */
export function buildSiteFromPlan(
  plan: RbyanBuildPlan,
  copy: RbyanCopyPack,
  design: RbyanDesignPack,
  ctx: RbyanProjectContext
): { files: RbyanGeneratedFile[]; sections: string[]; planLines: string[]; versionName: string } {
  const brand = ctx.clientCompany?.trim() || ctx.projectName || 'Your brand';
  const { type, hint } = archetypeToTemplate(plan);
  const tpl = generateSiteTemplate(type, { brand, projectName: ctx.projectName, promptHint: hint });

  const files = tpl.files.map((f) => {
    if (f.name === 'index.html') {
      return { ...f, content: applyCopyToHtml(f.content, copy, plan.siteArchetype) };
    }
    if (f.name === 'styles.css') {
      return { ...f, content: mergeDesignIntoCss(f.content, design) };
    }
    return { ...f };
  });

  return {
    files,
    sections: tpl.sections,
    planLines: tpl.planLines,
    versionName: tpl.versionName,
  };
}
