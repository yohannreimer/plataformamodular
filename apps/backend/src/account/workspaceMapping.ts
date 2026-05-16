import { db, uuid } from '../db.js';

type AccountWorkspaceInput = {
  accountWorkspaceId: string;
  workspaceName: string;
  workspaceType: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  account_workspace_id: string | null;
  is_active: number;
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
  const name = input.workspaceName.trim() || 'Workspace';
  const slug = `${slugify(name)}-${input.accountWorkspaceId.slice(0, 8)}`;

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
