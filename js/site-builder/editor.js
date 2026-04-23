'use strict';

import loader from 'https://esm.sh/@monaco-editor/loader@1.5.0';

const VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs';

let monacoRef = null;
let editorInstance = null;

export function getMonaco() {
  return monacoRef;
}

export function getEditor() {
  return editorInstance;
}

export async function initEditor(container) {
  loader.config({ paths: { vs: VS } });
  const monaco = await loader.init();
  monacoRef = monaco;
  editorInstance = monaco.editor.create(container, {
    value: '',
    language: 'html',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: true },
    tabSize: 2,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
  });
  return { monaco, editor: editorInstance };
}

export function pathToLanguage(path) {
  const p = (path || '').toLowerCase();
  if (p.endsWith('.css')) return 'css';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'javascript';
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.html') || p.endsWith('.htm')) return 'html';
  if (p.endsWith('.svg')) return 'xml';
  return 'plaintext';
}

export function setModelLanguage(editor, path) {
  if (!editor) return;
  const monaco = monacoRef;
  const model = editor.getModel();
  if (!model || !monaco) return;
  monaco.editor.setModelLanguage(model, pathToLanguage(path));
}

export function formatDocument(editor) {
  if (!editor) return;
  editor.getAction('editor.action.formatDocument').run();
}

const modelByPath = new Map();

export function getOrCreateModel(path, content) {
  const monaco = monacoRef;
  if (!monaco) return null;
  let m = modelByPath.get(path);
  if (m && !m.isDisposed()) {
    if (m.getValue() !== content) m.setValue(content);
  } else {
    m = monaco.editor.createModel(
      content,
      pathToLanguage(path),
      monaco.Uri.parse(`file:///${path.replace(/^\//, '')}`)
    );
    modelByPath.set(path, m);
  }
  return m;
}

export function showModel(editor, path, content) {
  const m = getOrCreateModel(path, content);
  if (m) editor.setModel(m);
  return m;
}

export function removeModel(path) {
  const m = modelByPath.get(path);
  if (m) {
    m.dispose();
    modelByPath.delete(path);
  }
}

export function hasModelFor(path) {
  return modelByPath.has(path);
}
