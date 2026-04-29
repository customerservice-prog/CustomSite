import type { SiteArchetype } from '@/lib/site-builder/archetypes';

/** High-level site “shape” — same keys as `SiteArchetype` for one coherent model. */
export type SiteTypeId = SiteArchetype;

export type SiteTypeMetadata = {
  id: SiteTypeId;
  label: string;
  conversionGoal: string;
  recommendedCopyStyle: string;
  /** Default marketing pages this site type expects (labels, not paths). */
  defaultPageLabels: string[];
};

export const SITE_TYPE_METADATA: Record<SiteTypeId, SiteTypeMetadata> = {
  service_business: {
    id: 'service_business',
    label: 'Service business',
    conversionGoal: 'Turn visitors into booked calls or quote requests.',
    recommendedCopyStyle: 'Outcome-first headlines, proof in numbers, one primary CTA per page.',
    defaultPageLabels: ['Home', 'Services', 'About', 'Contact'],
  },
  ecommerce: {
    id: 'ecommerce',
    label: 'E-commerce',
    conversionGoal: 'Move visitors from category interest to product or quote action.',
    recommendedCopyStyle: 'Stock clarity, delivery windows, bundle tiers, urgency tied to real logistics.',
    defaultPageLabels: ['Home', 'Shop', 'Product', 'Bundles', 'Contact'],
  },
  landing: {
    id: 'landing',
    label: 'Landing page',
    conversionGoal: 'Convert cold or paid traffic on a single offer with minimal navigation.',
    recommendedCopyStyle: 'One hero promise, stacked proof, FAQ kills objections, repeated CTA.',
    defaultPageLabels: ['Landing'],
  },
  agency: {
    id: 'agency',
    label: 'Agency / portfolio',
    conversionGoal: 'Earn the fit call with selective work proof and clear process.',
    recommendedCopyStyle: 'Case snapshots, process steps, premium tone, low-friction consult CTA.',
    defaultPageLabels: ['Home', 'Work', 'Services', 'Contact'],
  },
};

export function siteTypeLabel(id: SiteTypeId): string {
  return SITE_TYPE_METADATA[id].label;
}
