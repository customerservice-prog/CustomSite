'use strict';

let host;
export function initToast() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'sbToastHost';
  host.style.cssText =
    'position:fixed;top:0.75rem;right:0.75rem;z-index:20000;display:flex;flex-direction:column;gap:0.4rem;max-width:20rem;pointer-events:none';
  document.body.appendChild(host);
}

export function toast(message, type = 'info', ms = 4000) {
  if (!host) initToast();
  const el = document.createElement('div');
  const bg = type === 'success' ? '#15803d' : type === 'error' ? '#b91c1c' : '#1e3a5f';
  el.style.cssText = `background:${bg};color:#fff;padding:0.6rem 0.9rem;border-radius:0.4rem;font-size:0.85rem;pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,0.25)`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
