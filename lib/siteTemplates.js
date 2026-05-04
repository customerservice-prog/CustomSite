'use strict';

/**
 * Premium single-file starters (Soul Vault / Cestui-tier dark editorial).
 * Each pack is index.html only — inline CSS + platform contact handler + sticky nav / count-up.
 * Legacy ids `business` → service, `portfolio` → creative.
 */

const FORM_IIFE = `(function(){var pid='__CS_PROJECT_UUID__';var f=document.getElementById('cs-contact-form');
if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();var fd=new FormData(f),body={};
fd.forEach(function(v,k){body[k]=v;});body.current_url=typeof location!=='undefined'?location.href:'';
var st=document.getElementById('cs-form-status');
fetch('/api/forms/'+pid+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify(body),credentials:'omit'})
.then(function(r){return r.json().catch(function(){return{};}).then(function(j){return{ok:r.ok,j:j};});})
.then(function(x){if(st)st.textContent=x.ok&&x.j.ok?'Thanks — we received your message.':(x.j.error||'Something went wrong. Try again.');})
.catch(function(){if(st)st.textContent='Network error.';});});})();`;

const INTERACTION_JS = `const nav=document.querySelector('nav');
if(nav)window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>40);},{passive:true});
var counters=document.querySelectorAll('.stat-num[data-target]');
if(counters.length){var io=new IntersectionObserver(function(entries){
entries.forEach(function(entry){if(!entry.isIntersecting)return;var el=entry.target;
var target=parseFloat(el.getAttribute('data-target'));if(isNaN(target))target=0;
var suffix=el.getAttribute('data-suffix')||'';var dec=String(el.getAttribute('data-target')).indexOf('.')>=0||target%1!==0;
var cur=0,steps=60,dur=1200,step=Math.max(target/steps,0.01);var iv=setInterval(function(){
cur=Math.min(cur+step,target);if(dec){el.textContent=Math.min(cur,target).toFixed(1)+suffix;}
else{el.textContent=Math.floor(cur).toLocaleString()+suffix;}
if(cur>=target-0.0001){clearInterval(iv);if(dec)el.textContent=Number(el.getAttribute('data-target')).toFixed(1)+suffix;
else el.textContent=Math.floor(target).toLocaleString()+suffix;}},dur/steps);io.unobserve(el);});},{threshold:0.5});
counters.forEach(function(c){io.observe(c);});}`;

const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;font-size:16px;}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*,*::before,*::after{transition:none!important;animation:none!important;}}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased;}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
padding:1.25rem 3rem;transition:background .4s ease,padding .3s ease,backdrop-filter .4s;background:transparent;}
nav.scrolled{background:rgba(var(--bg-rgb),0.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
padding:.85rem 3rem;border-bottom:1px solid rgba(var(--accent-rgb),.15);}
.nav-logo{font-family:var(--font-head);font-size:1.1rem;font-weight:700;color:var(--accent);text-decoration:none;letter-spacing:.06em;}
.nav-links{display:flex;gap:2rem;list-style:none;flex-wrap:wrap;justify-content:center;}
.nav-links a{color:var(--text);text-decoration:none;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;opacity:.85;transition:color .3s,opacity .3s;}
.nav-links a:hover{color:var(--accent);opacity:1;}
.nav-dots{font-size:.72rem;letter-spacing:.25em;color:var(--accent);opacity:.5;margin-left:.25rem;}
.nav-cta{background:var(--accent);color:var(--bg);padding:.55rem 1.35rem;border-radius:2px;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;
text-decoration:none;font-weight:700;transition:opacity .3s,transform .3s;}
.nav-cta:hover{opacity:.9;transform:translateY(-1px);}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:7rem 1.75rem 4.5rem;position:relative;overflow:hidden;}
.hero-split{display:grid;grid-template-columns:1fr 1fr;gap:3rem;text-align:left;align-items:center;max-width:1200px;margin:0 auto;}
@media(max-width:900px){.hero-split{grid-template-columns:1fr;text-align:center;}}
.hero-visual{min-height:220px;background:linear-gradient(145deg,rgba(var(--accent-rgb),.12),transparent);border:1px solid rgba(var(--accent-rgb),.2);
border-radius:4px;position:relative;}
.particles::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(var(--accent-rgb),.15) 1px,transparent 1px);
background-size:24px 24px;opacity:.5;pointer-events:none;}
.inner{max-width:1200px;margin:0 auto;padding:0 1.75rem;}
.eyebrow{display:block;font-size:.72rem;letter-spacing:.3em;text-transform:uppercase;color:var(--accent);opacity:.75;margin-bottom:1.1rem;}
h1{font-family:var(--font-head);font-size:clamp(2.6rem,5.5vw,4.75rem);font-weight:700;line-height:1.08;color:var(--accent);margin-bottom:1.35rem;}
.hero-sub{font-size:1.1rem;opacity:.78;max-width:36rem;margin:0 auto 2rem;line-height:1.65;}
.btn-row{display:flex;gap:.9rem;flex-wrap:wrap;justify-content:center;}
.btn-p{background:var(--accent);color:var(--bg);padding:.8rem 2rem;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;
text-decoration:none;border-radius:2px;transition:opacity .3s,transform .3s;display:inline-block;}
.btn-p:hover{opacity:.92;transform:translateY(-2px);}
.btn-g{border:1px solid var(--accent);color:var(--accent);padding:.8rem 2rem;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;
font-weight:700;text-decoration:none;border-radius:2px;background:transparent;transition:all .3s;display:inline-block;}
.btn-g:hover{background:var(--accent);color:var(--bg);}
.badge{display:inline-block;padding:.3rem .9rem;font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;border-radius:2px;margin-bottom:1rem;
border:1px solid rgba(var(--accent-rgb),.4);background:rgba(var(--accent-rgb),.08);color:var(--accent);}
section{padding:5.5rem 1.75rem;}
.section-alt{background:var(--bg-alt);}
.section-head{text-align:center;margin-bottom:3.25rem;}
section h2{font-family:var(--font-head);font-size:clamp(1.75rem,3.5vw,2.85rem);font-weight:700;color:var(--text);line-height:1.18;}
section h2 em{color:var(--accent);font-style:normal;}
.divider{width:54px;height:2px;background:var(--accent);opacity:.45;margin:.85rem auto 0;border:none;}
.sec-sub{font-size:1rem;opacity:.65;max-width:34rem;margin:1rem auto 0;}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;border:1px solid rgba(var(--accent-rgb),.2);}
.stat{padding:2.25rem 1rem;text-align:center;border-right:1px solid rgba(var(--accent-rgb),.2);}
.stat:last-child{border-right:none;}
.stat-num{font-family:var(--font-head);font-size:2.5rem;font-weight:700;color:var(--accent);line-height:1;display:block;}
.stat-lab{font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;opacity:.5;margin-top:.45rem;display:block;}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.35rem;}
.card{background:var(--card-bg);border:1px solid rgba(var(--accent-rgb),.15);padding:2rem;border-radius:3px;transition:border-color .3s,transform .3s;}
.card:hover{border-color:var(--accent);transform:translateY(-4px);}
.card-ic{font-size:1.65rem;display:block;margin-bottom:.75rem;}
.card h3{font-family:var(--font-head);font-size:1.12rem;color:var(--accent);margin-bottom:.5rem;}
.card p{font-size:.92rem;opacity:.65;line-height:1.6;}
.t-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1.35rem;}
.t-card{background:var(--card-bg);border-left:3px solid var(--accent);padding:1.75rem;border-radius:0 3px 3px 0;}
.stars{color:var(--accent);letter-spacing:.2rem;font-size:.85rem;margin-bottom:.65rem;display:block;}
.t-card blockquote{font-style:italic;opacity:.82;margin-bottom:.75rem;line-height:1.65;}
.t-card cite{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;opacity:.5;font-style:normal;}
.practice{border-bottom:1px solid rgba(var(--accent-rgb),.12);padding:1.5rem 0;display:flex;gap:1rem;}
.practice:last-child{border-bottom:none;}
.pr-num{color:var(--accent);font-size:.68rem;letter-spacing:.2em;padding-top:.2rem;}
.practice h3{font-family:var(--font-head);font-size:1.05rem;color:var(--text);margin-bottom:.35rem;}
.practice p{font-size:.84rem;opacity:.6;}
.contact-form{max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:.85rem;}
.contact-form label{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;opacity:.65;}
.contact-form input,.contact-form textarea{background:var(--card-bg);border:1px solid rgba(var(--accent-rgb),.25);color:var(--text);padding:.85rem;border-radius:2px;font-family:inherit;font-size:1rem;outline:none;}
.contact-form textarea{resize:vertical;min-height:120px;}
.contact-form button.btn-p{border:none;cursor:pointer;font-family:inherit;text-align:center;}
footer{background:var(--bg-alt);border-top:1px solid rgba(var(--accent-rgb),.18);padding:2.75rem 1.75rem;}
.ft-in{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:2rem;flex-wrap:wrap;}
.ft-brand{font-family:var(--font-head);color:var(--accent);font-weight:700;font-size:1.05rem;}
.ft-links{display:flex;gap:1.5rem;flex-wrap:wrap;list-style:none;}
.ft-links a{color:var(--text);opacity:.55;text-decoration:none;font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;}
.ft-links a:hover{opacity:1;}
.ft-copy{font-size:.72rem;opacity:.38;letter-spacing:.06em;}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1px;background:rgba(var(--accent-rgb),.15);border:1px solid rgba(var(--accent-rgb),.15);}
.menu-cell{background:var(--bg);padding:1.75rem;}
.menu-cell h4{font-family:var(--font-head);color:var(--accent);margin-bottom:.35rem;font-size:1.05rem;}
.menu-cell .pr{color:var(--accent);font-weight:700;margin-top:.5rem;font-size:.85rem;}
.port-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;}
.port-tile{aspect-ratio:1;background:var(--card-bg);border:1px solid rgba(var(--accent-rgb),.15);border-radius:3px;display:flex;align-items:center;
justify-content:center;font-size:.75rem;text-transform:uppercase;letter-spacing:.15em;opacity:.6;transition:border-color .3s,opacity .3s;}
.port-tile:hover{border-color:var(--accent);opacity:.9;}
.logo-row{display:flex;flex-wrap:wrap;justify-content:center;gap:2rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.2em;opacity:.35;}
@media(max-width:768px){
nav{padding:1rem;}
nav.scrolled{padding:.75rem 1rem;}
.nav-links{display:none;}
section{padding:3.75rem 1.15rem;}
.ft-in{flex-direction:column;text-align:center;}
}`;

/**
 * @param {{
 * fontHref: string,
 * metaTitle: string,
 * rootVars: string,
 * navLinks: Array<{href: string, label: string}>,
 * navDot?: boolean,
 * navCta: {href: string, label: string},
 * heroInner: string,
 * bodySections: string,
 * footerLinks: Array<{href: string, label: string}>,
 * }} opts
 */
function premiumPage(opts) {
  const navLis = opts.navLinks.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  const dot = opts.navDot ? `<span class="nav-dots" aria-hidden="true"> ·</span>` : '';
  const ftLis = opts.footerLinks.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');

  const contactSection = `
<section id="contact" class="section section-alt">
  <div class="inner">
    <div class="section-head">
      <span class="eyebrow">{{CONTACT_EYEBROW}}</span>
      <h2><em>{{CONTACT_HEAD}}</em></h2>
      <div class="divider"></div>
    </div>
    <form id="cs-contact-form" class="contact-form">
      <div><label for="nf">Name</label><input id="nf" type="text" name="name" required autocomplete="name"/></div>
      <div><label for="ef">Email</label><input id="ef" type="email" name="email" required autocomplete="email"/></div>
      <div><label for="pf">Phone (optional)</label><input id="pf" type="tel" name="phone" autocomplete="tel"/></div>
      <div><label for="mf">Message</label><textarea id="mf" name="message" required rows="4"></textarea></div>
      <button type="submit" class="btn-p">Send Message</button>
      <p id="cs-form-status" aria-live="polite" style="text-align:center;font-size:.85rem;margin-top:.25rem;opacity:.7;"></p>
    </form>
  </div>
</section>`;

  const footer = `
<footer>
  <div class="ft-in">
    <span class="ft-brand">{{BUSINESS_NAME}}</span>
    <ul class="ft-links">${ftLis}</ul>
    <span class="ft-copy">{{CITY}} · {{PHONE}} · © {{YEAR}} {{BUSINESS_NAME}}</span>
  </div>
</footer>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${opts.metaTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="${opts.fontHref}" rel="stylesheet"/>
<style>
:root{
${opts.rootVars}}
${SHARED_CSS}
${opts.extraCss || ''}
</style>
</head>
<body>
<nav>
  <a class="nav-logo" href="#top">{{BUSINESS_NAME}}</a>
  <ul class="nav-links">${navLis}</ul>${dot}
  <a class="nav-cta" href="${opts.navCta.href}">${opts.navCta.label}</a>
</nav>
${opts.heroInner}
${opts.bodySections}
${contactSection}
${footer}
<script>${FORM_IIFE}<\/script>
<script>${INTERACTION_JS}<\/script>
</body>
</html>`;

  return html;
}

// --- presets -----------------------------------------------------------------

function patchContact(ph, eyebrow, head) {
  return ph
    .replace(/\{\{CONTACT_EYEBROW\}\}/g, eyebrow)
    .replace(/\{\{CONTACT_HEAD\}\}/g, head);
}


function patchContact(ph, eyebrow, head) {
  return ph.replace('{{CONTACT_EYEBROW}}', eyebrow).replace('{{CONTACT_HEAD}}', head);
}

const SERVICE = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Roboto:wght@400;500&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Licensed service · {{CITY}}',
    rootVars: `
    --bg:#111111;--bg-alt:#171717;--card-bg:#1a1a1a;
    --accent:#f59e0b;--accent-rgb:245,158,11;--bg-rgb:17,17,17;--text:#f0ece0;
    --font-head:'Oswald',sans-serif;--font-body:'Roboto',sans-serif;`,
    navLinks: [
      { href: '#services', label: 'Services' },
      { href: '#why', label: 'Why us' },
      { href: '#reviews', label: 'Reviews' },
      { href: '#contact', label: 'Contact' },
    ],
    navDot: false,
    navCta: { href: 'tel:+1{{PHONE_RAW}}', label: 'Call now' },
    heroInner: `
<section id="top" class="hero" style="background:linear-gradient(160deg,#111 65%,#1b140a 100%);">
  <div style="position:relative;z-index:1">
    <span class="badge">Licensed &amp; insured · {{CITY}}</span>
    <span class="eyebrow">{{CITY}} · {{HEADLINE}}</span>
    <h1>{{SERVICE_HERO}}</h1>
    <p class="hero-sub">{{SERVICE_SUB}}</p>
    <div class="btn-row">
      <a class="btn-p" href="#contact">Free estimate</a>
      <a class="btn-g" href="#services">Services</a>
    </div>
  </div>
</section>`,
    bodySections: `
<section><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="500" data-suffix="+">0</span><span class="stat-lab">Jobs completed</span></div>
  <div class="stat"><span class="stat-num" data-target="24" data-suffix="/7">0</span><span class="stat-lab">Emergency line</span></div>
  <div class="stat"><span class="stat-num" data-target="15" data-suffix="yr">0</span><span class="stat-lab">In business</span></div>
  <div class="stat"><span class="stat-num" data-target="98" data-suffix="%">0</span><span class="stat-lab">Satisfaction</span></div>
</div></div></section>
<section id="services" class="section-alt"><div class="inner">
  <div class="section-head"><span class="eyebrow">What we fix</span><h2>{{CITY}} <em>trusted work</em></h2></div>
  <div class="card-grid">
    <div class="card"><span class="card-ic">🔧</span><h3>{{SERVICE_1}}</h3><p>{{SERVICE_1_DESC}}</p></div>
    <div class="card"><span class="card-ic">⚡</span><h3>{{SERVICE_2}}</h3><p>{{SERVICE_2_DESC}}</p></div>
    <div class="card"><span class="card-ic">🛠</span><h3>{{SERVICE_3}}</h3><p>{{SERVICE_3_DESC}}</p></div>
    <div class="card"><span class="card-ic">⚠️</span><h3>Emergency visits</h3><p>Nights · weekends · when it cannot wait.</p></div>
  </div>
</div></section>
<section id="why"><div class="inner">
  <div class="section-head"><span class="eyebrow">The difference</span><h2>Why {{BUSINESS_NAME}}</h2><p class="sec-sub">{{WHY_COPY}}</p></div>
  <div class="card-grid">
    <div class="card"><span class="card-ic">🏅</span><h3>Licensed</h3><p>Insurance backed on every assignment.</p></div>
    <div class="card"><span class="card-ic">💵</span><h3>Upfront pricing</h3><p>Written scopes before wrench turns.</p></div>
    <div class="card"><span class="card-ic">⏱</span><h3>Show up on time</h3><p>We respect calendars and crews.</p></div>
  </div>
</div></section>
<section id="reviews" class="section-alt"><div class="inner">
  <div class="section-head"><span class="eyebrow">Neighbors say</span><h2>Five-star rhythm</h2></div>
  <div class="t-grid">
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
  </div>
</div></section>`,
    footerLinks: [
      { href: '#services', label: 'Services' },
      { href: '#reviews', label: 'Reviews' },
      { href: '#contact', label: 'Book' },
    ],
  }),
  'Request',
  '{{CONTACT_TITLE}}'
);

const RESTAURANT_PRE = premiumPage({
  fontHref:
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap',
  metaTitle: '{{BUSINESS_NAME}} — {{CITY}} dining',
  rootVars: `
    --bg:#0f0804;--bg-alt:#171006;--card-bg:#1e1308;
    --accent:#d4a853;--accent-rgb:212,168,83;--bg-rgb:15,8,4;--text:#f5f0e8;
    --font-head:'Playfair Display',serif;--font-body:'Lato',sans-serif;`,
  navLinks: [
    { href: '#story', label: 'Story' },
    { href: '#menu', label: 'Menu' },
    { href: '#visit', label: 'Visit' },
    { href: '#contact', label: 'Contact' },
  ],
  navDot: false,
  navCta: { href: '#visit', label: 'Directions' },
  heroInner: `
<section id="top" class="hero" style="background:linear-gradient(180deg,rgba(15,8,4,.86),rgba(15,8,4,.94)),url({{HERO_IMG_URL}}) center/cover no-repeat;">
  <div style="position:relative;z-index:1"><span class="eyebrow">{{CITY}}</span>
  <h1>{{REST_HERO_L1}}</h1>
  <p class="hero-sub">{{REST_SUB}}</p>
  <div class="btn-row"><a class="btn-p" href="#menu">View menu</a><a class="btn-g" href="#visit">Hours</a></div></div>
</section>`,
  extraCss: '.hero h1{color:var(--text);}',
  bodySections: `
<section><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="12" data-suffix="">12</span><span class="stat-lab">Seasons plating</span></div>
  <div class="stat"><span class="stat-num" data-target="350" data-suffix="+">0</span><span class="stat-lab">Guests hosted</span></div>
  <div class="stat"><span style="display:block;color:var(--accent);font-family:var(--font-head);font-size:2.5rem;line-height:1;">4.9</span><span class="stat-lab">Google rating</span></div>
  <div class="stat"><span class="stat-num" data-target="47" data-suffix="">47</span><span class="stat-lab">Menu favorites</span></div>
</div></div></section>
<section id="story" class="section-alt"><div class="inner section-head">
  <span class="eyebrow">Kitchen story</span><h2>Warmth you can <em>taste</em></h2><div class="divider"></div><p class="sec-sub" style="max-width:640px">{{STORY_BLOCK}}</p>
</div></section>
<section id="menu"><div class="inner">
  <div class="section-head"><span class="eyebrow">Menu highlights</span><h2>{{MENU_TITLE}}</h2></div>
  <div class="menu-grid">
    <div class="menu-cell"><h4>{{ITEM_1}}</h4><p>{{ITEM_1_DESC}}</p><div class="pr">{{PRICE_1}}</div></div>
    <div class="menu-cell"><h4>{{ITEM_2}}</h4><p>{{ITEM_2_DESC}}</p><div class="pr">{{PRICE_2}}</div></div>
    <div class="menu-cell"><h4>{{ITEM_3}}</h4><p>{{ITEM_3_DESC}}</p><div class="pr">{{PRICE_3}}</div></div>
    <div class="menu-cell"><h4>{{ITEM_4}}</h4><p>{{ITEM_4_DESC}}</p><div class="pr">{{PRICE_4}}</div></div>
  </div>
</div></section>
<section id="reviews" class="section-alt"><div class="inner">
  <div class="section-head"><span class="eyebrow">Guest notes</span><h2>In {{CITY}}</h2></div>
  <div class="t-grid">
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
    <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
  </div>
</div></section>
<section id="visit"><div class="inner section-head"><span class="eyebrow">Visit</span><h2>{{ADDRESS}}</h2>
<p class="sec-sub">{{WEEKDAY_HOURS}} · {{WEEKEND_HOURS}}</p><a class="btn-p" href="https://maps.google.com">{{DIRECTIONS_CTA}}</a></div></section>`,
  footerLinks: [
    { href: '#menu', label: 'Menu' },
    { href: '#visit', label: 'Visit' },
    { href: '#contact', label: 'Host' },
  ],
});
const RESTAURANT = patchContact(RESTAURANT_PRE, 'Host an evening', '{{RES_CONTACT_HEAD}}');

const LAW = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Space+Mono:wght@400;700&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — {{CITY}} counsel',
    rootVars: `
    --bg:#0a0a0a;--bg-alt:#111111;--card-bg:#141414;
    --accent:#c9a84c;--accent-rgb:201,168,76;--bg-rgb:10,10,10;--text:#e8e0d0;
    --font-head:'Playfair Display',serif;--font-body:'Space Mono',monospace;`,
    navLinks: [
      { href: '#practice', label: 'Practice' },
      { href: '#results', label: 'Results' },
      { href: '#about', label: 'About' },
      { href: '#contact', label: 'Contact' },
    ],
    navDot: true,
    navCta: { href: '#contact', label: 'Consult' },
    heroInner: `
<section id="top" class="hero">
  <div style="position:relative;z-index:1"><span class="eyebrow">{{CITY}} · Counsel</span>
  <h1>{{HEADLINE}}</h1><p class="hero-sub">{{SUBHEADLINE}}</p>
  <div class="btn-row"><a class="btn-p" href="#contact">Free consultation</a><a class="btn-g" href="#practice">Practice areas</a></div></div>
</section>`,
    bodySections: `
<section><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="25" data-suffix="">0</span><span class="stat-lab">Years advocating</span></div>
  <div class="stat"><span class="stat-num" data-target="950" data-suffix="+">0</span><span class="stat-lab">Matters resolved</span></div>
  <div class="stat"><span class="stat-num" data-target="18" data-suffix="">18</span><span class="stat-lab">Trial wins</span></div>
  <div class="stat"><span class="stat-num" data-target="92" data-suffix="%">0</span><span class="stat-lab">Client satisfaction</span></div>
</div></div></section>
<section id="practice" class="section-alt"><div class="inner">
  <div class="section-head"><span class="eyebrow">Focus</span><h2>Practice <em>discipline</em></h2></div>
  <div class="inner" style="max-width:760px;margin:0 auto">
    <div class="practice"><span class="pr-num">01</span><div><h3>{{PRACTICE_1}}</h3><p>{{PRACTICE_1_DESC}}</p></div></div>
    <div class="practice"><span class="pr-num">02</span><div><h3>{{PRACTICE_2}}</h3><p>{{PRACTICE_2_DESC}}</p></div></div>
    <div class="practice"><span class="pr-num">03</span><div><h3>{{PRACTICE_3}}</h3><p>{{PRACTICE_3_DESC}}</p></div></div>
    <div class="practice"><span class="pr-num">04</span><div><h3>{{PRACTICE_4}}</h3><p>{{PRACTICE_4_DESC}}</p></div></div>
  </div>
</div></section>
<section id="about"><div class="inner section-head"><span class="eyebrow">Firm stance</span><h2>{{FIRM_VOICE}}</h2><p class="sec-sub">{{FIRM_DETAIL}}</p></div></section>
<section id="results" class="section-alt"><div class="inner"><div class="section-head"><span class="eyebrow">Outcomes</span><h2>Case-ready <em>results</em></h2></div>
  <div class="card-grid">
    <div class="card"><span class="card-ic">§</span><h3>Settlements</h3><p>{{RESULT_SUMMARY_1}}</p></div>
    <div class="card"><span class="card-ic">⚖</span><h3>Court victories</h3><p>{{RESULT_SUMMARY_2}}</p></div>
    <div class="card"><span class="card-ic">◇</span><h3>Ongoing advocacy</h3><p>{{RESULT_SUMMARY_3}}</p></div>
  </div>
</div></section>
<section id="reviews"><div class="inner"><div class="section-head"><span class="eyebrow">Clients</span><h2>Trusted counsel</h2></div><div class="t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></div></section>`,
    footerLinks: [
      { href: '#practice', label: 'Practice' },
      { href: '#contact', label: 'Consult' },
    ],
  }),
  'Case intake',
  '{{LAW_CONTACT}}'
);

const REALESTATE = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Open+Sans:wght@400;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — {{CITY}} real estate',
    rootVars: `
    --bg:#0d1b2a;--bg-alt:#102030;--card-bg:#142536;
    --accent:#c9a84c;--accent-rgb:201,168,76;--bg-rgb:13,27,42;--text:#e8ecf0;
    --font-head:'Libre Baskerville',serif;--font-body:'Open Sans',sans-serif;`,
    navLinks: [
      { href: '#homes', label: 'Listings' },
      { href: '#areas', label: 'Neighborhoods' },
      { href: '#stories', label: 'Stories' },
      { href: '#contact', label: 'Book' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Showing' },
    heroInner: `
<section id="top" class="hero-split hero" style="min-height:100vh;padding-top:7rem;">
  <div><span class="eyebrow">{{CITY}}</span><h1>{{RE_HERO}}</h1><p class="hero-sub" style="margin-left:0;margin-right:auto">{{RE_SUB}}</p>
  <div class="btn-row" style="justify-content:flex-start"><a class="btn-p" href="#contact">{{RE_CTA1}}</a><a class="btn-g" href="#homes">{{RE_CTA2}}</a></div></div>
  <div class="hero-visual particles"></div>
</section>`,
    extraCss:
      '.hero-split h1{font-size:clamp(2rem,4vw,3.35rem)}.hero-sub{margin-left:auto;margin-right:auto;}',
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="48" data-suffix="">48</span><span class="stat-lab">Homes staged</span></div>
  <div class="stat"><span class="stat-num" data-target="126" data-suffix="M">0</span><span class="stat-lab">Volume assisted</span></div>
  <div class="stat"><span class="stat-num" data-target="300" data-suffix="+">0</span><span class="stat-lab">Tours coordinated</span></div>
  <div class="stat"><span class="stat-num" data-target="99" data-suffix="%">0</span><span class="stat-lab">On-time closes</span></div>
</div></div></section>
<section id="homes"><div class="inner section-head"><span class="eyebrow">Curated inventory</span><h2>{{LISTING_HOOK}}</h2></div><div class="inner card-grid">
  <div class="card"><h3>{{PROP_1}}</h3><p>{{PROP_1_DESC}}</p></div>
  <div class="card"><h3>{{PROP_2}}</h3><p>{{PROP_2_DESC}}</p></div>
  <div class="card"><h3>{{PROP_3}}</h3><p>{{PROP_3_DESC}}</p></div>
</div></section>
<section id="areas" class="section-alt"><div class="inner section-head"><span class="eyebrow">Neighborhood IQ</span><h2>{{NEIGHBOR_STORY}}</h2><p class="sec-sub">{{NEIGHBOR_SUB}}</p></div></section>
<section id="stories"><div class="inner"><div class="t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></div></section>`,
    footerLinks: [
      { href: '#homes', label: 'Listings' },
      { href: '#contact', label: 'Book' },
    ],
  }),
  'Move forward',
  '{{RE_CONTACT_TITLE}}'
);

const BEAUTY = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;700&family=Montserrat:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Beauty · {{CITY}}',
    rootVars: `
    --bg:#1a0a14;--bg-alt:#231020;--card-bg:#271423;
    --accent:#d4af8a;--accent-rgb:212,175,138;--bg-rgb:26,10,20;--text:#f5ede8;
    --font-head:'Cormorant Garamond',serif;--font-body:'Montserrat',sans-serif;`,
    navLinks: [
      { href: '#look', label: 'Looks' },
      { href: '#services', label: 'Services' },
      { href: '#reviews', label: 'Glow' },
      { href: '#contact', label: 'Book' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Book now' },
    heroInner: `
<section id="top" class="hero"><div class="particles" style="position:absolute;inset:0;"></div><div style="position:relative">
  <span class="eyebrow">Beauty studio · {{CITY}}</span><h1>{{BEAUTY_HEAD}}</h1><p class="hero-sub">{{BEAUTY_SUB}}</p>
  <div class="btn-row"><a class="btn-p" href="#contact">Reserve</a><a class="btn-g" href="#services">Menu</a></div></div></section>`,
    bodySections: `
<section><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="14" data-suffix="">14</span><span class="stat-lab">Stylists curated</span></div>
  <div class="stat"><span class="stat-num" data-target="8200" data-suffix="">0</span><span class="stat-lab">Appointments / yr</span></div>
  <div class="stat"><span class="stat-num" data-target="52" data-suffix="">52</span><span class="stat-lab">Week open</span></div>
</div></div></section>
<section id="look" class="section-alt"><div class="inner section-head"><span class="eyebrow">Before you arrive</span><h2>Care that <em>holds court</em></h2></div></section>
<section id="services"><div class="inner card-grid">
  <div class="card"><span class="card-ic">✦</span><h3>{{BEAUTY_SERVICE_1}}</h3><p>{{BEAUTY_SERVICE_1_DESC}} · {{PRICE_A}}</p></div>
  <div class="card"><span class="card-ic">✧</span><h3>{{BEAUTY_SERVICE_2}}</h3><p>{{BEAUTY_SERVICE_2_DESC}} · {{PRICE_B}}</p></div>
  <div class="card"><span class="card-ic">❋</span><h3>{{BEAUTY_SERVICE_3}}</h3><p>{{BEAUTY_SERVICE_3_DESC}} · {{PRICE_C}}</p></div>
</div></section>
<section id="reviews" class="section-alt"><div class="inner"><div class="t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></div></section>`,
    footerLinks: [
      { href: '#services', label: 'Services' },
      { href: '#contact', label: 'Book' },
    ],
  }),
  'Reservations',
  '{{BEAUTY_CONTACT}}'
);

const FITNESS = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap',
    metaTitle: '{{BUSINESS_NAME}} · {{CITY}} gym',
    rootVars: `
    --bg:#0d0d0d;--bg-alt:#141414;--card-bg:#171717;
    --accent:#22c55e;--accent-rgb:34,197,94;--bg-rgb:13,13,13;--text:#eefaf0;
    --font-head:'Bebas Neue',sans-serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#programs', label: 'Programs' },
      { href: '#coaches', label: 'Coaches' },
      { href: '#reviews', label: 'Wins' },
      { href: '#contact', label: 'Join' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Free trial' },
    extraCss:
      "h1{font-family:'Bebas Neue',sans-serif!important;letter-spacing:.04em;color:var(--accent)!important;text-transform:uppercase;}",
    heroInner: `
<section id="top" class="hero" style="background:radial-gradient(circle at 80% 20%,rgba(34,197,94,.07),transparent 52%),#0d0d0d;">
  <div><span class="eyebrow">Train louder · {{CITY}}</span><h1>{{FIT_HEAD}}</h1><p class="hero-sub">{{FIT_SUB}}</p>
  <div class="btn-row"><a class="btn-p" href="#contact">{{FIT_CTA_PRIMARY}}</a><a class="btn-g" href="#programs">Programs</a></div></div>
</section>`,
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="400" data-suffix="+">0</span><span class="stat-lab">Members coached</span></div>
  <div class="stat"><span class="stat-num" data-target="18" data-suffix="">18</span><span class="stat-lab">Class formats</span></div>
  <div class="stat"><span class="stat-num" data-target="5" data-suffix="am">0</span><span class="stat-lab">Doors crack open</span></div>
</div></div></section>
<section id="programs"><div class="inner card-grid section-head"><span class="eyebrow">Training floors</span><h2>{{PROGRAM_LEDE}}</h2></div><div class="inner card-grid">
  <div class="card"><h3>{{PROGRAM_1}}</h3><p>{{PROGRAM_1_DESC}}</p></div>
  <div class="card"><h3>{{PROGRAM_2}}</h3><p>{{PROGRAM_2_DESC}}</p></div>
  <div class="card"><h3>{{PROGRAM_3}}</h3><p>{{PROGRAM_3_DESC}}</p></div>
</div></section>
<section id="coaches" class="section-alt"><div class="inner section-head"><span class="eyebrow">Coaching desk</span><h2>{{COACH_LINE}}</h2></div></section>
<section id="reviews"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#programs', label: 'Programs' },
      { href: '#contact', label: 'Join' },
    ],
  }),
  'Membership desk',
  '{{FIT_CONTACT}}'
);

const MEDICAL = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Care · {{CITY}}',
    rootVars: `
    --bg:#0a0f14;--bg-alt:#101820;--card-bg:#131c24;
    --accent:#38bdf8;--accent-rgb:56,189,248;--bg-rgb:10,15,20;--text:#e8f4fc;
    --font-head:'Merriweather',serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#care', label: 'Care' },
      { href: '#insurance', label: 'Insurance' },
      { href: '#reviews', label: 'Patients' },
      { href: '#contact', label: 'Visit' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Book visit' },
    heroInner: `
<section id="top" class="hero"><span class="eyebrow">Clinical clarity · {{CITY}}</span>
  <h1>{{MED_HERO}}</h1><p class="hero-sub">{{MED_SUB}}</p>
  <div class="btn-row"><a class="btn-p" href="#contact">Schedule appointment</a><a class="btn-g" href="#care">Services</a></div></section>`,
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="18" data-suffix="">0</span><span class="stat-lab">Years practice</span></div>
  <div class="stat"><span class="stat-num" data-target="32" data-suffix="">32</span><span class="stat-lab">Network partners</span></div>
  <div class="stat"><span class="stat-num" data-target="4.9" data-suffix="">0</span><span class="stat-lab">Comfort score</span></div>
</div></div></section>
<section id="care"><div class="inner card-grid"><div class="card"><span class="card-ic">＋</span><h3>{{MED_SERV_1}}</h3><p>{{MED_SERV_1_DESC}}</p></div>
  <div class="card"><span class="card-ic">⚕️</span><h3>{{MED_SERV_2}}</h3><p>{{MED_SERV_2_DESC}}</p></div>
  <div class="card"><span class="card-ic">◎</span><h3>{{MED_SERV_3}}</h3><p>{{MED_SERV_3_DESC}}</p></div></div></section>
<section id="insurance" class="section-alt"><div class="inner section-head"><span class="eyebrow">Coverage</span><h2>{{INSURANCE_SUMMARY}}</h2><p class="sec-sub">{{INSURANCE_SUB}}</p></div></section>
<section id="reviews"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#care', label: 'Care' },
      { href: '#contact', label: 'Book' },
    ],
  }),
  'Patient coordinators',
  '{{MED_CONTACT}}'
);

const CREATIVE = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Creative studio · {{CITY}}',
    rootVars: `
    --bg:#0a0a0a;--bg-alt:#120a18;--card-bg:#17101f;
    --accent:#a855f7;--accent-rgb:168,85,247;--bg-rgb:10,10,10;--text:#efe7ff;
    --font-head:'Space Grotesk',sans-serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#work', label: 'Work' },
      { href: '#services', label: 'Services' },
      { href: '#process', label: 'Process' },
      { href: '#contact', label: 'Hire' },
    ],
    navDot: true,
    navCta: { href: '#contact', label: 'Start brief' },
    heroInner: `
<section id="top" class="hero-split hero" style="min-height:100vh;padding-top:6.75rem;"><div><span class="eyebrow">Studio · {{CITY}}</span>
  <h1>{{CREATIVE_HERO}}</h1><p class="hero-sub" style="text-align:left;margin-left:0;margin-right:auto">{{CREATIVE_SUB}}</p>
  <div class="btn-row" style="justify-content:flex-start"><a class="btn-p" href="#contact">{{CREATIVE_PRI}}</a><a class="btn-g" href="#work">{{CREATIVE_SEC}}</a></div></div>
  <div class="port-grid" style="align-content:start"><div class="port-tile">Case A</div><div class="port-tile">Case B</div><div class="port-tile">Case C</div><div class="port-tile">Case D</div></div></section>`,
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="120" data-suffix="">0</span><span class="stat-lab">Launches stewarded</span></div>
  <div class="stat"><span class="stat-num" data-target="18" data-suffix="">18</span><span class="stat-lab">Industries</span></div>
  <div class="stat"><span class="stat-num" data-target="6" data-suffix="">6</span><span class="stat-lab">Disciplines</span></div>
</div></div></section>
<section id="work"><div class="inner section-head"><span class="eyebrow">Selected frames</span><h2>{{PORTFOLIO_LINE}}</h2></div></section>
<section id="services"><div class="inner card-grid">
  <div class="card"><h3>{{CR_SERV_1}}</h3><p>{{CR_SERV_1_DESC}}</p></div>
  <div class="card"><h3>{{CR_SERV_2}}</h3><p>{{CR_SERV_2_DESC}}</p></div>
  <div class="card"><h3>{{CR_SERV_3}}</h3><p>{{CR_SERV_3_DESC}}</p></div>
</div></section>
<section id="process" class="section-alt"><div class="inner section-head"><span class="eyebrow">Signals</span><h2>{{PROCESS_LINE}}</h2><p class="sec-sub">{{PROCESS_SUB}}</p></div></section>
<section id="reviews"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#work', label: 'Work' },
      { href: '#contact', label: 'Hire' },
    ],
  }),
  'Project inbox',
  '{{CR_CONTACT_TITLE}}'
);

const ECOMMERCE_HTML = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} · Shop {{CITY}}',
    rootVars: `
    --bg:#0f0f0f;--bg-alt:#161616;--card-bg:#1a1a1a;
    --accent:#f0c040;--accent-rgb:240,192,64;--bg-rgb:15,15,15;--text:#f6f3ea;
    --font-head:'Playfair Display',serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#drops', label: 'Drops' },
      { href: '#trust', label: 'Policies' },
      { href: '#reviews', label: 'Love' },
      { href: '#contact', label: 'Help' },
    ],
    navDot: false,
    navCta: { href: '#drops', label: 'Shop edit' },
    heroInner: `
<section id="top" class="hero"><span class="eyebrow">Curated supply · {{CITY}}</span>
  <h1>{{SHOP_HEAD}}</h1><p class="hero-sub">{{SHOP_SUB}}</p><div class="btn-row"><a class="btn-p" href="#drops">Browse edit</a><a class="btn-g" href="#trust">Shipping</a></div></section>`,
    bodySections: `
<section><div class="inner card-grid" id="drops">
  <div class="card"><h3>{{PRODUCT_1}}</h3><p>{{PRODUCT_1_DESC}}</p></div>
  <div class="card"><h3>{{PRODUCT_2}}</h3><p>{{PRODUCT_2_DESC}}</p></div>
  <div class="card"><h3>{{PRODUCT_3}}</h3><p>{{PRODUCT_3_DESC}}</p></div>
</div></section>
<section id="trust" class="section-alt"><div class="inner section-head"><span class="eyebrow">Logistics trust</span><h2>Returns · {{SHIPPING_NOTE}}</h2><p class="sec-sub">{{RETURNS_NOTE}}</p></div></section>
<section id="newsletter"><div class="inner section-head"><span class="eyebrow">Radar</span><h2>{{NEWS_HEAD}}</h2><p>{{NEWS_HINT}}</p></div></section>
<section id="reviews" class="section-alt"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#drops', label: 'Shop' },
      { href: '#contact', label: 'Support' },
    ],
  }),
  'Concierge desk',
  '{{SHOP_CONTACT}}'
);

const CONSTRUCTION = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Roboto:wght@400;500&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Build · {{CITY}}',
    rootVars: `
    --bg:#111111;--bg-alt:#181818;--card-bg:#1c1c1c;
    --accent:#ea580c;--accent-rgb:234,88,12;--bg-rgb:17,17,17;--text:#f5f2ec;
    --font-head:'Oswald',sans-serif;--font-body:'Roboto',sans-serif;`,
    navLinks: [
      { href: '#scopes', label: 'Scopes' },
      { href: '#proof', label: 'Sites' },
      { href: '#reviews', label: 'Owners' },
      { href: '#contact', label: 'Bid' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Request bid' },
    heroInner: `
<section id="top" class="hero" style="background:linear-gradient(200deg,#111,#1c1008);">
  <span class="badge">{{CON_BADGE}}</span><span class="eyebrow">Field crew · {{CITY}}</span>
  <h1>{{CON_HEAD}}</h1><p class="hero-sub">{{CON_SUB}}</p>
  <div class="btn-row"><a class="btn-p" href="#contact">{{CON_PRIMARY}}</a><a class="btn-g" href="#scopes">Capabilities</a></div></section>`,
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="220" data-suffix="">0</span><span class="stat-lab">Turnkey jobs</span></div>
  <div class="stat"><span class="stat-num" data-target="42" data-suffix="">42</span><span class="stat-lab">Crew leaders</span></div>
  <div class="stat"><span class="stat-num" data-target="98" data-suffix="%">0</span><span class="stat-lab">Inspection pass</span></div>
</div></div></section>
<section id="scopes"><div class="inner card-grid"><div class="card"><h3>{{CON_TYPE_1}}</h3><p>{{CON_DESC_1}}</p></div>
  <div class="card"><h3>{{CON_TYPE_2}}</h3><p>{{CON_DESC_2}}</p></div>
  <div class="card"><h3>{{CON_TYPE_3}}</h3><p>{{CON_DESC_3}}</p></div></div></section>
<section id="proof"><div class="inner section-head"><span class="eyebrow">Field verified</span><h2>{{CON_PROOF}}</h2></div></section>
<section id="reviews" class="section-alt"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#scopes', label: 'Scopes' },
      { href: '#contact', label: 'Bid' },
    ],
  }),
  'Estimate desk',
  '{{CON_CONTACT}}'
);

const CONSULTING = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} · Strategy {{CITY}}',
    rootVars: `
    --bg:#0a0f1e;--bg-alt:#10182b;--card-bg:#121c30;
    --accent:#6366f1;--accent-rgb:99,102,241;--bg-rgb:10,15,30;--text:#eef0ff;
    --font-head:'Playfair Display',serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#signals', label: 'Signals' },
      { href: '#services', label: 'Solutions' },
      { href: '#process', label: 'Method' },
      { href: '#contact', label: 'Call' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Book strategy' },
    heroInner: `
<section id="top" class="hero"><span class="eyebrow">Advisory orbit · {{CITY}}</span>
  <h1>{{CONS_HERO}}</h1><p class="hero-sub">{{CONS_SUB}}</p>
  <div class="logo-row">{{CLIENT_ROW}}</div><div class="btn-row"><a class="btn-p" href="#contact">{{CONS_PRI}}</a><a class="btn-g" href="#signals">Evidence</a></div></section>`,
    bodySections: `
<section class="section-alt"><div class="inner"><div class="stats">
  <div class="stat"><span class="stat-num" data-target="38" data-suffix="%">0</span><span class="stat-lab">Avg. lift</span></div>
  <div class="stat"><span class="stat-num" data-target="12" data-suffix="">12</span><span class="stat-lab">Engagements active</span></div>
  <div class="stat"><span class="stat-num" data-target="210" data-suffix="M">0</span><span class="stat-lab">Forecast influenced</span></div>
</div></div></section>
<section id="signals"><div class="inner section-head"><span class="eyebrow">What we diagnose</span><h2>{{CONS_ANGLE}}</h2></div></section>
<section id="services"><div class="inner card-grid">
  <div class="card"><h3>{{CONS_SERV_1}}</h3><p>{{CONS_SERV_1_DESC}}</p></div>
  <div class="card"><h3>{{CONS_SERV_2}}</h3><p>{{CONS_SERV_2_DESC}}</p></div>
  <div class="card"><h3>{{CONS_SERV_3}}</h3><p>{{CONS_SERV_3_DESC}}</p></div>
</div></section>
<section id="process" class="section-alt"><div class="inner section-head"><span class="eyebrow">Cadence</span><h2>{{THREE_STEP}}</h2><p class="sec-sub">{{THREE_STEP_DETAIL}}</p></div></section>
<section id="reviews"><div class="inner t-grid">
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_1}}”</blockquote><cite>— {{NAME_1}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_2}}”</blockquote><cite>— {{NAME_2}}</cite></div>
  <div class="t-card"><span class="stars">★★★★★</span><blockquote>“{{TESTIMONIAL_3}}”</blockquote><cite>— {{NAME_3}}</cite></div>
</div></section>`,
    footerLinks: [
      { href: '#services', label: 'Work' },
      { href: '#contact', label: 'Call' },
    ],
  }),
  'Strategy desk',
  '{{CONS_CONTACT}}'
);

// Fix BASIC contact placeholders properly (premiumPage inlined literal tags)
const BASIC_HTML = patchContact(
  premiumPage({
    fontHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600&display=swap',
    metaTitle: '{{BUSINESS_NAME}} — Premium launch',
    rootVars: `
    --bg:#0a0a0a;--bg-alt:#111111;--card-bg:#141414;
    --accent:#c9a84c;--accent-rgb:201,168,76;--bg-rgb:10,10,10;--text:#e8e0d0;
    --font-head:'Playfair Display',serif;--font-body:'Inter',sans-serif;`,
    navLinks: [
      { href: '#services', label: 'Offerings' },
      { href: '#proof', label: 'Proof' },
      { href: '#stories', label: 'Stories' },
      { href: '#contact', label: 'Contact' },
    ],
    navDot: false,
    navCta: { href: '#contact', label: 'Start' },
    heroInner: `
<section id="top" class="hero">
  <div class="particles" style="position:absolute;inset:0;"></div>
  <div style="position:relative;z-index:1">
    <span class="eyebrow">{{CITY}} · Est. {{YEAR}}</span>
    <h1>{{HEADLINE}}</h1>
    <p class="hero-sub">{{SUBHEADLINE}}</p>
    <div class="btn-row">
      <a class="btn-p" href="#contact">{{CTA_PRIMARY}}</a>
      <a class="btn-g" href="#services">{{CTA_SECONDARY}}</a>
    </div>
  </div>
</section>`,
    bodySections: `
<section>
  <div class="inner">
    <div class="stats">
      <div class="stat"><span class="stat-num" data-target="500" data-suffix="+">0</span><span class="stat-lab">Deliverables shipped</span></div>
      <div class="stat"><span class="stat-num" data-target="120" data-suffix="+">0</span><span class="stat-lab">Active clients</span></div>
      <div class="stat"><span class="stat-num" data-target="12" data-suffix="">0</span><span class="stat-lab">Years experience</span></div>
      <div class="stat"><span class="stat-num" data-target="98" data-suffix="%">0</span><span class="stat-lab">Would recommend</span></div>
    </div>
  </div>
</section>
<section id="services" class="section-alt">
  <div class="inner">
    <div class="section-head"><span class="eyebrow">Capabilities</span><h2>{{SECTION_SERVICES_TITLE}} — <em>built for clarity</em></h2><p class="sec-sub">{{SECTION_SERVICES_SUB}}</p></div>
    <div class="card-grid">
      <div class="card"><span class="card-ic">◆</span><h3>{{SERVICE_1}}</h3><p>{{SERVICE_1_DESC}}</p></div>
      <div class="card"><span class="card-ic">◇</span><h3>{{SERVICE_2}}</h3><p>{{SERVICE_2_DESC}}</p></div>
      <div class="card"><span class="card-ic">○</span><h3>{{SERVICE_3}}</h3><p>{{SERVICE_3_DESC}}</p></div>
    </div>
  </div>
</section>
<section id="proof">
  <div class="inner"><div class="section-head"><span class="eyebrow">Momentum</span><h2>Proof that <em>compounds</em></h2><p class="sec-sub">{{PROOF_COPY}}</p></div></div>
</section>
<section id="stories" class="section-alt">
  <div class="inner">
    <div class="section-head"><span class="eyebrow">Voices</span><h2>What {{CITY}} <em>noticed</em></h2></div>
    <div class="t-grid">
      <div class="t-card"><span class="stars">★★★★★</span><blockquote>"{{TESTIMONIAL_1}}"</blockquote><cite>— {{NAME_1}}, {{CITY}}</cite></div>
      <div class="t-card"><span class="stars">★★★★★</span><blockquote>"{{TESTIMONIAL_2}}"</blockquote><cite>— {{NAME_2}}, {{CITY}}</cite></div>
      <div class="t-card"><span class="stars">★★★★★</span><blockquote>"{{TESTIMONIAL_3}}"</blockquote><cite>— {{NAME_3}}, {{CITY}}</cite></div>
    </div>
  </div>
</section>`,
    footerLinks: [
      { href: '#services', label: 'Offerings' },
      { href: '#contact', label: 'Contact' },
    ],
  }),
  'Private line',
  '{{CONTACT_HEADLINE}}'
);

const TEMPLATES = {
  basic: { 'index.html': BASIC_HTML },
  service: { 'index.html': SERVICE },
  restaurant: { 'index.html': RESTAURANT },
  law: { 'index.html': LAW },
  realestate: { 'index.html': REALESTATE },
  beauty: { 'index.html': BEAUTY },
  fitness: { 'index.html': FITNESS },
  medical: { 'index.html': MEDICAL },
  creative: { 'index.html': CREATIVE },
  ecommerce: { 'index.html': ECOMMERCE_HTML },
  construction: { 'index.html': CONSTRUCTION },
  consulting: { 'index.html': CONSULTING },
  business: { 'index.html': SERVICE },
  portfolio: { 'index.html': CREATIVE },
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES);

function getTemplateFiles(templateId) {
  const id = templateId && TEMPLATES[templateId] ? templateId : 'basic';
  return TEMPLATES[id];
}

module.exports = { TEMPLATES, TEMPLATE_KEYS, getTemplateFiles };
