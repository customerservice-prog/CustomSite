/* brand-resolver.js — swaps brand identity per marketing hostname (client-side) */
(function () {
  'use strict';

  const BRANDS = {
    'syracusewebagency.com': {
      name: 'Syracuse Web Agency',
      shortName: 'SWA',
      tagline: "Syracuse's local web design agency",
      phone: '',
      email: 'hello@syracusewebagency.com',
      city: 'Syracuse, NY',
      titleSuffix: 'Syracuse Web Agency | Custom Websites Syracuse NY',
    },
    'www.syracusewebagency.com': {
      name: 'Syracuse Web Agency',
      shortName: 'SWA',
      tagline: "Syracuse's local web design agency",
      phone: '',
      email: 'hello@syracusewebagency.com',
      city: 'Syracuse, NY',
      titleSuffix: 'Syracuse Web Agency | Custom Websites Syracuse NY',
    },
    'cnywebagency.com': {
      name: 'CNY Web Agency',
      shortName: 'CNY',
      tagline: "Central New York's web agency",
      phone: '',
      email: 'hello@cnywebagency.com',
      city: 'Syracuse, NY (serving all of CNY)',
      titleSuffix: 'CNY Web Agency | Central New York Web Design',
    },
    'www.cnywebagency.com': {
      name: 'CNY Web Agency',
      shortName: 'CNY',
      tagline: "Central New York's web agency",
      phone: '',
      email: 'hello@cnywebagency.com',
      city: 'Syracuse, NY (serving all of CNY)',
      titleSuffix: 'CNY Web Agency | Central New York Web Design',
    },
    'syracusewebdesigner.com': {
      name: 'Syracuse Web Designer',
      shortName: 'SWD',
      tagline: 'Web designer based in Syracuse, NY',
      phone: '',
      email: 'hello@syracusewebdesigner.com',
      city: 'Syracuse, NY',
      titleSuffix: 'Web Designer Syracuse NY | Affordable Custom Websites',
    },
    'www.syracusewebdesigner.com': {
      name: 'Syracuse Web Designer',
      shortName: 'SWD',
      tagline: 'Web designer based in Syracuse, NY',
      phone: '',
      email: 'hello@syracusewebdesigner.com',
      city: 'Syracuse, NY',
      titleSuffix: 'Web Designer Syracuse NY | Affordable Custom Websites',
    },
  };

  const host = window.location.hostname;
  const brand = BRANDS[host];
  if (!brand) return;

  function updateLdObject(o) {
    if (!o || typeof o !== 'object') return;
    if (o['@id'] && String(o['@id']).indexOf('customsite.online') !== -1) {
      o['@id'] = String(o['@id']).replace(/customsite\.online/g, host);
    }
    if (o.name === 'CustomSite' || o.name === 'CustomSite — Professional Web Design') {
      o.name = brand.name;
    }
    if (o['@type'] && String(o['@type']).toLowerCase().indexOf('localbusiness') !== -1) {
      o.email = brand.email;
      if (brand.phone) o.telephone = brand.phone;
      o.url = 'https://' + host + '/';
      if (o.description) {
        o.description = String(o.description).replace(/CustomSite/g, brand.name);
      }
    }
    if (o.alternateName && o.alternateName === 'CustomSite Web Design') {
      o.alternateName = brand.name;
    }
    if (o['@type'] === 'WebSite' && o.name === 'CustomSite') {
      o.name = brand.name;
      o.url = 'https://' + host + '/';
    }
  }

  function processLdData(data) {
    if (data['@graph'] && Array.isArray(data['@graph'])) {
      data['@graph'].forEach(updateLdObject);
    } else {
      updateLdObject(data);
    }
    (function replaceBase(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(replaceBase);
        return;
      }
      Object.keys(node).forEach(function (k) {
        if (k === 'sameAs') return;
        var v = node[k];
        if (typeof v === 'string' && v.indexOf('https://customsite.online') === 0) {
          try {
            var u = new URL(v);
            /* eslint-disable-next-line no-param-reassign */
            node[k] = 'https://' + host + u.pathname + u.search + u.hash;
          } catch (e) {
            /* ignore */
          }
        } else {
          replaceBase(v);
        }
      });
    })(data);
  }

  const currentTitle = document.title;
  if (currentTitle.indexOf(' | ') !== -1) {
    document.title = currentTitle.split(' | ')[0] + ' | ' + brand.name;
  } else {
    document.title = brand.titleSuffix;
  }

  document
    .querySelectorAll('.logo-wordmark, .logo-stacked, img[alt="CustomSite"]')
    .forEach(function (img) {
      if (img.tagName === 'IMG') img.alt = brand.name;
    });
  const navBrandEl = document.getElementById('nav-brand-name');
  if (navBrandEl) navBrandEl.textContent = brand.name;
  const navMark = document.getElementById('nav-logo-mark');
  if (navMark && brand.shortName) navMark.textContent = brand.shortName;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  const swapMap = { CustomSite: brand.name, 'hello@customsite.online': brand.email };
  /* eslint-disable-next-line no-cond-assign */
  let node;
  /* eslint-disable-next-line no-cond-assign */
  while ((node = walker.nextNode())) {
    const t = String(node.nodeValue);
    if (!t || !t.trim()) continue;
    let next = t;
    Object.keys(swapMap).forEach(function (k) {
      if (t.indexOf(k) !== -1) next = next.split(k).join(swapMap[k]);
    });
    if (next !== t) node.nodeValue = next;
  }

  const brandNameEl = document.getElementById('brand-name');
  if (brandNameEl) brandNameEl.textContent = brand.name;
  const taglineEl = document.getElementById('brand-tagline');
  if (taglineEl) taglineEl.textContent = brand.tagline;

  if (brand.phone) {
    document.querySelectorAll('.brand-phone').forEach(function (el) {
      el.textContent = brand.phone;
      if (el.tagName === 'A') el.setAttribute('href', 'tel:' + String(brand.phone).replace(/\D/g, ''));
    });
  }
  document.querySelectorAll('.brand-email').forEach(function (el) {
    el.textContent = brand.email;
    if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + brand.email);
  });
  document.querySelectorAll('.brand-city').forEach(function (el) {
    el.textContent = brand.city;
  });

  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
    var raw = s.textContent;
    if (!raw || !raw.trim()) return;
    try {
      var data = JSON.parse(raw);
      processLdData(data);
      s.textContent = JSON.stringify(data);
    } catch (e) {
      /* ignore invalid JSON in dev */
    }
  });

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    try {
      var u = new URL(canonical.getAttribute('href') || '', window.location.origin);
      if (u.hostname && u.hostname.indexOf('customsite') !== -1) {
        canonical.setAttribute('href', 'https://' + host + u.pathname + u.search + u.hash);
      } else {
        canonical.setAttribute('href', canonical.getAttribute('href').replace('customsite.online', host));
      }
    } catch (err) {
      canonical.setAttribute('href', canonical.getAttribute('href').replace('customsite.online', host));
    }
  }

  document.querySelectorAll('meta[property="og:url"]').forEach(function (m) {
    m.setAttribute('content', String(m.getAttribute('content') || '').replace('customsite.online', host));
  });
  document.querySelectorAll('meta[property="og:site_name"]').forEach(function (m) {
    m.setAttribute('content', brand.name);
  });
})();
