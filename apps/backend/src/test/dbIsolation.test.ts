import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { db, initDb, resetDbConnection, seedDb } from '../db.js';
import { assignTestDbPath } from './testDb.js';
import { getFinanceReports } from '../finance/reports.js';

function cleanupDbFiles(dbPath: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function canonicalPath(filePath: string) {
  return fs.realpathSync.native(filePath);
}

function currentDbFile() {
  const rows = db.prepare('pragma database_list').all() as Array<{ name: string; file: string }>;
  const mainDb = rows.find((row) => row.name === 'main');
  assert.ok(mainDb, 'expected main sqlite database');
  return canonicalPath(mainDb.file);
}

test('db reconnects when APP_DB_PATH changes in the same process', () => {
  const firstPath = assignTestDbPath('db-isolation-first');
  cleanupDbFiles(firstPath);
  resetDbConnection();
  initDb();
  db.exec(`
    create table if not exists __test_marker (value text not null);
    insert into __test_marker (value) values ('first');
  `);

  assert.equal(currentDbFile(), canonicalPath(path.resolve(firstPath)));
  assert.equal(
    (db.prepare('select value from __test_marker').get() as { value: string }).value,
    'first'
  );

  const secondPath = assignTestDbPath('db-isolation-second');
  cleanupDbFiles(secondPath);
  resetDbConnection();

  assert.equal(currentDbFile(), canonicalPath(path.resolve(secondPath)));
  const markerTable = db.prepare(`
    select count(*) as count
    from sqlite_master
    where type = 'table' and name = '__test_marker'
  `).get() as { count: number };
  assert.equal(markerTable.count, 0);

  cleanupDbFiles(firstPath);
  cleanupDbFiles(secondPath);
});

test('core Orquestrador tables include organization_id', () => {
  const dbPath = assignTestDbPath('orquestrador-tenant-schema');
  cleanupDbFiles(dbPath);
  resetDbConnection();
  initDb();

  const tables = [
    'company',
    'technician',
    'cohort',
    'company_module_progress',
    'company_license',
    'license_program',
    'calendar_activity',
    'planning_workspace'
  ];

  for (const table of tables) {
    const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === 'organization_id'), true, `${table} missing organization_id`);
  }

  cleanupDbFiles(dbPath);
});

test('Orquestrador unique names are scoped by organization', () => {
  const dbPath = assignTestDbPath('orquestrador-tenant-unique-scope');
  cleanupDbFiles(dbPath);
  resetDbConnection();
  initDb();

  const nowIso = new Date().toISOString();
  db.prepare('insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)')
    .run('org-a', 'Org A', 'org-a', nowIso, nowIso);
  db.prepare('insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)')
    .run('org-b', 'Org B', 'org-b', nowIso, nowIso);

  assert.doesNotThrow(() => {
    db.prepare('insert into company (id, organization_id, name) values (?, ?, ?)').run('company-a', 'org-a', 'Cliente Repetido');
    db.prepare('insert into company (id, organization_id, name) values (?, ?, ?)').run('company-b', 'org-b', 'Cliente Repetido');
    db.prepare('insert into technician (id, organization_id, name) values (?, ?, ?)').run('tech-a', 'org-a', 'Tecnico Repetido');
    db.prepare('insert into technician (id, organization_id, name) values (?, ?, ?)').run('tech-b', 'org-b', 'Tecnico Repetido');
    db.prepare('insert into cohort (id, organization_id, code, name, start_date, capacity_companies) values (?, ?, ?, ?, ?, ?)')
      .run('cohort-a', 'org-a', 'TURMA-1', 'Turma Repetida A', '2026-05-17', 10);
    db.prepare('insert into cohort (id, organization_id, code, name, start_date, capacity_companies) values (?, ?, ?, ?, ?, ?)')
      .run('cohort-b', 'org-b', 'TURMA-1', 'Turma Repetida B', '2026-05-17', 10);
    db.prepare('insert into license_program (id, organization_id, name, created_at, updated_at) values (?, ?, ?, ?, ?)')
      .run('program-a', 'org-a', 'TopSolid Repetido', nowIso, nowIso);
    db.prepare('insert into license_program (id, organization_id, name, created_at, updated_at) values (?, ?, ?, ?, ?)')
      .run('program-b', 'org-b', 'TopSolid Repetido', nowIso, nowIso);
  });

  cleanupDbFiles(dbPath);
});

test('production seed keeps finance demo data disabled by default', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSeedFinanceDemo = process.env.SEED_FINANCE_DEMO;
  const dbPath = assignTestDbPath('production-skips-finance-demo-seed');
  cleanupDbFiles(dbPath);
  process.env.NODE_ENV = 'production';
  delete process.env.SEED_FINANCE_DEMO;
  resetDbConnection();

  try {
    initDb();
    seedDb();

    const moduleCount = db.prepare('select count(*) as count from module_template').get() as { count: number };
    const payableCount = db.prepare('select count(*) as count from financial_payable').get() as { count: number };
    const receivableCount = db.prepare('select count(*) as count from financial_receivable').get() as { count: number };

    assert.ok(moduleCount.count > 0);
    assert.equal(payableCount.count, 0);
    assert.equal(receivableCount.count, 0);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousSeedFinanceDemo === undefined) {
      delete process.env.SEED_FINANCE_DEMO;
    } else {
      process.env.SEED_FINANCE_DEMO = previousSeedFinanceDemo;
    }
    db.close();
    cleanupDbFiles(dbPath);
  }
});

test('production seed can opt in to finance demo data explicitly', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSeedFinanceDemo = process.env.SEED_FINANCE_DEMO;
  const dbPath = assignTestDbPath('production-allows-explicit-finance-demo-seed');
  cleanupDbFiles(dbPath);
  process.env.NODE_ENV = 'production';
  process.env.SEED_FINANCE_DEMO = 'true';
  resetDbConnection();

  try {
    initDb();
    seedDb();

    const payableCount = db.prepare('select count(*) as count from financial_payable').get() as { count: number };
    const receivableCount = db.prepare('select count(*) as count from financial_receivable').get() as { count: number };
    const transactionCount = db.prepare('select count(*) as count from financial_transaction').get() as { count: number };
    const costCenterCount = db.prepare('select count(*) as count from financial_cost_center').get() as { count: number };
    const reports = getFinanceReports('org-holand', { preset: 'all' });

    assert.ok(payableCount.count >= 10);
    assert.ok(receivableCount.count >= 10);
    assert.ok(transactionCount.count >= 120);
    assert.ok(costCenterCount.count >= 6);
    assert.ok(reports.dre_by_period.length >= 12);
    assert.ok(reports.realized_vs_projected.length >= 12);
    assert.ok(reports.cost_center_results.length >= 5);
    assert.ok(reports.income_by_category.length >= 5);
    assert.ok(reports.expense_by_category.length >= 5);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (previousSeedFinanceDemo === undefined) {
      delete process.env.SEED_FINANCE_DEMO;
    } else {
      process.env.SEED_FINANCE_DEMO = previousSeedFinanceDemo;
    }
    db.close();
    cleanupDbFiles(dbPath);
  }
});
