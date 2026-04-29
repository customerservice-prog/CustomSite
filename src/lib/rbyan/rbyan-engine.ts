import type { RbyanEngineInput, RbyanEngineOutput } from '@/lib/rbyan/types';
import { runGenerationPipeline } from '@/lib/rbyan/generation-strategies';
import { computeChangelog } from '@/lib/rbyan/changelog';

/** Re-export for callers that only need intent routing before a future LLM swap. */
export { classifyPrompt } from '@/lib/rbyan/prompt-classifier';
export { generateSiteTemplate, inferTemplateTypeFromPrompt } from '@/lib/rbyan/template-generator';
export { createBuildPlan, mergeModifierIntoPlan, buildPlanToSummaryLines } from '@/lib/rbyan/build-plan';
export { generateCopy } from '@/lib/rbyan/generate-copy';
export { generateDesign, mergeDesignIntoCss, stripDesignLayer } from '@/lib/rbyan/generate-design';
export { buildSiteFromPlan } from '@/lib/rbyan/build-site-from-plan';

const MOCK_DELAY_MS = 520;

/**
 * Core Rbyan generation entry. Mock implementation today — keep this function as
 * the single swap point for OpenAI/Claude while preserving `RbyanEngineOutput`.
 */
export async function generateWithRbyan(input: RbyanEngineInput): Promise<RbyanEngineOutput> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  const { prompt, projectContext, existingFiles, mode } = input;
  const trimmed = prompt.trim();
  const existing = existingFiles?.length ? existingFiles : null;

  const pipe = runGenerationPipeline({
    prompt: trimmed,
    mode,
    projectContext,
    existingFiles: existing,
    sessionMemory: input.sessionMemory ?? null,
    focusedSection: input.focusedSection ?? null,
  });

  const changelog = computeChangelog({
    before: existing,
    after: pipe.files,
    classification: pipe.classification,
    focusedSection: input.focusedSection ?? undefined,
    updatedFiles: pipe.updatedFiles,
  });

  return {
    message: pipe.message,
    plan: pipe.plan,
    files: pipe.files,
    updatedFiles: pipe.updatedFiles,
    sections: pipe.sections,
    versionName: pipe.versionName,
    classification: pipe.classification,
    source: 'mock',
    buildPlan: pipe.buildPlan,
    copyPack: pipe.copyPack,
    designPack: pipe.designPack,
    suggestions: pipe.suggestions,
    sessionMemory: pipe.sessionMemory,
    changelog,
  };
}
