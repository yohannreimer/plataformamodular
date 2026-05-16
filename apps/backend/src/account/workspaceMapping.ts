import { createHash } from 'node:crypto';
import { db, uuid } from '../db.js';

type AccountWorkspaceInput = {
  accountWorkspaceId: string;
  workspaceName: string;
  workspaceType?: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  account_workspace_id: string | null;
  is_active: number;
};

type UniqueOrganizationFields = {
  name: string;
  slug: string;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
}

function uniqueOrganizationFields(input: AccountWorkspaceInput): UniqueOrganizationFields {
  const baseName = input.workspaceName.trim() || 'Workspace';
  const suffix = createHash('sha256').update(input.accountWorkspaceId).digest('hex').slice(0, 8);
  const name = `${baseName} (${suffix})`;
  return {
    name,
    slug: `${slugify(baseName)}-${suffix}`
  };
}

export function findOrCreateOrganizationForAccountWorkspace(input: AccountWorkspaceInput): OrganizationRow {
  const existing = db.prepare(`
    select id, name, slug, account_workspace_id, is_active
    from organization
    where account_workspace_id = ?
    limit 1
  `).get(input.accountWorkspaceId) as OrganizationRow | undefined;

  if (existing) {
    return existing;
  }

  const id = uuid('org');
  const nowIso = new Date().toISOString();
  const { name, slug } = uniqueOrganizationFields(input);

  db.prepare(`
    insert into organization (id, name, slug, account_workspace_id, is_active, created_at, updated_at)
    values (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, slug, input.accountWorkspaceId, nowIso, nowIso);

  return db.prepare(`
    select id, name, slug, account_workspace_id, is_active
    from organization
    where id = ?
  `).get(id) as OrganizationRow;
}
