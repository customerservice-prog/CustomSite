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

export const FEEDBACK_MESSAGE =
  "Here's the first version of your site. Please review the layout, copy, and sections. Send any changes you want before I prepare it for launch.";
