import { newFile, type ProjectSiteFile } from '@/lib/site-builder/project-site-model';
import type { SiteBuildArchetypeId } from '@/lib/types/entities';
import type { RbyanBuildPlan } from '@/lib/rbyan/build-plan';
import type { RbyanCopyPack } from '@/lib/rbyan/generate-copy';
import type { RbyanDesignPack } from '@/lib/rbyan/generate-design';

/** Optional brand direction from AI Builder UI (stored per project in session). */
export type RbyanBrandKit = {
  primaryHex?: string;
  accentHex?: string;
  fontVibe?: string;
  voice?: string;
  visualStyle?: string;
  businessSummary?: string;
};

export type RbyanGeneratedFile = {
  name: string;
  type: 'html' | 'css' | 'js';
  content: string;
};

export type RbyanProjectContext = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientCompany?: string | null;
  /** Primary contact — pairs with company for voice. */
  clientContactName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  /** Short niche line from AI Builder (e.g. “Neighborhood Italian bistro”). */
  industryNiche?: string | null;
  /** e.g. client_site */
  deliveryFocus?: string | null;
  /** From project record when set at project creation. */
  siteBuildArchetype?: SiteBuildArchetypeId | null;
  brandKit?: RbyanBrandKit | null;
  /** e.g. restaurant, salon, ecommerce — steers template + copy. */
  businessType?: string | null;
  /** Comma-separated pages the site should include. */
  keyPagesNeeded?: string | null;
  /** City or service area for local businesses (AI Builder + Claude). */
  city?: string | null;
};

/** Prompt routing for the generation pipeline (mock rules today; API can reuse). */
export type PromptClassification = 'build-site' | 'add-section' | 'modify-style' | 'improve-copy' | 'unknown';

export type RbyanEngineMode = 'new-site' | 'update-site';

/**
 * Primary engine contract — swap `generateWithRbyan` implementation for OpenAI/Claude later.
 * `projectContext` supplies brand labels for templates (caller provides from app state).
 */
/** Per-project session memory so iterations feel contextual (UI + engine). */
export type RbyanSessionMemory = {
  lastPlan: RbyanBuildPlan | null;
  lastCopy: RbyanCopyPack | null;
  lastDesign: RbyanDesignPack | null;
  lastPrompt: string | null;
};

export type RbyanEngineInput = {
  prompt: string;
  projectId: string;
  existingFiles?: RbyanGeneratedFile[];
  mode: RbyanEngineMode;
  projectContext: RbyanProjectContext;
  sessionMemory?: RbyanSessionMemory | null;
  /** Section focus from co-build UI, e.g. "Hero" or "CTA". */
  focusedSection?: string | null;
};

export type RbyanEngineOutput = {
  message: string;
  plan: string[];
  files: RbyanGeneratedFile[];
  /** Which file names were touched (iteration). */
  updatedFiles?: string[];
  sections: string[];
  versionName: string;
  classification: PromptClassification;
  source: 'mock' | 'api';
  buildPlan?: RbyanBuildPlan;
  copyPack?: RbyanCopyPack;
  designPack?: RbyanDesignPack;
  suggestions?: string[];
  sessionMemory: RbyanSessionMemory;
  /** Bullet list of concrete edits for this turn. */
  changelog?: string[];
};

export type RbyanGenerateResult = {
  assistantMessage: string;
  plan: string[];
  files: RbyanGeneratedFile[];
  sections: string[];
  versionLabel: string;
  source: 'mock' | 'api';
  classification?: PromptClassification;
  updatedFiles?: string[];
  buildPlan?: RbyanBuildPlan;
  suggestions?: string[];
  /** Pass back into the next `generateWithRbyan` call for contextual iterations. */
  sessionMemory?: RbyanSessionMemory;
  changelog?: string[];
};

export type RbyanVersionEntry = {
  id: string;
  createdAt: string;
  label: string;
  plan: string[];
  files: RbyanGeneratedFile[];
};

/** Convert Rbyan output to Site Builder `ProjectSite` files. */
export function rbyanFilesToProjectFiles(_projectId: string, files: RbyanGeneratedFile[]): ProjectSiteFile[] {
  return files.map((f) => newFile(f.name, f.content));
}

export function engineOutputToGenerateResult(out: RbyanEngineOutput): RbyanGenerateResult {
  return {
    assistantMessage: out.message,
    plan: out.plan,
    files: out.files,
    sections: out.sections,
    versionLabel: out.versionName,
    source: out.source,
    classification: out.classification,
    updatedFiles: out.updatedFiles,
    buildPlan: out.buildPlan,
    suggestions: out.suggestions,
    sessionMemory: out.sessionMemory,
    changelog: out.changelog,
  };
}
