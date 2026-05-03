'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyClientHtmlVideoModalGuard,
} = require('../lib/clientSiteVideoModalGuard');

test('prepends inline display:none on #videoModal when not opted out', () => {
  const html =
    '<!DOCTYPE html><html><body>' +
    '<div id="videoModal" class="modal-overlay"></div>' +
    '</body></html>';
  const out = applyClientHtmlVideoModalGuard(html);
  assert.ok(
    /<div\b[^>]*\bid\s*=\s*"videoModal"[^>]*\bstyle\s*=\s*"display\s*:\s*none\s*!\s*important/i.test(out),
  );
});

test('does not add inline smash when #videoModal has data-cs-allow-modal="1"', () => {
  const html =
    '<!DOCTYPE html><html><body>' +
    '<div id="videoModal" data-cs-allow-modal="1" class="modal-overlay"></div>' +
    '</body></html>';
  const out = applyClientHtmlVideoModalGuard(html);
  /** Opening tag stays without server-injected hide (client CSS + JS control visibility). */
  assert.ok(
    !/<div\s+id="videoModal"[^>]*style\s*=/.test(out),
    'unexpected inline style on exempt modal',
  );
});

test('injectSync + DOM snippets bail out when exempt (script text includes allow check)', () => {
  const html =
    '<!DOCTYPE html><html><body><div id="videoModal" data-cs-allow-modal="1"></div></body></html>';
  const out = applyClientHtmlVideoModalGuard(html);
  assert.ok(
    out.includes("getAttribute('data-cs-allow-modal')==="),
    'expected allow-modal branch in injected guard',
  );
});
