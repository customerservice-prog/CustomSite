import type { AdminJsonResult } from '@/lib/admin-api';
import { adminFetchJson } from '@/lib/admin-api';
import type { RbyanGeneratedFile, RbyanProjectContext, RbyanSessionMemory } from '@/lib/rbyan/types';

export type RbyanAnthropicGenerateResponse = {
  assistantMessage: string;
  plan: string[];
  files: RbyanGeneratedFile[];
  sections: string[];
  versionLabel: string;
  source: 'mock' | 'api';
  classification?: string;
  updatedFiles?: string[];
  sessionMemory?: RbyanSessionMemory | null;
  changelog?: string[];
};

export function postRbyanAnthropicGenerate(
  projectId: string,
  body: {
    prompt: string;
    mode: string;
    focusedSection?: string | null;
    existingFiles: RbyanGeneratedFile[] | null;
    projectContext: RbyanProjectContext;
  }
): Promise<AdminJsonResult<RbyanAnthropicGenerateResponse>> {
  return adminFetchJson<RbyanAnthropicGenerateResponse>(
    `/api/admin/projects/${encodeURIComponent(projectId)}/rbyan/generate`,
    { method: 'POST', json: body }
  );
}
