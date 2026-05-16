import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { assignTestDbPath } from '../test/testDb.js';

test('account product access blocks protected app routes without Clerk token when enabled', async () => {
  assignTestDbPath('account-product-missing-token');
  const app = createApp({ forceDbRefresh: true, enforceAccountProductAccess: true });

  const res = await request(app).get('/dashboard');

  assert.equal(res.status, 401);
  assert.equal(res.body.reason, 'missing_clerk_token');
  assert.equal(res.body.product_key, 'orquestrador');
});

test('account product access allows protected app routes when Account API allows product', async () => {
  assignTestDbPath('account-product-allowed');
  const app = createApp({ forceDbRefresh: true, enforceAccountProductAccess: true });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    allowed: true,
    product_key: 'orquestrador',
    status: 'active',
    plan: 'pro',
    reason: 'active_entitlement'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    const res = await request(app).get('/dashboard').set('X-Clerk-Token', 'test-clerk-token');
    assert.equal(res.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
