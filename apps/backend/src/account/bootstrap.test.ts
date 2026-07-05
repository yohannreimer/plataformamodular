import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../db.js';
import { createInternalUser } from '../internalAuth.js';
import { assignTestDbPath } from '../test/testDb.js';

function cleanupDbFiles(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function mockAccountFetch(workspace: { id: string; name: string; type: string; role: string }) {
  return async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/customers/sync')) {
      return new Response(JSON.stringify({
        customer_id: 'customer-1',
        clerk_user_id: 'clerk-1',
        email: 'user@example.com',
        workspace
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.endsWith('/me/products')) {
      return new Response(JSON.stringify({
        customer: {
          id: 'customer-1',
          email: 'user@example.com',
          name: 'User'
        },
        workspace,
        products: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'unexpected Account API path' }), { status: 404 });
  };
}

test('account bootstrap does not create organization for non-provisioned users', async () => {
  const previousFetch = globalThis.fetch;
  const previousBootstrapAdmins = process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
  const dbPath = assignTestDbPath('account-bootstrap-non-provisioned');
  cleanupDbFiles(dbPath);
  process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = '';
  globalThis.fetch = mockAccountFetch({
    id: 'workspace-unprovisioned',
    name: 'Acme Ltda',
    type: 'company',
    role: 'owner'
  });

  try {
    const app = createApp({ forceDbRefresh: true });
    const res = await request(app)
      .post('/auth/account/bootstrap')
      .set('X-Clerk-Token', 'clerk-token')
      .send({
        clerk_user_id: 'clerk-1',
        email: 'user@example.com',
        name: 'User'
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.reason, 'no_internal_user');
    const org = db.prepare(`
      select id from organization where account_workspace_id = ?
    `).get('workspace-unprovisioned');
    assert.equal(org, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBootstrapAdmins === undefined) {
      delete process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
    } else {
      process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = previousBootstrapAdmins;
    }
    cleanupDbFiles(dbPath);
  }
});

test('account bootstrap creates bootstrap-admin users in the Account workspace organization', async () => {
  const previousFetch = globalThis.fetch;
  const previousBootstrapAdmins = process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
  const dbPath = assignTestDbPath('account-bootstrap-admin-org');
  cleanupDbFiles(dbPath);
  process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = 'user@example.com';
  globalThis.fetch = mockAccountFetch({
    id: 'workspace-admin',
    name: 'Acme Ltda',
    type: 'company',
    role: 'owner'
  });

  try {
    const app = createApp({ forceDbRefresh: true });
    const res = await request(app)
      .post('/auth/account/bootstrap')
      .set('X-Clerk-Token', 'clerk-token')
      .send({
        clerk_user_id: 'clerk-1',
        email: 'user@example.com',
        name: 'User'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.session.user.organization_id.startsWith('org-'), true);
    const org = db.prepare(`
      select id, account_workspace_id from organization where id = ?
    `).get(res.body.session.user.organization_id) as { id: string; account_workspace_id: string } | undefined;
    assert.equal(org?.account_workspace_id, 'workspace-admin');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBootstrapAdmins === undefined) {
      delete process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
    } else {
      process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = previousBootstrapAdmins;
    }
    cleanupDbFiles(dbPath);
  }
});

test('account bootstrap uses Account API identity instead of trusting browser payload identity', async () => {
  const previousFetch = globalThis.fetch;
  const previousBootstrapAdmins = process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
  const dbPath = assignTestDbPath('account-bootstrap-hub-identity');
  cleanupDbFiles(dbPath);
  process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = 'user@example.com';
  globalThis.fetch = mockAccountFetch({
    id: 'workspace-hub-identity',
    name: 'Hub Identity Co',
    type: 'company',
    role: 'owner'
  });

  try {
    const app = createApp({ forceDbRefresh: true });
    const res = await request(app)
      .post('/auth/account/bootstrap')
      .set('X-Clerk-Token', 'clerk-token')
      .send({
        clerk_user_id: 'attacker-clerk',
        email: 'attacker@example.com',
        name: 'Attacker'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.session.user.username, 'user@example.com');
    const attackerUser = db.prepare(`
      select id from internal_user where username = ?
    `).get('attacker@example.com');
    assert.equal(attackerUser, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBootstrapAdmins === undefined) {
      delete process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
    } else {
      process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = previousBootstrapAdmins;
    }
    cleanupDbFiles(dbPath);
  }
});

test('account bootstrap realigns existing internal users to the Account workspace organization', async () => {
  const previousFetch = globalThis.fetch;
  const previousBootstrapAdmins = process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
  const dbPath = assignTestDbPath('account-bootstrap-existing-user-org');
  cleanupDbFiles(dbPath);
  process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = '';
  globalThis.fetch = mockAccountFetch({
    id: 'workspace-existing',
    name: 'Existing Co',
    type: 'company',
    role: 'owner'
  });

  try {
    const app = createApp({ forceDbRefresh: true });
    createInternalUser({
      username: 'user@example.com',
      display_name: 'User',
      password: 'secret-password',
      role: 'supremo',
      permissions: ['admin'],
      is_active: true
    });

    const res = await request(app)
      .post('/auth/account/bootstrap')
      .set('X-Clerk-Token', 'clerk-token')
      .send({
        clerk_user_id: 'clerk-1',
        email: 'user@example.com',
        name: 'User'
      });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.session.user.organization_id, 'org-holand');
    const org = db.prepare(`
      select account_workspace_id from organization where id = ?
    `).get(res.body.session.user.organization_id) as { account_workspace_id: string } | undefined;
    assert.equal(org?.account_workspace_id, 'workspace-existing');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBootstrapAdmins === undefined) {
      delete process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS;
    } else {
      process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS = previousBootstrapAdmins;
    }
    cleanupDbFiles(dbPath);
  }
});
