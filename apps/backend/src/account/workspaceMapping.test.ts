import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assignTestDbPath } from '../test/testDb.js';
import { initDb, resetDbConnection } from '../db.js';
import { findOrCreateOrganizationForAccountWorkspace } from './workspaceMapping.js';

function cleanupDbFiles(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

test('findOrCreateOrganizationForAccountWorkspace creates isolated organization', () => {
  const dbPath = assignTestDbPath('account-workspace-org-create');
  cleanupDbFiles(dbPath);
  resetDbConnection();
  initDb();

  const org = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-acme',
    workspaceName: 'Acme Ltda',
    workspaceType: 'company'
  });

  assert.equal(org.account_workspace_id, 'workspace-acme');
  assert.equal(org.name, 'Acme Ltda (6f80fe9d)');

  const again = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-acme',
    workspaceName: 'Acme Renamed',
    workspaceType: 'company'
  });

  assert.equal(again.id, org.id);
  assert.equal(again.name, 'Acme Ltda (6f80fe9d)');

  cleanupDbFiles(dbPath);
});

test('findOrCreateOrganizationForAccountWorkspace handles duplicate workspace display names', () => {
  const dbPath = assignTestDbPath('account-workspace-org-duplicate-name');
  cleanupDbFiles(dbPath);
  resetDbConnection();
  initDb();

  const first = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-alpha',
    workspaceName: 'Acme Ltda',
    workspaceType: 'company'
  });
  const second = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-beta',
    workspaceName: 'Acme Ltda',
    workspaceType: 'company'
  });

  assert.notEqual(second.id, first.id);
  assert.equal(first.name, 'Acme Ltda (a0ba8c07)');
  assert.equal(second.name, 'Acme Ltda (231ac57e)');
  assert.notEqual(first.name, second.name);
  assert.notEqual(first.slug, second.slug);

  cleanupDbFiles(dbPath);
});

test('findOrCreateOrganizationForAccountWorkspace avoids slug collisions for similar workspace ids', () => {
  const dbPath = assignTestDbPath('account-workspace-org-similar-ids');
  cleanupDbFiles(dbPath);
  resetDbConnection();
  initDb();

  const first = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1',
    workspaceName: 'Acme Ltda'
  });
  const second = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-2',
    workspaceName: 'Acme Ltda'
  });

  assert.notEqual(second.id, first.id);
  assert.notEqual(first.slug, second.slug);

  cleanupDbFiles(dbPath);
});
