'use strict';

const GRAPES_VER = '0.21.13';

let editorRef = null;
let onUpdateUnsub = null;

function loadGrapesCssOnce() {
  if (document.querySelector('link[data-sb-grapes-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://cdn.jsdelivr.net/npm/grapesjs@${GRAPES_VER}/dist/css/grapes.min.css`;
  l.setAttribute('data-sb-grapes-css', '1');
  document.head.appendChild(l);
}

/**
 * @param {HTMLElement} hostEl
 * @param {string} fullHtml
 * @param {() => void} [onChange]
 */
export async function openGrapesEditor(hostEl, fullHtml, onChange) {
  loadGrapesCssOnce();
  if (onUpdateUnsub) {
    try {
      onUpdateUnsub();
    } catch {
      /* */
    }
    onUpdateUnsub = null;
  }
  if (editorRef) {
    try {
      editorRef.destroy();
    } catch {
      /* */
    }
    editorRef = null;
  }
  hostEl.replaceChildren();
  const gjs = (await import(`https://esm.sh/grapesjs@${GRAPES_VER}`)).default;
  const d = new DOMParser().parseFromString(fullHtml, 'text/html');
  editorRef = gjs.init({
    container: hostEl,
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
  });
  editorRef.setComponents(d.body ? d.body.innerHTML : fullHtml);
  if (onChange) {
    const run = () => onChange();
    editorRef.on('update', run);
    editorRef.on('component:update', run);
    onUpdateUnsub = () => {
      try {
        editorRef && editorRef.off('update', run);
        editorRef && editorRef.off('component:update', run);
      } catch {
        /* */
      }
    };
  }
  return editorRef;
}

/**
 * Merges Grapes canvas (body + component CSS) into the original full document.
 * @param {string} originalFull
 */
export function mergeGrapesIntoDocument(originalFull) {
  if (!editorRef) return originalFull;
  const bodyHtml = editorRef.getHtml() || '';
  const css = (editorRef.getCss && editorRef.getCss()) || '';
  const doc = new DOMParser().parseFromString(originalFull, 'text/html');
  if (doc.body) doc.body.innerHTML = bodyHtml;
  doc.querySelectorAll('style[data-sb-gjs]').forEach((n) => n.remove());
  if (css && String(css).trim()) {
    const st = doc.createElement('style');
    st.setAttribute('data-sb-gjs', '1');
    st.textContent = css;
    doc.head.appendChild(st);
  }
  if (!String(originalFull).trim().toLowerCase().startsWith('<!doctype')) {
    return doc.documentElement ? doc.documentElement.outerHTML : originalFull;
  }
  return '<!DOCTYPE html>\n' + (doc.documentElement ? doc.documentElement.outerHTML : originalFull);
}

export function hasGrapesEditor() {
  return !!editorRef;
}

export function destroyGrapesEditor() {
  if (onUpdateUnsub) {
    try {
      onUpdateUnsub();
    } catch {
      /* */
    }
    onUpdateUnsub = null;
  }
  if (editorRef) {
    try {
      editorRef.destroy();
    } catch {
      /* */
    }
    editorRef = null;
  }
}
