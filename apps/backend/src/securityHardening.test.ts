import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';

import { createApp } from './app.js';
import { createInternalUser, INTERNAL_PERMISSION_KEYS } from './internalAuth.js';
import { parsePortalRealtimeTokenFromRequest } from './portal/realtime.js';
import { assignTestDbPath } from './test/testDb.js';

function cleanupDbFiles(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

test('internal login applies rate limit after repeated invalid attempts', async () => {
  const previousLimit = process.env.INTERNAL_LOGIN_RATE_LIMIT_ATTEMPTS;
  const previousWindow = process.env.INTERNAL_LOGIN_RATE_LIMIT_WINDOW_MS;
  const dbPath = assignTestDbPath('security-internal-login-rate-limit');
  cleanupDbFiles(dbPath);
  process.env.INTERNAL_LOGIN_RATE_LIMIT_ATTEMPTS = '3';
  process.env.INTERNAL_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';

  try {
    const app = createApp({ forceDbRefresh: true, seedDb: false });
    createInternalUser({
      username: 'limited@example.com',
      display_name: 'Limited User',
      password: 'correct-password',
      role: 'supremo',
      permissions: INTERNAL_PERMISSION_KEYS
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'limited@example.com', password: 'wrong-password' });
      assert.equal(res.status, 401);
    }

    const blocked = await request(app)
      .post('/auth/login')
      .send({ username: 'limited@example.com', password: 'wrong-password' });

    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.reason, 'rate_limited');
  } finally {
    if (previousLimit === undefined) {
      delete process.env.INTERNAL_LOGIN_RATE_LIMIT_ATTEMPTS;
    } else {
      process.env.INTERNAL_LOGIN_RATE_LIMIT_ATTEMPTS = previousLimit;
    }
    if (previousWindow === undefined) {
      delete process.env.INTERNAL_LOGIN_RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.INTERNAL_LOGIN_RATE_LIMIT_WINDOW_MS = previousWindow;
    }
    cleanupDbFiles(dbPath);
  }
});

test('CORS only reflects configured allowed origins', async () => {
  const previousCorsOrigins = process.env.CORS_ORIGINS;
  const dbPath = assignTestDbPath('security-cors-allowlist');
  cleanupDbFiles(dbPath);
  process.env.CORS_ORIGINS = 'https://fluvia.example,https://velio.example';

  try {
    const app = createApp({ forceDbRefresh: true, seedDb: false });

    const allowed = await request(app)
      .options('/health')
      .set('Origin', 'https://fluvia.example')
      .set('Access-Control-Request-Method', 'GET');
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://fluvia.example');

    const blocked = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');
    assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  } finally {
    if (previousCorsOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previousCorsOrigins;
    }
    cleanupDbFiles(dbPath);
  }
});

test('production admin workbook import rejects arbitrary server file paths', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAllowAnyPath = process.env.ADMIN_WORKBOOK_IMPORT_ALLOW_ANY_PATH;
  const dbPath = assignTestDbPath('security-import-workbook-path');
  cleanupDbFiles(dbPath);
  process.env.NODE_ENV = 'production';
  delete process.env.ADMIN_WORKBOOK_IMPORT_ALLOW_ANY_PATH;

  try {
    const app = createApp({ forceDbRefresh: true, seedDb: false, enforceInternalAuth: true });
    createInternalUser({
      username: 'admin.import@example.com',
      display_name: 'Admin Import',
      password: 'secret-password',
      role: 'supremo',
      permissions: INTERNAL_PERMISSION_KEYS
    });

    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin.import@example.com', password: 'secret-password' });
    assert.equal(login.status, 200);

    const res = await request(app)
      .post('/admin/import-workbook')
      .set('Authorization', `Bearer ${login.body.token as string}`)
      .send({ file_path: '/etc/hosts' });

    assert.equal(res.status, 400);
    assert.equal(res.body.reason, 'server_file_path_not_allowed');
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousAllowAnyPath === undefined) {
      delete process.env.ADMIN_WORKBOOK_IMPORT_ALLOW_ANY_PATH;
    } else {
      process.env.ADMIN_WORKBOOK_IMPORT_ALLOW_ANY_PATH = previousAllowAnyPath;
    }
    cleanupDbFiles(dbPath);
  }
});

test('internal login sets httpOnly session cookie and auth accepts cookie session', async () => {
  const dbPath = assignTestDbPath('security-internal-cookie-session');
  cleanupDbFiles(dbPath);

  try {
    const app = createApp({ forceDbRefresh: true, seedDb: false });
    createInternalUser({
      username: 'cookie@example.com',
      display_name: 'Cookie User',
      password: 'secret-password',
      role: 'supremo',
      permissions: INTERNAL_PERMISSION_KEYS
    });

    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'cookie@example.com', password: 'secret-password' });

    assert.equal(login.status, 200);
    const cookies = login.headers['set-cookie'] as unknown as string[] | undefined;
    assert.ok(cookies?.some((cookie) => (
      cookie.startsWith('pm_internal_session=')
      && cookie.includes('HttpOnly')
      && cookie.includes('SameSite=Lax')
    )));

    const cookieHeader = cookies?.find((cookie) => cookie.startsWith('pm_internal_session='))?.split(';')[0] ?? '';
    const me = await request(app)
      .get('/auth/me')
      .set('Cookie', cookieHeader);

    assert.equal(me.status, 200);
    assert.equal(me.body.user.username, 'cookie@example.com');
  } finally {
    cleanupDbFiles(dbPath);
  }
});

test('default JSON body limit rejects oversized non-upload payloads', async () => {
  const dbPath = assignTestDbPath('security-default-body-limit');
  cleanupDbFiles(dbPath);

  try {
    const app = createApp({ forceDbRefresh: true, seedDb: false });
    const oversized = 'x'.repeat(2_200_000);
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'body@example.com', password: oversized });

    assert.equal(res.status, 413);
  } finally {
    cleanupDbFiles(dbPath);
  }
});

test('portal websocket token is read from subprotocol instead of URL query', () => {
  const token = parsePortalRealtimeTokenFromRequest({
    headers: {
      'sec-websocket-protocol': 'portal.session, portal-token.session_abc-123'
    }
  } as any);

  assert.equal(token, 'session_abc-123');
});
