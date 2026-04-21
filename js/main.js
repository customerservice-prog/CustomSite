// ============================================
// CustomSite - Main JavaScript
// ============================================
// TODO for Cursor:
// - Add form validation with real-time feedback
// - Integrate EmailJS or similar for contact form
// - Add Stripe payment integration for billing
// - Build out client portal authentication (Firebase/Supabase)
// - Add analytics tracking (Google Analytics 4)
// - Build invoice generation system
// - Add live chat widget integration
// ============================================

'use strict';

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
    hamburger.addEventListener('click', () => {
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
// CONTACT FORM - Basic handler
// TODO for Cursor: Replace with real backend/EmailJS submission
// ============================================
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;

    // Get form data
    const data = {
      name: form.querySelector('#name')?.value.trim(),
      email: form.querySelector('#email')?.value.trim(),
      phone: form.querySelector('#phone')?.value.trim(),
      service: form.querySelector('#service')?.value,
      budget: form.querySelector('#budget')?.value,
      message: form.querySelector('#message')?.value.trim(),
    };

    // Basic validation
    if (!data.name || !data.email || !data.message) {
      showFormMessage(form, 'Please fill in all required fields.', 'error');
      return;
    }

    if (!isValidEmail(data.email)) {
      showFormMessage(form, 'Please enter a valid email address.', 'error');
      return;
    }

    // Show loading state
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      // TODO for Cursor: Replace this with actual API call
      // Example: await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} })
      // Or use EmailJS: await emailjs.send('SERVICE_ID', 'TEMPLATE_ID', data);

      // Simulate API delay for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      showFormMessage(form, 'Message sent! We will get back to you within 24 hours.', 'success');
      form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
      showFormMessage(form, 'Something went wrong. Please try calling us directly.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();

// ============================================
// CLIENT PORTAL LOGIN
// TODO for Cursor: Implement with Firebase Auth or Supabase
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
      // TODO for Cursor: Replace with Firebase/Supabase auth
      // Example Firebase: await signInWithEmailAndPassword(auth, email, password);
      // Example Supabase: await supabase.auth.signInWithPassword({ email, password });

      // Placeholder - redirect to dashboard after login
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Login error:', error);
      showFormMessage(loginForm, 'Invalid email or password. Please try again.', 'error');
      submitBtn.textContent = 'Sign In';
      submitBtn.disabled = false;
    }
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
