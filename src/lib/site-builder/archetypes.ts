import type { Project, SiteBuildArchetypeId } from '@/lib/types/entities';

/** Preset site shapes — drives default copy and section emphasis. */
export type SiteArchetype = 'service_business' | 'ecommerce' | 'landing' | 'agency';

const TEMPLATE_ARCH: Record<string, SiteArchetype> = {
  'tmpl-standard-website': 'service_business',
  'tmpl-landing': 'landing',
  'tmpl-redesign': 'agency',
  'tmpl-funnel': 'landing',
};

export function projectSiteArchetype(project: Project | undefined): SiteArchetype {
  const explicit = project?.siteBuildArchetype as SiteArchetype | undefined;
  if (explicit) return explicit;
  if (!project?.templateId) return 'service_business';
  return TEMPLATE_ARCH[project.templateId] ?? 'service_business';
}

export const SITE_BUILD_ARCHETYPE_OPTIONS: { id: SiteBuildArchetypeId; label: string }[] = [
  { id: 'service_business', label: 'Service business' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'landing', label: 'Landing page' },
  { id: 'agency', label: 'Agency / portfolio' },
];

export const ARCHETYPE_LABELS: Record<SiteArchetype, string> = {
  service_business: 'Service business',
  ecommerce: 'E-commerce',
  landing: 'Landing page',
  agency: 'Agency',
};
