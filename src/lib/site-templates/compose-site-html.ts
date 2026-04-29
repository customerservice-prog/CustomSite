import type { SiteArchetype } from '@/lib/site-builder/archetypes';
import { CS_STYLES, escapeHtml, navHtml } from '@/lib/site-builder/site-structure-html';
import {
  HOMEPAGE_BLUEPRINT,
  INTERIOR_LANDING_BLUEPRINT,
  INTERIOR_SERVICE_BLUEPRINT,
} from '@/lib/site-templates/page-blueprints';
import { buildSectionByTemplateId, type SectionBuildContext } from '@/lib/site-templates/section-catalog';

/** Full homepage with nav + blueprint sections (includes FAQ + footer). */
export function buildFullSiteIndexHtml(
  archetype: SiteArchetype,
  ctx: { siteTitle: string; clientCompany?: string }
): string {
  const sctx: SectionBuildContext = { siteTitle: ctx.siteTitle, clientCompany: ctx.clientCompany };
  const blocks = HOMEPAGE_BLUEPRINT.map((id) => buildSectionByTemplateId(id, archetype, sctx)).filter(Boolean).join('\n');
  const brand = escapeHtml(ctx.siteTitle);
  const body = `<body class="cs-body">\n${navHtml(ctx.siteTitle)}\n${blocks}\n</body>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
  ${CS_STYLES}
</head>
${body}
</html>`;
}

export type InteriorPageKind = 'service' | 'landing';

/**
 * Interior marketing page — never a single empty card.
 * `kind`: service detail (default) vs campaign landing structure.
 */
export function buildInteriorSitePageHtml(
  archetype: SiteArchetype,
  pageTitle: string,
  siteTitle: string,
  kind: InteriorPageKind = 'service',
  clientCompany?: string
): string {
  const ids = kind === 'landing' ? INTERIOR_LANDING_BLUEPRINT : INTERIOR_SERVICE_BLUEPRINT;
  const sctx: SectionBuildContext = { siteTitle, pageTitle, clientCompany };
  const blocks = ids.map((id) => buildSectionByTemplateId(id, archetype, sctx)).filter(Boolean).join('\n');
  const t = escapeHtml(pageTitle);
  const b = escapeHtml(siteTitle);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t} · ${b}</title>
  ${CS_STYLES}
</head>
<body class="cs-body" style="padding:0 1rem 2.5rem;">
${blocks}
</body>
</html>`;
}
