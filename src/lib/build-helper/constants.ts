export type BuildHelperStepId =
  | 'setup_client'
  | 'create_project'
  | 'plan_site'
  | 'rbyan'
  | 'site_builder'
  | 'preview_qa'
  | 'feedback'
  | 'publish'
  | 'invoice_wrap';

export const BUILD_HELPER_STEPS: { id: BuildHelperStepId; title: string; short: string }[] = [
  { id: 'setup_client', title: 'Setup client', short: 'Add the business you’re building for.' },
  { id: 'create_project', title: 'Create project', short: 'Create a website project for this client.' },
  { id: 'plan_site', title: 'Plan site', short: 'Decide what kind of site you’re building.' },
  { id: 'rbyan', title: 'Generate with Rbyan', short: 'Use Rbyan to create your first version.' },
  { id: 'site_builder', title: 'Edit in Site Builder', short: 'Review and customize the generated site.' },
  { id: 'preview_qa', title: 'Preview and QA', short: 'Check the site before sharing.' },
  { id: 'feedback', title: 'Send for feedback', short: 'Share the preview and request client feedback.' },
  { id: 'publish', title: 'Publish site', short: 'Publish the final version.' },
  { id: 'invoice_wrap', title: 'Invoice / wrap up', short: 'Close the project cleanly.' },
];

export const SITE_TYPE_OPTIONS = [
  { id: 'service', label: 'Service business' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'landing', label: 'Landing page' },
  { id: 'portfolio', label: 'Portfolio / agency' },
] as const;

export const PAGE_OPTIONS = ['Home', 'Services', 'About', 'Contact', 'Shop', 'Pricing'] as const;

export const GOAL_OPTIONS = [
  { id: 'leads', label: 'Get leads' },
  { id: 'sell', label: 'Sell products' },
  { id: 'book_calls', label: 'Book calls' },
  { id: 'quotes', label: 'Request quotes' },
] as const;

export type BuildHelperSitePlan = {
  siteType: string;
  pages: string[];
  goal: string;
  updatedAt: string;
};

export const QA_CHECK_KEYS = ['buttons', 'nav', 'mobile', 'placeholders', 'contact'] as const;
export const QA_CHECK_LABELS: Record<(typeof QA_CHECK_KEYS)[number], string> = {
  buttons: 'Buttons work',
  nav: 'Nav works',
  mobile: 'Mobile looks good',
  placeholders: 'No placeholder text',
  contact: 'Contact info correct',
};

export const PUBLISH_CHECK_KEYS = ['url', 'pages', 'mobile', 'copy'] as const;
export const PUBLISH_CHECK_LABELS: Record<(typeof PUBLISH_CHECK_KEYS)[number], string> = {
  url: 'Production URL works',
  pages: 'Pages load',
  mobile: 'Mobile checked',
  copy: 'Final copy reviewed',
};

export const EDIT_CHECK_KEYS = ['headline', 'cta', 'colors', 'mobile', 'contact'] as const;
export const EDIT_CHECK_LABELS: Record<(typeof EDIT_CHECK_KEYS)[number], string> = {
  headline: 'Headline updated',
  cta: 'CTA updated',
  colors: 'Colors reviewed',
  mobile: 'Mobile layout checked',
  contact: 'Contact info added',
};

export type PerProjectBuildHelper = {
  rbyanDone?: boolean;
  /** User saved from Site Builder after Rbyan output (manual save, not apply-only). */
  savedAfterRbyan?: boolean;
  feedbackSent?: boolean;
  publishConfirmed?: boolean;
  wrapUpMarked?: boolean;
  qa?: Partial<Record<(typeof QA_CHECK_KEYS)[number], boolean>>;
  publishQa?: Partial<Record<(typeof PUBLISH_CHECK_KEYS)[number], boolean>>;
  editChecklist?: Partial<Record<(typeof EDIT_CHECK_KEYS)[number], boolean>>;
};

export const FEEDBACK_MESSAGE =
  "Here's the first version of your site. Please review the layout, copy, and sections. Send any changes you want before I prepare it for launch.";
