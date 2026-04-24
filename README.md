# CustomSite - Web Design Agency

A professional web design agency website where clients can call/contact to get custom websites built, with recurring monthly/yearly maintenance plans.

**Stack:** Node (`server.js`) + static pages, Supabase (auth + DB), optional Stripe/Resend. **Brand assets:** SVG wordmarks in `images/customsite-*.svg` (replace with a PNG if you have the official file — same filenames work).

**Deploy (short):** Connect the repo to Railway (or any Node host), set `PORT`, add Supabase and other vars from `.env.example`, then run the SQL in `supabase/migrations/` in the Supabase SQL editor. Set **`BOOTSTRAP_ADMIN_EMAILS`** (or **`INITIAL_ADMIN_EMAIL`**) to your team email so the first Supabase sign-in gets an admin `public.users` row automatically. See **`docs/LAUNCH-PHASES.md`**.

**What’s next (product):** **`docs/ROADMAP-PHASES.md`** — Sites hub, visual block builder, templates, admin polish, and deploy hardening, in order.

## Project Structure

```
CustomSite/
├── index.html          # Homepage (hero, services, pricing preview, testimonials)
├── pricing.html        # Full pricing page with comparison table, FAQ, maintenance plans
├── portfolio.html      # Portfolio with filterable project grid
├── contact.html        # Contact form + project intake form
├── client-portal.html  # Client login page
├── css/
│   └── styles.css      # Complete stylesheet (1,200+ lines, CSS variables, responsive)
├── js/
│   └── main.js         # All JavaScript (navbar, counters, forms, animations, portal)
└── README.md           # This file
```

## What's Built (Visual/Frontend - COMPLETE)

- [x] Responsive navbar with mobile hamburger menu + scroll effect
- [x] Hero section with animated background shapes and counter stats
- [x] "How It Works" 3-step process section
- [x] Services grid (6 service types)
- [x] Pricing cards with monthly/yearly toggle
- [x] Full pricing comparison table
- [x] Maintenance plans section
- [x] Portfolio grid with category filter buttons
- [x] Testimonials section
- [x] Contact form with full project intake fields
- [x] Client portal login page
- [x] FAQ section
- [x] CTA banners
- [x] Consistent footer across all pages
- [x] Scroll animations (IntersectionObserver)
- [x] CSS custom properties (easy theming)
- [x] Full mobile responsiveness

## What Cursor Should Build Next

### Priority 1 - Contact Form Backend
- [ ] Set up EmailJS (free) OR a Node.js/Express backend
- [ ] Wire up the contact form in `contact.html` to actually send emails
- [ ] Add email notifications to you when a new inquiry comes in
- [ ] Add auto-reply email to the client
- [ ] Files: `js/main.js` (initContactForm function already has TODO comments)

### Priority 2 - Client Portal Authentication  
- [ ] Set up Firebase Auth OR Supabase Auth
- [ ] Implement email/password login in `client-portal.html`
- [ ] Add forgot password flow
- [ ] Add Google SSO option
- [ ] Create protected `dashboard.html` route

### Priority 3 - Client Dashboard (`dashboard.html`)
Build a React or vanilla JS dashboard with:
- [ ] Project progress tracker (stages: Discovery, Design, Development, Review, Live)
- [ ] Messaging thread with the team
- [ ] Invoice list with Stripe payment integration
- [ ] File storage (Firebase Storage or AWS S3)
- [ ] Change request form (creates a ticket)
- [ ] Analytics overview (Google Analytics embed)
- [ ] Maintenance plan status and management

### Priority 4 - Admin Panel (`admin.html`)
Internal tool for you to manage everything:
- [ ] Client list with project statuses
- [ ] Create/edit projects and assign to clients
- [ ] Invoice creation and sending (Stripe)
- [ ] Message clients
- [ ] Time tracking per project
- [ ] Maintenance plan revenue dashboard

### Priority 5 - Billing & Payments
- [ ] Stripe integration for one-time payments (build fee)
- [ ] Stripe Subscriptions for monthly maintenance plans
- [ ] Stripe Customer Portal for clients to manage their subscription
- [ ] Invoice PDF generation
- [ ] Payment receipt emails

### Priority 6 - Backend API
Recommended: Node.js + Express OR Next.js API routes
- [ ] `POST /api/contact` - Contact form submission
- [ ] `POST /api/auth/login` - Client authentication
- [ ] `GET /api/projects/:clientId` - Get client projects
- [ ] `POST /api/invoices` - Create invoice
- [ ] `POST /api/payments` - Process payment
- [ ] `GET /api/messages/:projectId` - Get project messages
- [ ] `POST /api/messages` - Send message
- [ ] `POST /api/change-requests` - Submit a change request

## Recommended Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML/CSS/JS (current) OR migrate to Next.js |
| Auth | Firebase Auth OR Supabase |
| Database | Firestore OR Supabase PostgreSQL |
| File Storage | Firebase Storage OR AWS S3 |
| Payments | Stripe (subscriptions + one-time) |
| Email | EmailJS (simple) OR SendGrid (robust) |
| Hosting | Vercel OR Netlify OR GitHub Pages |
| Scheduling | Calendly embed (contact page) |

## Branding Variables (in css/styles.css)

```css
--primary: #6366f1;      /* Indigo - main brand color */
--secondary: #06b6d4;    /* Cyan - accent */
--accent: #f59e0b;       /* Amber - highlights */
--dark: #0f172a;         /* Background dark */
```
Change these to match your preferred brand colors.

## Quick Customization Checklist

- [ ] Replace "(555) 555-5555" with your real phone number
- [ ] Replace "hello@customsite.com" with your email
- [ ] Replace "CustomSite" with your business name
- [ ] Update pricing if different from defaults
- [ ] Add real portfolio project screenshots
- [ ] Add your real testimonials
- [ ] Add Calendly link to contact page
- [ ] Update social media links in footer
- [ ] Add Google Analytics tracking ID

## Deployment

Simple static deployment (no backend yet):
```bash
# GitHub Pages
# Go to Settings > Pages > Source: main branch

# Netlify (drag and drop)
# Just drop the folder on netlify.com/drop

# Vercel
vercel deploy
```

---
Built with HTML, CSS, and vanilla JavaScript. Ready for Cursor to add backend functionality.
