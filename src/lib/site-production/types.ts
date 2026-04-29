export type SiteSectionKind = 'hero' | 'proof' | 'cta' | 'text';

export type SiteSectionLayout = 'full' | 'narrow' | 'split';

export type SiteSection = {
  id: string;
  kind: SiteSectionKind;
  order: number;
  visible: boolean;
  layout: SiteSectionLayout;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type SitePageDefinition = {
  path: string;
  name: string;
  /** Where this page is in production — shown to team and client. */
  publishState: 'draft' | 'in_progress' | 'published';
  updatedLabel: string;
};
