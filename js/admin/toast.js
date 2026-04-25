'use strict';

let host;

export function initToast() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'admToastHost';
  host.className = 'toast-container';
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
}

export function toast(message, type = 'info', ms = 4000) {
  if (!host) initToast();
  const el = document.createElement('div');
  const kind = type === 'success' || type === 'error' || type === 'warning' || type === 'info' ? type : 'info';
  el.className = `toast ${kind} adm-toast ts-${kind}`;
  el.setAttribute('role', 'status');
  el.appendChild(document.createTextNode(String(message || '')));
  host.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, ms);
}
