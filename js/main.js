// ============================================
// CustomSite - Main JavaScript
// ============================================

'use strict';

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
    if (window.scrollY > 50) {
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
  const elements = document.querySelectorAll(
    '.step-card, .service-card, .price-card, .testimonial-card, .portfolio-card, .section-header'
  );

  if (!elements.length || !window.IntersectionObserver) return;

  elements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
})();

// ============================================
// CONTACT FORM — POST /api/contact
// ============================================
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;

    const serviceSelect = form.querySelector('#service');
    const budgetSelect = form.querySelector('#budget');
    const timelineSelect = form.querySelector('#timeline');

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
        throw new Error(data.error || 'Request failed');
      }
      showFormMessage(form, 'Thanks — your message was sent. We will reply within one business day.', 'success');
      form.reset();
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
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (data.access_token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      }
      if (data.refresh_token) {
        localStorage.setItem(AUTH_REFRESH_KEY, data.refresh_token);
      }
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Login error:', error);
      showFormMessage(loginForm, error.message || 'Invalid email or password.', 'error');
    } finally {
      submitBtn.textContent = 'Sign In to Portal';
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
        alert(err.message || 'Checkout failed. Configure Stripe and price IDs on the server.');
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
  if (!isDash && !isAdmin) return;

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    window.location.replace('client-portal.html');
    return;
  }

  fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((data) => {
      if (isAdmin && data.user && data.user.role !== 'admin') {
        window.location.replace('dashboard.html');
      }
      if (isDash && data.user && data.user.role === 'admin') {
        window.location.replace('admin.html');
      }
    })
    .catch(() => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_REFRESH_KEY);
      window.location.replace('client-portal.html');
    });
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
