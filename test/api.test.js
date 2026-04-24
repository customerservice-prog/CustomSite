'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../server.js');

describe('HTTP API', () => {
  test('GET /api/config/public returns JSON', async () => {
    const res = await request(app).get('/api/config/public').expect(200);
    assert.ok(res.body && typeof res.body === 'object');
    assert.ok('configured' in res.body);
  });

  test('POST /api/contact without required fields returns 400', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'T' }).expect(400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  test('GET /api/unknown returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    assert.equal(res.body.error, 'Not found');
  });
});
