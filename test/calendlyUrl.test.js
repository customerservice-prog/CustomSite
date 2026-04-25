'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { cleanCalendlyUrl } = require('../lib/calendlyUrl');

describe('cleanCalendlyUrl', () => {
  test('rejects placeholders', () => {
    assert.equal(cleanCalendlyUrl('https://calendly.com/REPLACE-ME-20min'), null);
    assert.equal(cleanCalendlyUrl('https://calendly.com/d/abc/replace-me'), null);
  });
  test('rejects non-calendly and http', () => {
    assert.equal(cleanCalendlyUrl('http://calendly.com/a/b'), null);
    assert.equal(cleanCalendlyUrl('https://example.com/a/b'), null);
  });
  test('accepts real booking URLs', () => {
    const u = 'https://calendly.com/acme/intro-20min';
    assert.equal(cleanCalendlyUrl(u), u);
    assert.equal(cleanCalendlyUrl('https://www.calendly.com/acme/intro'), 'https://www.calendly.com/acme/intro');
  });
  test('requires user and event path', () => {
    assert.equal(cleanCalendlyUrl('https://calendly.com/onlyone'), null);
  });
});
