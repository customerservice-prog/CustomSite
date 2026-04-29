import type { Project } from '@/lib/types/entities';

/** Preset site shapes — drives default copy and section emphasis. */
export type SiteArchetype = 'service_business' | 'ecommerce' | 'landing' | 'agency';

const TEMPLATE_ARCH: Record<string, SiteArchetype> = {
  'tmpl-standard-website': 'service_business',
  'tmpl-landing': 'landing',
  'tmpl-redesign': 'agency',
  'tmpl-funnel': 'landing',
};

export function projectSiteArchetype(project: Project | undefined): SiteArchetype {
  if (!project?.templateId) return 'service_business';
  return TEMPLATE_ARCH[project.templateId] ?? 'service_business';
}

export const ARCHETYPE_LABELS: Record<SiteArchetype, string> = {
  service_business: 'Service business',
  ecommerce: 'E-commerce',
  landing: 'Landing page',
  agency: 'Agency',
};
