import {
  buildAgencyPack,
  buildDefaultEcommercePack,
  buildEventFurniturePack,
  buildLandingPack,
  buildRoofingPack,
} from '@/lib/rbyan/mock-packs';
import type { RbyanGeneratedFile } from '@/lib/rbyan/types';

export type SiteTemplateType = 'ecommerce' | 'service' | 'landing' | 'agency';

export type TemplateContext = {
  brand: string;
  projectName: string;
  /** Original user prompt — used to pick ecommerce flavor (e.g. event furniture). */
  promptHint?: string;
};

function packToTemplateResult(p: {
  plan: string;
  sections: string[];
  files: RbyanGeneratedFile[];
  versionLabel: string;
}) {
  const sentences = p.plan
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith('.') ? s : `${s}.`));
  return {
    planLines: sentences.length ? sentences : [p.plan],
    sections: p.sections,
    files: p.files,
    versionName: p.versionLabel,
  };
}

/**
 * Returns a full file set for a template archetype. Mock implementation;
 * later this can call an API and still return the same shape.
 * All packs prepend the shared Bryan the Brain design system (`design-system.ts`) inside `styles.css`.
 */
export function generateSiteTemplate(type: SiteTemplateType, ctx: TemplateContext) {
  const hint = (ctx.promptHint ?? '').toLowerCase();
  const { brand, projectName } = ctx;

  switch (type) {
    case 'agency': {
      const p = buildAgencyPack(brand, projectName);
      return packToTemplateResult(p);
    }
    case 'landing': {
      const p = buildLandingPack(brand, projectName);
      return packToTemplateResult(p);
    }
    case 'service': {
      if (/roof|gutter|shingle/i.test(hint)) {
        const p = buildRoofingPack(brand, projectName);
        return packToTemplateResult(p);
      }
      const p = buildRoofingPack(brand, projectName);
      return packToTemplateResult(p);
    }
    case 'ecommerce':
    default: {
      if (/furniture|rental|event|chair|table|gala|wedding/i.test(hint)) {
        const p = buildEventFurniturePack(brand, projectName);
        return packToTemplateResult(p);
      }
      if (/roof|gutter|shingle|contractor/i.test(hint)) {
        const p = buildRoofingPack(brand, projectName);
        return packToTemplateResult(p);
      }
      const p = buildDefaultEcommercePack(brand, projectName);
      return packToTemplateResult(p);
    }
  }
}

/** Infer template archetype from natural language (mock routing). */
export function inferTemplateTypeFromPrompt(prompt: string): SiteTemplateType {
  const p = prompt.toLowerCase();
  if (/roof|gutter|shingle|plumb|hvac|contractor|inspection|repair\s+service|local\s+service/i.test(p)) {
    return 'service';
  }
  if (/agency|portfolio|studio|creative\s+agency|branding\s+studio/i.test(p)) {
    return 'agency';
  }
  if (/landing|single\s+page|one\s+page|lead\s+magnet/i.test(p)) {
    return 'landing';
  }
  return 'ecommerce';
}
