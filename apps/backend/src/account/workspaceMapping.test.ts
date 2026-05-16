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
  assert.equal(org.name, 'Acme Ltda');

  const again = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: 'workspace-acme',
    workspaceName: 'Acme Renamed',
    workspaceType: 'company'
  });

  assert.equal(again.id, org.id);
  assert.equal(again.name, 'Acme Ltda');

  cleanupDbFiles(dbPath);
});
