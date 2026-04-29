import type { PromptClassification, RbyanEngineMode } from '@/lib/rbyan/types';

export type ClassifyPromptOptions = {
  hasExistingSite: boolean;
  mode?: RbyanEngineMode;
};

/**
 * Rule-based intent detection. A future LLM can replace this function while
 * keeping the same return type for `generateWithRbyan`.
 */
export function classifyPrompt(prompt: string, opts: ClassifyPromptOptions): PromptClassification {
  const p = prompt.toLowerCase().trim();
  const has = opts.hasExistingSite;
  const mode = opts.mode ?? 'update-site';

  const wantsFullBuild =
    /\b(from scratch|brand[\s-]new\s+site|complete\s+site|full\s+site|new\s+e-?commerce|entire\s+site)\b/i.test(p) ||
    (/^(build|create|design|generate|make)\b/i.test(prompt.trim()) &&
      /\b(website|web\s*site|site|homepage|storefront|store|shop|e-?commerce|landing\s+page)\b/i.test(p)) ||
    (mode === 'new-site' && /\b(site|store|shop|homepage)\b/i.test(p));

  if (wantsFullBuild) {
    return 'build-site';
  }

  if (!has) {
    return 'build-site';
  }

  const sectionSignals =
    /\b(add|insert|include|append|put)\b.*\b(section|block|band|module|strip)\b/i.test(p) ||
    /\b(add|append|another|extra|second)\b.*\b(testimonials?|pricing|packages?|faq|gallery|team|trust|features?|comparison|partners?|logos?)\b/i.test(p) ||
    /\b(new)\b.*\b(section|testimonials?|pricing|faq)\b/i.test(p);

  if (sectionSignals) {
    return 'add-section';
  }

  const styleSignals =
    /\b(more\s+premium|premium|luxury|high[\s-]end|darker|dark(er)?\s+hero|lighter|moody|atmospheric|modern|minimal|clean\s+look|bold\s+typograph|spacing|padding|margin|font|fonts|typography|color\s+palette|palette|gradient|shadow|rounded|sleek|polish|css|styles?|styling)\b/i.test(
      p
    ) ||
    /\b(make\s+it)\b.*\b(premium|modern|dark|clean|minimal|bold|sleek|luxury|apple)\b/i.test(p) ||
    /\b(look|feel)\s+(more\s+)?(like|modern|premium|dark)/i.test(p);

  if (styleSignals && !/\b(text|copy|headline|words?|rewrite)\b/i.test(p)) {
    return 'modify-style';
  }

  const copySignals =
    /\b(headline|subhead|copy|wording|rewrite|messaging|tone|cta|descriptions?|tagline|value\s+prop|punchier|clearer|compelling|seo|microcopy)\b/i.test(p) ||
    /\b(improve|tighten|sharpen|strengthen)\b.*\b(copy|text|writing|headlines?|descriptions?)\b/i.test(p) ||
    /\b(better)\b.*\b(words?|language|messaging)\b/i.test(p);

  if (copySignals) {
    return 'improve-copy';
  }

  if (/\b(improve|better|upgrade|enhance)\s+(the\s+)?(site|page|homepage|layout)\b/i.test(p)) {
    return 'modify-style';
  }

  if (/\b(change|switch|turn)\b.*\b(company|business|brand|industry|vertical)\b/i.test(p)) {
    return 'improve-copy';
  }

  return 'unknown';
}
