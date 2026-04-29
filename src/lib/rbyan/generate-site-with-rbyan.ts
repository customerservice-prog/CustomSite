import type { RbyanGenerateResult, RbyanGeneratedFile, RbyanProjectContext, RbyanSessionMemory } from '@/lib/rbyan/types';
import { engineOutputToGenerateResult } from '@/lib/rbyan/types';
import { generateWithRbyan } from '@/lib/rbyan/rbyan-engine';

/**
 * @deprecated Prefer `generateWithRbyan` for new code — this wrapper maps legacy call sites.
 * Generates a site or iterates on existing files using the Rbyan engine (mock / future API).
 */
export async function generateSiteWithRbyan(
  prompt: string,
  projectContext: RbyanProjectContext,
  existingFiles: RbyanGeneratedFile[] | null,
  sessionMemory?: RbyanSessionMemory | null,
  focusedSection?: string | null
): Promise<RbyanGenerateResult> {
  const mode = existingFiles?.length ? 'update-site' : 'new-site';
  const out = await generateWithRbyan({
    prompt,
    projectId: projectContext.projectId,
    existingFiles: existingFiles ?? undefined,
    mode,
    projectContext,
    sessionMemory: sessionMemory ?? null,
    focusedSection: focusedSection ?? null,
  });
  return engineOutputToGenerateResult(out);
}
