'use strict';

/**
 * Init-starter file sets for the site builder. Keys match UI template ids.
 */
const TEMPLATES = {
  basic: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Client site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="hero">
    <h1>Your website</h1>
    <p>Edit HTML, CSS, and JavaScript in the Site builder — no WordPress required.</p>
    <a class="btn" href="#contact">Get in touch</a>
  </header>
  <section id="contact" class="section">
    <h2>Contact</h2>
    <form id="cs-contact-form">
      <p><label>Name<br /><input type="text" name="name" required style="width:100%;max-width:22rem;padding:0.45rem;border-radius:0.35rem;border:1px solid #cbd5e1" /></label></p>
      <p><label>Email<br /><input type="email" name="email" required style="width:100%;max-width:22rem;padding:0.45rem;border-radius:0.35rem;border:1px solid #cbd5e1" /></label></p>
      <p><label>Message<br /><textarea name="message" rows="4" required style="width:100%;max-width:22rem;padding:0.45rem;border-radius:0.35rem;border:1px solid #cbd5e1"></textarea></label></p>
      <button type="submit" class="btn">Send message</button>
      <p id="cs-form-status" aria-live="polite" style="font-size:.9rem"></p>
    </form>
    <script>
(function(){
  var pid = '__CS_PROJECT_UUID__';
  var f = document.getElementById('cs-contact-form');
  if (!f) return;
  f.addEventListener('submit', function(e) {
    e.preventDefault();
    var fd = new FormData(f);
    var body = {}; fd.forEach(function(v,k){ body[k]=v; });
    var st = document.getElementById('cs-form-status');
    fetch('/api/forms/' + pid + '/submit', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), credentials: 'omit' })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return { ok:r.ok, j:j }; }); })
      .then(function(x){ if(st) st.textContent = x.ok && x.j.ok ? 'Thanks — we received your message.' : (x.j.error || 'Something went wrong. Try again.'); })
      .catch(function(){ if(st) st.textContent = 'Network error.'; });
  });
})();
    </script>
  </section>
  <script src="app.js"></script>
</body>
</html>
`,
    'styles.css': `* { box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; margin: 0; color: #0f172a; line-height: 1.6; }
.hero { padding: 4rem 1.5rem; text-align: center; background: linear-gradient(135deg, #1e1b4b, #312e81); color: #fff; }
.hero h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 1rem; }
.hero p { opacity: 0.9; max-width: 36rem; margin: 0 auto 1.5rem; }
.btn { display: inline-block; padding: 0.75rem 1.5rem; background: #6366f1; color: #fff; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
.section { padding: 3rem 1.5rem; max-width: 48rem; margin: 0 auto; }
`,
    'app.js': `document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener("click", function (e) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
  });
});
console.log("Site ready");
`,
  },
  business: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acme — Grow your business</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <nav class="nav"><div class="wrap"><a class="logo" href="#">Acme</a>
    <a href="#about">About</a><a href="#services">Services</a><a class="btn-nav" href="#contact">Get a quote</a></div></nav>
  <header class="hero"><div class="wrap">
    <h1>We help businesses scale online</h1>
    <p>Strategy, design, and development in one team — so you can focus on your customers.</p>
    <a class="btn" href="#contact">Start a project</a>
  </div></header>
  <section id="about" class="section light"><div class="wrap pro"><h2>About</h2>
    <p>Acme is a full-service web partner. We build fast, accessible sites that convert visitors into clients.</p></div></section>
  <section id="services" class="section"><div class="wrap"><h2>Services</h2>
    <div class="grid"><div class="card"><h3>Websites</h3><p>Custom marketing sites, landing pages, and blogs.</p></div>
    <div class="card"><h3>Branding</h3><p>Identity and UI that feel cohesive everywhere.</p></div>
    <div class="card"><h3>Support</h3><p>Ongoing updates, analytics, and hosting guidance.</p></div></div></div></section>
  <section id="contact" class="section cta"><div class="wrap"><h2>Contact</h2>
    <form id="cs-contact-form" style="max-width:26rem;margin:1rem auto 0;text-align:left">
      <p><label>Name<br /><input type="text" name="name" required style="width:100%;padding:0.55rem;border-radius:0.35rem;border:1px solid #cbd5e1" /></label></p>
      <p><label>Email<br /><input type="email" name="email" required style="width:100%;padding:0.55rem;border-radius:0.35rem;border:1px solid #cbd5e1" /></label></p>
      <p><label>Message<br /><textarea name="message" rows="4" required style="width:100%;padding:0.55rem;border-radius:0.35rem;border:1px solid #cbd5e1"></textarea></label></p>
      <button type="submit" class="btn" style="width:100%">Send message</button>
      <p id="cs-form-status" aria-live="polite" style="margin-top:.75rem;font-size:.875rem;color:#cbd5e1"></p>
    </form></div></section>
  <footer class="foot"><div class="wrap">© <span data-y></span> Acme. All rights reserved.</div></footer>
  <script>
(function(){ var pid='__CS_PROJECT_UUID__'; var f=document.getElementById('cs-contact-form');
  if(f) f.addEventListener('submit', function(e){ e.preventDefault(); var fd=new FormData(f), body={};
    fd.forEach(function(v,k){ body[k]=v; }); var st=document.getElementById('cs-form-status');
    fetch('/api/forms/'+pid+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit'})
      .then(function(r){return r.json().catch(function(){return{};}).then(function(j){return{ok:r.ok,j:j};});})
      .then(function(x){if(st) st.textContent=x.ok&&x.j.ok?'Thanks — we received your message.':(x.j.error||'Error.');})
      .catch(function(){ if(st) st.textContent='Network error.'; });
  }); })();
  </script>
  <script src="app.js"></script>
</body>
</html>
`,
    'styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: "Inter", system-ui, sans-serif; color: #0f172a; line-height: 1.6; }
.wrap { max-width: 56rem; margin: 0 auto; padding: 0 1.25rem; }
.nav { position: sticky; top: 0; z-index: 10; background: rgba(15, 23, 42, 0.92); color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.nav .wrap { display: flex; align-items: center; gap: 1.25rem; padding: 0.9rem 1.25rem; flex-wrap: wrap; }
.nav a { color: #cbd5e1; text-decoration: none; font-size: 0.9rem; }
.nav a:hover { color: #fff; }
.logo { font-weight: 800; color: #fff !important; font-size: 1.1rem; }
.btn-nav { margin-left: auto; background: #6366f1; color: #fff !important; padding: 0.4rem 0.9rem; border-radius: 0.35rem; font-weight: 600; }
.hero { padding: 5rem 0; background: linear-gradient(160deg, #0f172a, #1e1b4b); color: #f8fafc; text-align: center; }
.hero h1 { font-size: clamp(2rem, 4vw, 2.75rem); margin: 0 0 1rem; }
.hero p { opacity: 0.9; max-width: 32rem; margin: 0 auto 1.5rem; }
.btn { display: inline-block; padding: 0.8rem 1.4rem; background: #6366f1; color: #fff; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
.section { padding: 3.5rem 0; }
.section.light { background: #f1f5f9; }
.pro { max-width: 40rem; }
.grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; }
.cta { background: #0f172a; color: #e2e8f0; text-align: center; }
.foot { padding: 1.5rem; text-align: center; font-size: 0.85rem; color: #64748b; }
`,
    'app.js': `document.querySelector('[data-y]').textContent = new Date().getFullYear();
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener("click", function (e) {
    var id = a.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
  });
});
`,
  },
  ecommerce: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shop — Product launch</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="bar"><div class="wrap"><span class="brand">Nimbus</span><a class="cart" href="#buy">Cart (0)</a></div></header>
  <section class="product"><div class="wrap two">
    <div class="ph">Product image</div>
    <div>
      <h1>Premium widget</h1>
      <p class="desc">Durable, minimal, and ready to ship. Free returns within 30 days.</p>
      <p class="price">$89 <small>USD</small></p>
      <a id="buy" class="btn" href="#checkout">Add to cart</a>
    </div>
  </div></section>
  <section class="section"><div class="wrap"><h2>Pricing</h2>
    <div class="plans"><div class="plan"><h3>Starter</h3><p class="p">$29/mo</p><ul><li>1 site</li><li>Email support</li></ul></div>
    <div class="plan featured"><h3>Pro</h3><p class="p">$79/mo</p><ul><li>Everything in Starter</li><li>Priority support</li></ul></div>
    <div class="plan"><h3>Enterprise</h3><p class="p">Custom</p><ul><li>SSO & SLA</li><li>Dedicated PM</li></ul></div></div>
  </div></section>
  <section id="checkout" class="section dark"><div class="wrap c"><h2>Ready to check out?</h2><p>Connect Stripe or your payment flow here.</p></div></section>
  <script src="app.js"></script>
</body>
</html>
`,
    'styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #0f172a; }
.wrap { max-width: 64rem; margin: 0 auto; padding: 0 1.25rem; }
.bar { background: #0f172a; color: #e2e8f0; padding: 0.75rem 0; }
.bar .wrap { display: flex; justify-content: space-between; align-items: center; }
.brand { font-weight: 800; }
.cart { color: #a5b4fc; text-decoration: none; font-size: 0.9rem; }
.product { padding: 2.5rem 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
@media (max-width: 700px) { .two { grid-template-columns: 1fr; } }
.ph { background: #e2e8f0; border-radius: 0.75rem; min-height: 14rem; display: flex; align-items: center; justify-content: center; color: #64748b; }
.desc { color: #475569; }
.price { font-size: 2rem; font-weight: 800; }
.btn { display: inline-block; margin-top: 0.5rem; padding: 0.7rem 1.2rem; background: #6366f1; color: #fff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; }
.section { padding: 2.5rem 0; }
.plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; }
.plan { border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; text-align: center; }
.plan.featured { border-color: #6366f1; box-shadow: 0 4px 20px rgba(99,102,241,0.2); }
.p { font-size: 1.5rem; font-weight: 700; }
.dark { background: #0f172a; color: #e2e8f0; }
.c { text-align: center; }
ul { list-style: none; padding: 0; margin: 0.5rem 0 0; font-size: 0.9rem; }
`,
    'app.js': `document.querySelector('.cart')?.addEventListener('click', function (e) {
  e.preventDefault();
  console.log('Cart / Stripe: connect in production when you are ready to sell.');
});
`,
  },
  portfolio: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Studio — Design &amp; build</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="head"><div class="wrap">
    <h1>Studio</h1>
    <p>Websites, brands, and campaigns for teams who care about craft.</p>
  </div></header>
  <section class="work"><div class="wrap"><h2>Selected work</h2>
    <div class="grid"><div class="tile"><span>Case A</span></div><div class="tile"><span>Case B</span></div>
    <div class="tile"><span>Case C</span></div><div class="tile"><span>Case D</span></div></div>
  </div></section>
  <section id="about" class="about"><div class="wrap"><h2>About</h2>
    <p>We are a small agency with senior designers and engineers. Fast turnaround, no jargon.</p></div></section>
  <section id="contact" class="contact"><div class="wrap"><h2>Start a project</h2>
    <a href="mailto:hello@example.com" class="link">hello@example.com</a></div></section>
  <footer class="foot"><div class="wrap">© <span data-y></span> Studio</div></footer>
  <script src="app.js"></script>
</body>
</html>
`,
    'styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: "Georgia", serif; color: #0c0a09; line-height: 1.6; }
.wrap { max-width: 50rem; margin: 0 auto; padding: 0 1.25rem; }
.head { padding: 4rem 0 2rem; border-bottom: 1px solid #e7e5e4; }
.head h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
.work { padding: 2.5rem 0; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
@media (min-width: 800px) { .grid { grid-template-columns: repeat(4, 1fr); } }
.tile { aspect-ratio: 1; background: #d6d3d1; border-radius: 0.35rem; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; color: #44403c; }
.about, .contact { padding: 2rem 0; }
.contact { text-align: center; background: #fafaf9; }
.link { color: #0c0a09; font-weight: 600; }
.foot { padding: 1.5rem; text-align: center; font-size: 0.85rem; color: #78716c; }
`,
    'app.js': `document.querySelector('[data-y]').textContent = new Date().getFullYear();
`,
  },
  restaurant: {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bistro 42 — Local kitchen</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="hero">
    <p class="eyebrow">Open Tue–Sun</p>
    <h1>Bistro 42</h1>
    <p>Seasonal comfort food, neighborhood wines, and warm service.</p>
  </header>
  <section class="section"><div class="wrap"><h2>Menu</h2>
    <ul class="menu"><li><span>Marinated olives</span><em>8</em></li>
    <li><span>House sourdough</span><em>6</em></li>
    <li><span>Rotating pasta</span><em>24</em></li></ul></div></section>
  <section class="section alt"><div class="wrap two"><div>
    <h2>Hours</h2>
    <p>Mon: closed · Tue–Thu 5–10 · Fri–Sat 5–11 · Sun 4–9</p>
  </div><div>
    <h2>Location</h2>
    <p>123 Main St — replace with the client’s address and embed a map.</p>
  </div></div></section>
  <section id="contact" class="section"><div class="wrap c"><a class="btn" href="tel:+15550000000">Call to reserve</a></div></section>
  <script src="app.js"></script>
</body>
</html>
`,
    'styles.css': `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #292524; }
.hero { text-align: center; padding: 3.5rem 1.25rem; background: #1c1917; color: #fafaf9; }
.eyebrow { letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75rem; color: #a8a29e; }
.hero h1 { font-size: 2.5rem; margin: 0.5rem 0; }
.wrap { max-width: 40rem; margin: 0 auto; padding: 0 1.25rem; }
.section { padding: 2.5rem 0; }
.section.alt { background: #f5f5f4; }
.menu { list-style: none; padding: 0; margin: 0; }
.menu li { display: flex; justify-content: space-between; border-bottom: 1px solid #e7e5e4; padding: 0.5rem 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 600px) { .two { grid-template-columns: 1fr; } }
.c { text-align: center; }
.btn { display: inline-block; padding: 0.7rem 1.3rem; background: #b45309; color: #fff; text-decoration: none; border-radius: 0.4rem; font-weight: 600; }
`,
    'app.js': `console.log("Bistro site ready");
`,
  },
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES);

function getTemplateFiles(templateId) {
  const id = templateId && TEMPLATES[templateId] ? templateId : 'basic';
  return TEMPLATES[id];
}

module.exports = {
  TEMPLATES,
  TEMPLATE_KEYS,
  getTemplateFiles,
};
