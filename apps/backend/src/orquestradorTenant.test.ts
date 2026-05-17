import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';

import { createApp } from './app.js';
import { db } from './db.js';
import { createInternalUser, INTERNAL_PERMISSION_KEYS } from './internalAuth.js';
import { assignTestDbPath } from './test/testDb.js';

function cleanupDbFiles(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

test('Orquestrador keeps companies isolated by organization', async () => {
  const dbPath = assignTestDbPath('orquestrador-company-isolation');
  cleanupDbFiles(dbPath);
  const app = createApp({
    forceDbRefresh: true,
    enforceInternalAuth: true,
    enforceAccountProductAccess: false
  });

  const nowIso = new Date().toISOString();
  db.prepare('insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)')
    .run('org-a', 'Org A', 'org-a', nowIso, nowIso);
  db.prepare('insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)')
    .run('org-b', 'Org B', 'org-b', nowIso, nowIso);

  createInternalUser({
    username: 'a@example.com',
    display_name: 'A',
    password: 'secret',
    role: 'supremo',
    permissions: INTERNAL_PERMISSION_KEYS,
    organization_id: 'org-a'
  });
  createInternalUser({
    username: 'b@example.com',
    display_name: 'B',
    password: 'secret',
    role: 'supremo',
    permissions: INTERNAL_PERMISSION_KEYS,
    organization_id: 'org-b'
  });

  const loginA = await request(app).post('/auth/login').send({ username: 'a@example.com', password: 'secret' });
  const loginB = await request(app).post('/auth/login').send({ username: 'b@example.com', password: 'secret' });
  assert.equal(loginA.status, 200);
  assert.equal(loginB.status, 200);

  const authA = { Authorization: `Bearer ${loginA.body.token as string}` };
  const authB = { Authorization: `Bearer ${loginB.body.token as string}` };

  const createRes = await request(app)
    .post('/companies')
    .set(authA)
    .send({ name: 'Cliente Org A', status: 'Ativo' })
    .expect(201);

  const listB = await request(app)
    .get('/companies')
    .set(authB)
    .expect(200);

  assert.equal(listB.body.some((client: { id: string }) => client.id === createRes.body.id), false);

  await request(app)
    .get(`/companies/${createRes.body.id}`)
    .set(authB)
    .expect(404);

  const listA = await request(app)
    .get('/companies')
    .set(authA)
    .expect(200);

  assert.equal(listA.body.some((client: { id: string }) => client.id === createRes.body.id), true);

  cleanupDbFiles(dbPath);
});

