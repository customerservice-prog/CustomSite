'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { htmlAppearsToHaveViewportMeta } = require('../lib/htmlViewportMeta');

describe('htmlAppearsToHaveViewportMeta', () => {
  test('detects quoted and unquoted viewport meta', () => {
    assert.equal(htmlAppearsToHaveViewportMeta('<meta name="viewport" content="width=device-width">'), true);
    assert.equal(htmlAppearsToHaveViewportMeta('<meta name=viewport content="width=device-width">'), true);
    assert.equal(htmlAppearsToHaveViewportMeta('<html><body></body></html>'), false);
  });
});
