import type { ProjectLifecycleStage, Task, TaskChecklistItem } from '@/lib/types/entities';

export type TemplateTaskBlueprint = {
  title: string;
  description: string;
  due: string;
  lifecycleStage: ProjectLifecycleStage;
  checklistLabels: string[];
};

export type ProjectTemplateDef = {
  id: string;
  name: string;
  description: string;
  initialLifecycleStage: ProjectLifecycleStage;
  defaultBudget: number;
  defaultDue: string;
  deliveryFocus: 'client_site' | 'product_other';
  tasks: TemplateTaskBlueprint[];
};

function chk(labels: string[]): TaskChecklistItem[] {
  return labels.map((label, i) => ({ id: `chk-${i}`, label, done: false }));
}

export const PROJECT_TEMPLATES: ProjectTemplateDef[] = [
  {
    id: 'tmpl-standard-website',
    name: 'Standard website build',
    description: 'Full marketing site: discovery through launch with repeatable build tasks.',
    initialLifecycleStage: 'discovery',
    defaultBudget: 28000,
    defaultDue: 'Aug 15',
    deliveryFocus: 'client_site',
    tasks: [
      {
        title: 'Capture inquiry & fit call',
        description: 'Record goals, budget band, and decision timeline.',
        due: 'This week',
        lifecycleStage: 'inquiry',
        checklistLabels: ['Notes in CRM', 'Send recap email', 'Book discovery'],
      },
      {
        title: 'Discovery workshop',
        description: 'Sitemap, audience, and success metrics locked.',
        due: 'Next week',
        lifecycleStage: 'discovery',
        checklistLabels: ['Agenda sent', 'Recording on', 'Miro board prepped'],
      },
      {
        title: 'Proposal & contract pack',
        description: 'Scope, phases, and payment schedule client-ready.',
        due: 'Next week',
        lifecycleStage: 'proposal_contract',
        checklistLabels: ['SOW drafted', 'Fees approved', 'Contract sent'],
      },
      {
        title: 'Homepage build',
        description: 'Ship hero, proof, services, contact CTA, mobile pass.',
        due: 'Week 3',
        lifecycleStage: 'build',
        checklistLabels: [
          'Headline written',
          'Hero CTA',
          'Proof section',
          'Services grid',
          'Contact CTA',
          'Mobile check',
        ],
      },
      {
        title: 'Service pages (×3)',
        description: 'One primary offer per page — clear CTA each.',
        due: 'Week 4',
        lifecycleStage: 'build',
        checklistLabels: ['Template set', 'Copy drafted', 'Internal QA'],
      },
      {
        title: 'Mobile optimization pass',
        description: 'Tap targets, speed, and above-the-fold clarity.',
        due: 'Week 5',
        lifecycleStage: 'build',
        checklistLabels: ['Lighthouse run', 'Tap targets', 'Forms tested'],
      },
      {
        title: 'Client review round',
        description: 'Collect feedback in one thread; batch revisions.',
        due: 'Week 6',
        lifecycleStage: 'review',
        checklistLabels: ['Preview link sent', 'Feedback doc', 'Revision scope agreed'],
      },
      {
        title: 'Launch checklist',
        description: 'Domain, DNS, SSL, analytics, 404, redirects.',
        due: 'Week 7',
        lifecycleStage: 'launch',
        checklistLabels: ['Domain connect', 'Deploy', 'QA checklist', 'Client sign-off'],
      },
      {
        title: 'Post-launch: analytics & CRO note',
        description: '30-day check — what to measure next.',
        due: 'Week 10',
        lifecycleStage: 'post_launch',
        checklistLabels: ['Events verified', 'Baseline saved', 'Next experiment picked'],
      },
    ],
  },
  {
    id: 'tmpl-landing',
    name: 'Landing page',
    description: 'Single high-intent page — fast to scope and ship.',
    initialLifecycleStage: 'proposal_contract',
    defaultBudget: 6500,
    defaultDue: 'Jun 30',
    deliveryFocus: 'client_site',
    tasks: [
      {
        title: 'Offer & audience one-pager',
        description: 'Single promise, single CTA — no kitchen-sink copy.',
        due: 'This week',
        lifecycleStage: 'proposal_contract',
        checklistLabels: ['Headline options', 'Proof bullets', 'CTA label'],
      },
      {
        title: 'Landing build',
        description: 'Hero, proof rail, FAQ, sticky CTA, mobile.',
        due: 'Week 2',
        lifecycleStage: 'build',
        checklistLabels: ['Hero', 'Proof', 'FAQ', 'Sticky CTA', 'Mobile check'],
      },
      {
        title: 'Client review & revisions',
        description: 'One consolidated feedback pass.',
        due: 'Week 3',
        lifecycleStage: 'review',
        checklistLabels: ['Loom walkthrough', 'Change list', 'Approval'],
      },
      {
        title: 'Publish & pixel QA',
        description: 'Form → CRM or email; thank-you state.',
        due: 'Week 4',
        lifecycleStage: 'launch',
        checklistLabels: ['Form test', 'Thank-you page', 'DNS'],
      },
    ],
  },
  {
    id: 'tmpl-redesign',
    name: 'Redesign',
    description: 'Existing site rebuilt on new IA and brand — migration-aware.',
    initialLifecycleStage: 'discovery',
    defaultBudget: 36000,
    defaultDue: 'Sep 1',
    deliveryFocus: 'client_site',
    tasks: [
      {
        title: 'Content & URL inventory',
        description: 'What stays, merges, or redirects.',
        due: 'Week 1',
        lifecycleStage: 'discovery',
        checklistLabels: ['URL map', '404 plan', 'Stakeholder sign-off'],
      },
      {
        title: 'Design system refresh',
        description: 'Typography, color, components for dev.',
        due: 'Week 3',
        lifecycleStage: 'build',
        checklistLabels: ['Figma library', 'Tokens export', 'Component list'],
      },
      {
        title: 'Template migration',
        description: 'Rebuild key templates before cutover.',
        due: 'Week 6',
        lifecycleStage: 'build',
        checklistLabels: ['Home', 'Services', 'Contact', 'Legal'],
      },
      {
        title: 'Review with client',
        description: 'Side-by-side old vs new on staging.',
        due: 'Week 8',
        lifecycleStage: 'review',
        checklistLabels: ['Staging link', 'Feedback captured', 'Sign-off'],
      },
      {
        title: 'Launch & redirect pass',
        description: '301s, Search Console, monitoring.',
        due: 'Week 9',
        lifecycleStage: 'launch',
        checklistLabels: ['301 map', 'Deploy', 'Smoke test'],
      },
    ],
  },
  {
    id: 'tmpl-funnel',
    name: 'High-conversion funnel',
    description: 'Multi-step path: ad → landing → book or buy.',
    initialLifecycleStage: 'build',
    defaultBudget: 12000,
    defaultDue: 'Jul 20',
    deliveryFocus: 'client_site',
    tasks: [
      {
        title: 'Funnel map & tracking plan',
        description: 'Events for each step; drop-off targets.',
        due: 'This week',
        lifecycleStage: 'proposal_contract',
        checklistLabels: ['Step list', 'Event names', 'QA spreadsheet'],
      },
      {
        title: 'Primary landing + variant',
        description: 'A/B hero or CTA if in scope.',
        due: 'Week 2',
        lifecycleStage: 'build',
        checklistLabels: ['Control hero', 'Variant', 'Speed budget'],
      },
      {
        title: 'Thank-you / booking confirmation',
        description: 'Clear next step and trust reinforcement.',
        due: 'Week 2',
        lifecycleStage: 'build',
        checklistLabels: ['Copy', 'Calendar embed', 'Test booking'],
      },
      {
        title: 'Client review',
        description: 'Walkthrough + approval on staging.',
        due: 'Week 3',
        lifecycleStage: 'review',
        checklistLabels: ['Demo call', 'Edits listed', 'Approval'],
      },
      {
        title: 'Go live + monitor',
        description: 'Publish and watch first 48h.',
        due: 'Week 4',
        lifecycleStage: 'launch',
        checklistLabels: ['Deploy', 'Pixels firing', 'Alerting'],
      },
    ],
  },
];

export function getProjectTemplate(templateId: string): ProjectTemplateDef | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === templateId);
}

export function instantiateTemplateTasks(
  projectId: string,
  ownerId: string,
  templateId: string,
  newTaskId: () => string,
  nowIso: string
): Task[] {
  const def = getProjectTemplate(templateId);
  if (!def) return [];
  return def.tasks.map((row) => ({
    id: newTaskId(),
    projectId,
    title: row.title,
    status: 'Todo' as const,
    due: row.due,
    assigneeId: ownerId,
    description: row.description,
    checklist: chk(row.checklistLabels),
    lifecycleStage: row.lifecycleStage,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}
