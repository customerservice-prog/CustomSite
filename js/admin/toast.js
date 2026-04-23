'use strict';

let host;

export function initToast() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'admToastHost';
  host.setAttribute('aria-live', 'polite');
  host.style.cssText =
    'position:fixed;top:1rem;right:1rem;z-index:10000;display:flex;flex-direction:column;gap:0.5rem;max-width:22rem;pointer-events:none';
  document.body.appendChild(host);
}

export function toast(message, type = 'info', ms = 4000) {
  if (!host) initToast();
  const el = document.createElement('div');
  const bg =
    type === 'success'
      ? '#15803d'
      : type === 'error'
        ? '#b91c1c'
        : type === 'warning'
          ? '#a16207'
          : '#1e3a5f';
  el.style.cssText = `background:${bg};color:#fff;padding:0.75rem 1rem;border-radius:0.5rem;font-size:0.9rem;box-shadow:0 4px 20px rgba(0,0,0,0.2);pointer-events:auto`;
  el.textContent = message;
  host.appendChild(el);
  const t = setTimeout(() => {
    el.remove();
    clearTimeout(t);
  }, ms);
}
