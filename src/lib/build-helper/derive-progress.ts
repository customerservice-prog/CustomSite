import type { Client, Invoice, Project } from '@/lib/types/entities';
import type { BuildHelperSitePlan, BuildHelperStepId, PerProjectBuildHelper } from '@/lib/build-helper/constants';
import {
  BUILD_HELPER_STEPS,
  EDIT_CHECK_KEYS,
  PUBLISH_CHECK_KEYS,
  QA_CHECK_KEYS,
} from '@/lib/build-helper/constants';

export type BuildHelperProgressInput = {
  pathname: string;
  selectedClientId: string | null;
  selectedProjectId: string | null;
  clients: Record<string, Client>;
  projects: Record<string, Project>;
  invoices: Record<string, Invoice>;
  plansByProjectId: Record<string, BuildHelperSitePlan>;
  perProject: Record<string, PerProjectBuildHelper>;
};

function planLooksFilled(plan: BuildHelperSitePlan | undefined): boolean {
  if (!plan) return false;
  return Boolean(plan.siteType && plan.goal && plan.pages.length > 0);
}

function allQaDone(flags: PerProjectBuildHelper | undefined): boolean {
  const q = flags?.qa ?? {};
  return QA_CHECK_KEYS.every((k) => q[k] === true);
}

function allPublishQaDone(flags: PerProjectBuildHelper | undefined): boolean {
  const q = flags?.publishQa ?? {};
  return PUBLISH_CHECK_KEYS.every((k) => q[k] === true);
}

function hasInvoiceForProject(invoices: Record<string, Invoice>, projectId: string): boolean {
  return Object.values(invoices).some((inv) => inv.projectId === projectId);
}

function projectPublishDone(p: Project | undefined, flags: PerProjectBuildHelper | undefined): boolean {
  if (!p) return false;
  if (flags?.publishConfirmed) return true;
  if (p.siteStatus === 'live') return true;
  return allPublishQaDone(flags);
}

function wrapUpDone(
  p: Project | undefined,
  invoices: Record<string, Invoice>,
  projectId: string,
  flags: PerProjectBuildHelper | undefined
): boolean {
  if (flags?.wrapUpMarked) return true;
  if (hasInvoiceForProject(invoices, projectId)) return true;
  if (p?.status === 'Live') return true;
  return false;
}

export function deriveBuildHelperStepDone(input: BuildHelperProgressInput): Record<BuildHelperStepId, boolean> {
  const {
    selectedClientId,
    selectedProjectId,
    clients,
    projects,
    invoices,
    plansByProjectId,
    perProject,
    pathname,
  } = input;

  const routeClient = pathname.match(/^\/clients\/([^/]+)/)?.[1] ?? null;
  const routeProject = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const projectId =
    selectedProjectId ||
    (routeProject && routeProject !== 'site' ? routeProject : null) ||
    (pathname.startsWith('/projects/') ? pathname.split('/')[2] : null);
  const clientId =
    selectedClientId ||
    routeClient ||
    (projectId ? projects[projectId]?.clientId : null) ||
    null;

  const clientOk = Boolean(clientId && clients[clientId]);
  const projectOk = Boolean(projectId && projects[projectId]);
  const p = projectId ? projects[projectId] : undefined;
  const flags = projectId ? perProject[projectId] : undefined;
  const plan = projectId ? plansByProjectId[projectId] : undefined;

  const planOk = projectOk && planLooksFilled(plan);

  const rbyanOk = Boolean(projectOk && flags?.rbyanDone);

  const editKeys = flags?.editChecklist ?? {};
  const editManual =
    Boolean(flags?.savedAfterRbyan) ||
    EDIT_CHECK_KEYS.every((k) => editKeys[k] === true);

  const previewOk = projectOk && allQaDone(flags);

  const feedbackOk = Boolean(projectOk && (flags?.feedbackSent || p?.waitingOn === 'client'));

  const publishOk = projectOk && projectPublishDone(p, flags);

  const wrapOk = projectOk && wrapUpDone(p, invoices, projectId!, flags);

  const out: Record<BuildHelperStepId, boolean> = {
    setup_client: clientOk,
    create_project: projectOk,
    plan_site: planOk,
    rbyan: rbyanOk,
    site_builder: projectOk && rbyanOk && editManual,
    preview_qa: projectOk && previewOk,
    feedback: projectOk && feedbackOk,
    publish: projectOk && publishOk,
    invoice_wrap: projectOk && wrapOk,
  };

  return out;
}

export function highlightStepForPath(pathname: string): BuildHelperStepId | null {
  if (pathname.startsWith('/clients')) return 'setup_client';
  if (pathname === '/projects' || /^\/projects\/[^/]+$/.test(pathname)) return 'create_project';
  if (pathname.includes('/site')) return 'site_builder';
  if (pathname.startsWith('/rbyan')) return 'rbyan';
  if (pathname.startsWith('/invoices')) return 'invoice_wrap';
  return null;
}

export function countDone(done: Record<BuildHelperStepId, boolean>): number {
  return BUILD_HELPER_STEPS.filter((s) => done[s.id]).length;
}

export function firstIncompleteStep(done: Record<BuildHelperStepId, boolean>): BuildHelperStepId {
  for (const s of BUILD_HELPER_STEPS) {
    if (!done[s.id]) return s.id;
  }
  return 'invoice_wrap';
}
