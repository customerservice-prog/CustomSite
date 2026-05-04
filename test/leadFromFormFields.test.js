'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { extractStructuredLeadFromFormFields } = require('../lib/leadFromFormFields');

describe('leadFromFormFields.extractStructuredLeadFromFormFields', () => {
  test('minimal name/email/message maps', () => {
    const out = extractStructuredLeadFromFormFields({ name: 'Sam', email: 'sam@example.com', message: 'Hi there' });
    assert.ok(out);
    assert.strictEqual(out.name, 'Sam');
    assert.strictEqual(out.email, 'sam@example.com');
    assert.match(out.message, /Hi there/);
  });

  test('aliases name from firstname+lastname', () => {
    const out = extractStructuredLeadFromFormFields({
      firstname: 'Pat',
      lastname: 'Lee',
      email: 'pat@example.com',
      message: 'OK',
    });
    assert.ok(out);
    assert.strictEqual(out.name, 'Pat Lee');
  });

  test('reject invalid email', () => {
    assert.strictEqual(extractStructuredLeadFromFormFields({ name: 'A', email: 'bad', message: 'm' }), null);
  });

  test('extras append section', () => {
    const out = extractStructuredLeadFromFormFields({
      name: 'Sam',
      email: 'sam@example.com',
      message: 'Core',
      custom_field: 'extra-value',
    });
    assert.ok(out);
    assert.ok(out.message.includes('Additional'));
    assert.ok(out.message.includes('extra-value'));
  });
});
