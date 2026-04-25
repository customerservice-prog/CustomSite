// ============================================
// CustomSite - Main JavaScript
// ============================================

'use strict';

/** 20-min Calendly URL — set CALENDLY_20_MIN in Railway/.env, or window.CALENDLY_20_MIN, or /api/config/public. Leave empty so links stay contact.html until configured. */
const CALENDLY_20_MIN = '';

/** Top-right auto-dismiss toasts (replaces alert() on public pages). */
function showPageToast(message, type) {
  const kind = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
  let host = document.getElementById('pageToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'pageToastHost';
    host.style.cssText =
      'position:fixed;top:0.75rem;right:0.75rem;z-index:20000;display:flex;flex-direction:column;gap:0.4rem;max-width:20rem;pointer-events:none';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  const bg = kind === 'success' ? '#15803d' : kind === 'error' ? '#b91c1c' : '#1e3a5f';
  el.style.cssText = `background:${bg};color:#fff;padding:0.6rem 0.9rem;border-radius:0.4rem;font-size:0.85rem;pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,0.25)`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

const AUTH_TOKEN_KEY = 'customsite_access_token';
const AUTH_REFRESH_KEY = 'customsite_refresh_token';

// ============================================
// NAVBAR - Scroll behavior + mobile menu
// ============================================
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (!navbar) return;

  // Shrink navbar on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile hamburger toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded',
        navLinks.classList.contains('open') ? 'true' : 'false'
      );
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });
  }
})();

// ============================================
// ANIMATED COUNTER - Hero stats
// ============================================
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const duration = 2000;
    const start = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    };
    requestAnimationFrame(update);
  };

  // Use IntersectionObserver to trigger when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
})();

// ============================================
// SCROLL ANIMATIONS - Fade in on scroll
// ============================================
(function initScrollAnimations() {
  // Content visibility must never depend on IntersectionObserver (see April 2026 audit). Mark visible for any legacy CSS.
  function runFadeIn() {
    const elements = document.querySelectorAll(
      '.step-card, .service-card, .testimonial-card, .portfolio-card, .price-card, .section-header, .about-founder, .industry-pills, .process-timeline__item, .why-not-fiverr, .results-splash__list li, .results-splash, .pricing-preview, #pricing-preview, .testimonials, #why-us, .tech-strip-section, .tech-strip__item, section#services, section#industries, section.trust-section, .services-grid, .services, .results-splash__link, .case-study-block'
    );
    elements.forEach((el) => {
      el.classList.add('fade-in', 'visible');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFadeIn);
  } else {
    runFadeIn();
  }
})();

// ============================================
// CONTACT FORM — POST /api/contact
// ============================================
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const rawTier = (params.get('tier') || params.get('package') || '').toLowerCase();
  const tier = /^(starter|business|ecommerce|enterprise)$/.test(rawTier) ? rawTier : '';
  if (tier) {
    const msg = form.querySelector('#message');
    if (msg && !String(msg.value).trim()) {
      if (tier === 'enterprise') {
        msg.value = 'I am interested in an Enterprise engagement (custom scoping) and would like a consultation. ';
      } else {
        const label = tier === 'ecommerce' ? 'e-commerce' : tier;
        msg.value = `I am interested in the ${label} build tier. `;
      }
    }
    const serviceSelect = form.querySelector('#service');
    if (serviceSelect) {
      if (tier === 'enterprise') {
        serviceSelect.value = 'other';
      } else {
        const tierToService = { starter: 'business', business: 'business', ecommerce: 'ecommerce' };
        const v = tierToService[tier];
        if (v) serviceSelect.value = v;
      }
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;

    const serviceSelect = form.querySelector('#service');
    const budgetSelect = form.querySelector('#budget');
    const timelineSelect = form.querySelector('#timeline');

    const hp = form.querySelector('[name="cs_hp_website"]')?.value || '';
    if (String(hp).trim()) {
      return;
    }

    const payload = {
      name: form.querySelector('#name')?.value.trim(),
      email: form.querySelector('#email')?.value.trim(),
      phone: form.querySelector('#phone')?.value.trim() || '',
      company: form.querySelector('#company')?.value.trim() || '',
      service_type: serviceSelect?.options[serviceSelect.selectedIndex]?.text?.trim() || '',
      budget: budgetSelect?.options[budgetSelect.selectedIndex]?.text?.trim() || '',
      timeline: timelineSelect?.options[timelineSelect.selectedIndex]?.text?.trim() || '',
      message: form.querySelector('#message')?.value.trim(),
      current_url: form.querySelector('#currentSite')?.value.trim() || '',
      cs_hp_website: '',
    };

    if (!payload.name || !payload.email || !payload.message) {
      showFormMessage(form, 'Please fill in all required fields.', 'error');
      return;
    }

    if (!isValidEmail(payload.email)) {
      showFormMessage(form, 'Please enter a valid email address.', 'error');
      return;
    }

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.error || 'Too many requests. Please try again in a few minutes.');
        }
        throw new Error(data.error || 'Request failed');
      }
      const wrap = form.parentElement;
      form.classList.add('is-sent');
      wrap.innerHTML = `
        <div class="form-success" style="background:var(--light);padding:2.5rem;border-radius:var(--radius-lg);border:1px solid rgba(0,0,0,0.08);text-align:center">
          <h3 style="color:var(--dark);font-size:1.35rem;margin-bottom:0.5rem">Thanks — we got your request</h3>
          <p style="color:var(--gray)">We typically reply within one business day. You will get a copy at the email you provided when our inbox is connected.</p>
          <p style="margin-top:1.25rem"><a href="index.html" class="btn btn-primary">Back to home</a></p>
        </div>`;
    } catch (error) {
      console.error('Form submission error:', error);
      showFormMessage(form,
        error.message || 'Something went wrong. Please email hello@customsite.online directly.',
        'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();

// ============================================
// CLIENT PORTAL LOGIN — POST /api/auth/login
// ============================================
(function initPortalLogin() {
  const loginForm = document.getElementById('portalLoginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (window.location.protocol === 'file:') {
      showFormMessage(
        loginForm,
        'Open this page from the server: http://localhost:3000/client-portal.html (not a saved file in your browser).',
        'error'
      );
      return;
    }

    const email = loginForm.querySelector('#portalEmail')?.value.trim();
    const password = loginForm.querySelector('#portalPassword')?.value;
    const submitBtn = loginForm.querySelector('[type="submit"]');

    if (!email || !password) {
      showFormMessage(loginForm, 'Please enter your email and password.', 'error');
      return;
    }

    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        if (!res.ok) {
          throw new Error(
            res.status ? `Login failed (HTTP ${res.status}).` : 'Login failed. Try again.'
          );
        }
      }
      if (!res.ok) {
        const msg = data.error || data.message || (raw && raw.length < 400 ? raw : '') || 'Login failed';
        throw new Error(String(msg).trim() || 'Login failed');
      }
      if (!data.access_token) {
        throw new Error('No access token returned. Is the server running? Check the terminal for errors.');
      }
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(AUTH_REFRESH_KEY, data.refresh_token);
      }
      const isAdmin = data.user && data.user.role === 'admin';
      const nextPage = isAdmin ? '/admin.html' : '/dashboard.html';
      window.location.replace(nextPage);
    } catch (error) {
      console.error('Login error:', error);
      showFormMessage(loginForm, error.message || 'Invalid email or password.', 'error');
    } finally {
      const agency = new URLSearchParams(window.location.search).get('agency') === '1';
      submitBtn.textContent = agency ? 'Sign in to admin' : 'Sign In to Portal';
      submitBtn.disabled = false;
    }
  });
})();

// ============================================
// STRIPE CHECKOUT — build fee (pricing + home)
// ============================================
(function initStripeCheckout() {
  document.querySelectorAll('.js-stripe-checkout').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const planId = el.getAttribute('data-plan');
      if (!planId) return;
      const prev = el.textContent;
      el.textContent = 'Redirecting…';
      el.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Could not start checkout');
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error('No checkout URL');
      } catch (err) {
        showPageToast(err.message || 'Checkout failed. Configure Stripe and price IDs on the server.', 'error');
      } finally {
        el.textContent = prev;
        el.removeAttribute('aria-busy');
      }
    });
  });
})();

// ============================================
// PROTECTED PAGES — dashboard / admin
// ============================================
(function initProtectedPages() {
  const path = window.location.pathname || '';
  const isDash = path.endsWith('dashboard.html');
  const isAdmin = path.endsWith('admin.html');
  const isSiteBuilder = path.endsWith('site-builder.html');
  if (!isDash && !isAdmin && !isSiteBuilder) return;

  (async function run() {
    if (window.__csAuthReady) {
      try {
        await window.__csAuthReady;
      } catch (e) {
        console.error(e);
      }
    }
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      const agencyEntry = isAdmin || isSiteBuilder
        ? 'client-portal.html?agency=1'
        : 'client-portal.html';
      window.location.replace(agencyEntry);
      return;
    }

    return fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (isAdmin && data.user && data.user.role !== 'admin') {
          window.location.replace('dashboard.html');
        }
        if (isSiteBuilder && data.user && data.user.role !== 'admin') {
          window.location.replace('dashboard.html');
        }
        if (isDash && data.user && data.user.role === 'admin') {
          window.location.replace('admin.html');
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_REFRESH_KEY);
        const agencyEntry = isAdmin || isSiteBuilder
          ? 'client-portal.html?agency=1'
          : 'client-portal.html';
        window.location.replace(agencyEntry);
      });
  })();
})();

// ============================================
// AGENCY sign-in copy (?agency=1 on client-portal)
// ============================================
(function initAgencyPortalCopy() {
  if (new URLSearchParams(window.location.search).get('agency') !== '1') return;
  if (!document.getElementById('portalLoginForm')) return;

  const h2 = document.querySelector('.portal-box h2');
  const sub = document.querySelector('.portal-box .sub');
  const btn = document.querySelector('#portalLoginForm [type="submit"]');
  const divider = document.querySelector('.portal-divider span');
  const preview = document.querySelector('.dashboard-preview');

  if (h2) h2.textContent = 'Agency sign-in';
  if (sub) {
    sub.textContent =
      'Use your team (admin) account. After sign-in you will be taken to the admin panel and the site builder.';
  }
  if (btn) btn.textContent = 'Sign in to admin';
  if (divider) divider.textContent = 'What you can do in admin';

  if (preview) {
    preview.innerHTML = [
      { icon: 'LEA', text: 'Review leads, convert to clients, set project status' },
      { icon: 'BIL', text: 'Create invoices, record payments' },
      { icon: 'MSG', text: 'Message each client in their project thread' },
      { icon: 'BUI', text: 'Open the site builder to edit the files for each project' },
    ]
      .map(
        (row) => `
      <div class="dashboard-feature">
        <div class="df-icon">${row.icon}</div>
        <div class="df-text">${row.text}</div>
      </div>`
      )
      .join('');
  }

  if (document.title) {
    document.title = document.title.replace('Client Portal', 'Agency sign-in');
  }
})();

// ============================================
// PRICING TOGGLE - Monthly/Yearly
// ============================================
(function initPricingToggle() {
  const toggle = document.getElementById('pricingToggle');
  if (!toggle) return;

  const prices = {
    starter: { monthly: 49, yearly: 470 },
    business: { monthly: 79, yearly: 758 },
    ecommerce: { monthly: 99, yearly: 950 },
    enterprise: { monthly: 299, yearly: 2990 },
  };

  toggle.addEventListener('change', () => {
    const isYearly = toggle.checked;
    const period = isYearly ? 'yearly' : 'monthly';

    document.querySelectorAll('[data-plan]').forEach(el => {
      const plan = el.getAttribute('data-plan');
      const priceEl = el.querySelector('.maintenance-price');
      if (priceEl && prices[plan]) {
        const amount = prices[plan][period];
        priceEl.textContent = isYearly
          ? '$' + amount + '/yr (2 months free!)'
          : '$' + amount + '/mo';
      }
    });
  });
})();

// ============================================
// PORTFOLIO FILTER
// ============================================
(function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('[data-filter]');
  const portfolioItems = document.querySelectorAll('[data-category]');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide items
      portfolioItems.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = '';
          item.classList.add('visible');
        } else {
          item.style.display = 'none';
          item.classList.remove('visible');
        }
      });
    });
  });
})();

// ============================================
// HELPER FUNCTIONS
// ============================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFormMessage(form, message, type) {
  // Remove existing message
  const existing = form.querySelector('.form-message');
  if (existing) existing.remove();

  const msgEl = document.createElement('div');
  msgEl.className = 'form-message form-message--' + type;
  msgEl.textContent = message;
  msgEl.style.cssText = `
    padding: 0.875rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    margin-top: 1rem;
    background: ${type === 'success' ? '#d1fae5' : '#fee2e2'};
    color: ${type === 'success' ? '#065f46' : '#991b1b'};
    border: 1px solid ${type === 'success' ? '#a7f3d0' : '#fecaca'};
  `;

  form.appendChild(msgEl);

  // Auto-remove after 6 seconds
  setTimeout(() => msgEl.remove(), 6000);
}

// ============================================
// SMOOTH SCROLL for anchor links
// ============================================
(function initCopyEmailCta() {
  const b = document.getElementById('copyEmailCta');
  if (!b) return;
  b.addEventListener('click', async () => {
    const em = b.getAttribute('data-email') || 'hello@customsite.online';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(em);
        showPageToast('Copied ' + em, 'success');
      } else {
        showPageToast(em, 'info');
      }
    } catch (e) {
      showPageToast(em, 'info');
    }
  });
})();

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================
// ACTIVE NAV LINK on scroll
// ============================================
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + entry.target.id) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(section => observer.observe(section));
})();

// ============================================
// Calendly — data-book-call="1" (env CALENDLY_20_MIN via /api/config/public)
// Invalid or placeholder URLs never hydrate — links stay on the contact form anchor.
// ============================================
(function initCalendly20Links() {
  const FALLBACK = 'contact.html#contactForm';
  /** Mirrors server lib/calendlyUrl.js — only real https://calendly.com/user/event URLs. */
  function isUsableCalendlyUrl(u) {
    const s = String(u || '').trim();
    if (!s || s.toLowerCase().includes('replace-me')) return false;
    if (!/^https:\/\//i.test(s)) return false;
    let url;
    try {
      url = new URL(s);
    } catch {
      return false;
    }
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'calendly.com') return false;
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.length >= 2;
  }
  function stripInvalidCalendly() {
    document.querySelectorAll('a[data-book-call="1"]').forEach((a) => {
      const h = a.getAttribute('href') || '';
      if (
        h.indexOf('REPLACE-ME') !== -1 ||
        h.indexOf('calendly.com/REPLACE-ME') !== -1 ||
        (/calendly\.com/i.test(h) && !isUsableCalendlyUrl(h))
      ) {
        a.setAttribute('href', FALLBACK);
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
  }
  function applyUrl(u) {
    if (!isUsableCalendlyUrl(u)) return;
    document.querySelectorAll('a[data-book-call="1"]').forEach((a) => {
      a.setAttribute('href', u);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }
  stripInvalidCalendly();
  const w =
    (typeof window !== 'undefined' && window.CALENDLY_20_MIN) || null;
  if (w && isUsableCalendlyUrl(w)) {
    applyUrl(w);
    return;
  }
  if (CALENDLY_20_MIN && isUsableCalendlyUrl(CALENDLY_20_MIN)) {
    applyUrl(CALENDLY_20_MIN);
    return;
  }
  fetch('/api/config/public', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j && j.calendly20Min && isUsableCalendlyUrl(j.calendly20Min)) applyUrl(j.calendly20Min);
      else stripInvalidCalendly();
    })
    .catch(() => {
      stripInvalidCalendly();
    });
})();
