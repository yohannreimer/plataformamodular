import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync } from 'node:crypto';

type SqliteDatabase = InstanceType<typeof Database>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

function resolveDbPath() {
  const explicitDbPath = process.env.APP_DB_PATH?.trim();
  return explicitDbPath ? path.resolve(explicitDbPath) : path.resolve(dataDir, 'app.db');
}

let activeDbPath: string | null = null;
let activeDb: SqliteDatabase | null = null;

function getDbConnection(forceRefresh = false): SqliteDatabase {
  const nextDbPath = resolveDbPath();
  if (!forceRefresh && activeDb && activeDbPath === nextDbPath) {
    return activeDb;
  }

  const nextDb = new Database(nextDbPath);
  nextDb.pragma('foreign_keys = ON');
  const previousDb = activeDb;
  activeDb = nextDb;
  activeDbPath = nextDbPath;
  previousDb?.close();

  return nextDb;
}

export function resetDbConnection() {
  return getDbConnection(true);
}

export const db = new Proxy({} as SqliteDatabase, {
  get(_target, property) {
    const connection = getDbConnection();
    const value = Reflect.get(connection, property);
    return typeof value === 'function' ? value.bind(connection) : value;
  },
  set(_target, property, value) {
    return Reflect.set(getDbConnection(), property, value);
  },
  has(_target, property) {
    return Reflect.has(getDbConnection(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(getDbConnection());
  },
  getOwnPropertyDescriptor(_target, property) {
    return Reflect.getOwnPropertyDescriptor(getDbConnection(), property);
  }
});

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`alter table ${table} add column ${definition}`);
  }
}

function hasCompositeUniqueIndex(table: string, columns: string[]) {
  const indexes = db.prepare(`pragma index_list(${table})`).all() as Array<{
    name: string;
    unique: number;
  }>;

  return indexes.some((index) => {
    if (index.unique !== 1) {
      return false;
    }

    const indexColumns = db.prepare(`pragma index_info(${index.name})`).all() as Array<{
      seqno: number;
      name: string;
    }>;

    const orderedColumns = indexColumns
      .sort((left, right) => left.seqno - right.seqno)
      .map((column) => column.name);

    return orderedColumns.length === columns.length
      && orderedColumns.every((column, position) => column === columns[position]);
  });
}

function readTableColumns(table: string) {
  return db.prepare(`pragma table_info(${table})`).all() as Array<{
    name: string;
    notnull: number;
  }>;
}

function normalizeFinanceText(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function hasColumn(table: string, column: string) {
  return readTableColumns(table).some((item) => item.name === column);
}

function hasTable(table: string) {
  const row = db.prepare(`
    select name
    from sqlite_master
    where type = 'table' and name = ?
  `).get(table) as { name: string } | undefined;
  return Boolean(row);
}

function hasForeignKey(table: string, targetTable: string, from: string, to: string) {
  const foreignKeys = db.prepare(`pragma foreign_key_list(${table})`).all() as Array<{
    table: string;
    from: string;
    to: string;
  }>;

  return foreignKeys.some((item) => item.table === targetTable && item.from === from && item.to === to);
}

function uniqueSortedIsoDates(values: string[]): string[] {
  return Array.from(new Set(values
    .map((item) => item.trim())
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
  )).sort((a, b) => a.localeCompare(b));
}

function iterateIsoDateRange(startDate: string, endDate: string): string[] {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) return [];

  const cursor = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return [];

  const results: string[] = [];
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    results.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function hashInternalPasswordSeed(password: string): string {
  const saltHex = randomBytes(16).toString('hex');
  const digest = scryptSync(password, saltHex, 64);
  return `scrypt:${saltHex}:${digest.toString('hex')}`;
}

const DEFAULT_ORGANIZATION_ID = 'org-holand';

const ORQUESTRADOR_TENANT_TABLES = [
  'company',
  'technician',
  'cohort',
  'company_module_progress',
  'company_module_activation',
  'cohort_module_block',
  'cohort_schedule_day',
  'cohort_allocation',
  'cohort_participant',
  'cohort_participant_module',
  'company_optional_progress',
  'company_license',
  'license_program',
  'calendar_activity',
  'planning_workspace',
  'planning_workspace_client',
  'planning_cohort',
  'planning_encounter',
  'implementation_kanban_card',
  'recruitment_candidate'
] as const;

export function initDb() {
  db.pragma('journal_mode = WAL');

  db.exec(`
    create table if not exists module_template (
      id text primary key,
      code text not null unique,
      category text not null,
      name text not null,
      description text,
      duration_days integer not null,
      profile text,
      is_mandatory integer not null default 0
    );

    create table if not exists company (
      id text primary key,
      name text not null unique,
      status text not null default 'Em_treinamento',
      notes text,
      priority integer not null default 0,
      priority_level text not null default 'Normal',
      contact_name text,
      contact_phone text,
      contact_email text,
      modality text not null default 'Turma_Online',
      is_third_party integer not null default 0
    );

    create table if not exists company_module_progress (
      id text primary key,
      company_id text not null,
      module_id text not null,
      status text not null default 'Nao_iniciado',
      notes text,
      completed_at text,
      custom_duration_days integer,
      custom_units integer,
      unique(company_id, module_id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists company_module_activation (
      company_id text not null,
      module_id text not null,
      is_enabled integer not null default 1,
      primary key (company_id, module_id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists portal_client (
      id text primary key,
      company_id text not null unique,
      slug text not null unique,
      is_active integer not null default 1,
      support_intro_text text,
      hidden_module_ids_json text not null default '[]',
      module_date_overrides_json text not null default '{}',
      module_status_overrides_json text not null default '{}',
      module_delivery_mode_overrides_json text not null default '{}',
      created_at text not null,
      updated_at text not null,
      unique(id, company_id),
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists portal_user (
      id text primary key,
      portal_client_id text not null,
      username text not null,
      password_hash text not null,
      is_active integer not null default 1,
      last_login_at text,
      created_at text not null,
      updated_at text not null,
      unique(id, portal_client_id),
      unique(portal_client_id, username),
      foreign key(portal_client_id) references portal_client(id) on delete cascade
    );

    create table if not exists portal_session (
      id text primary key,
      portal_user_id text not null,
      portal_client_id text not null,
      company_id text not null,
      token_hash text not null unique,
      is_internal integer not null default 0,
      expires_at text not null,
      created_at text not null,
      last_seen_at text not null,
      foreign key(portal_user_id, portal_client_id)
        references portal_user(id, portal_client_id)
        on delete cascade,
      foreign key(portal_client_id, company_id)
        references portal_client(id, company_id)
        on delete cascade
    );

    create table if not exists portal_ticket (
      id text primary key,
      company_id text not null,
      portal_user_id text not null,
      title text not null,
      description text,
      priority text not null default 'Normal',
      status text not null default 'Aberto',
      origin text not null default 'portal_cliente',
      whatsapp_number text,
      last_read_cliente_at text,
      last_read_holand_at text,
      kanban_card_id text,
      created_at text not null,
      updated_at text not null,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(portal_user_id) references portal_user(id) on delete cascade,
      foreign key(kanban_card_id) references implementation_kanban_card(id) on delete set null
    );

    create table if not exists portal_ticket_message (
      id text primary key,
      ticket_id text not null,
      author_type text not null default 'Cliente',
      author_label text,
      body text,
      created_at text not null,
      foreign key(ticket_id) references portal_ticket(id) on delete cascade
    );

    create table if not exists portal_ticket_attachment (
      id text primary key,
      ticket_message_id text not null,
      file_name text not null,
      mime_type text not null,
      file_data_base64 text not null,
      file_size_bytes integer not null default 0,
      created_at text not null,
      foreign key(ticket_message_id) references portal_ticket_message(id) on delete cascade
    );

    create table if not exists portal_ticket_webhook_queue (
      id text primary key,
      ticket_id text not null,
      company_id text not null,
      recipient_side text not null,
      recipient_whatsapp text not null,
      trigger_event text not null,
      event_created_at text not null,
      available_at text not null,
      payload_json text not null,
      sent_at text,
      suppressed_at text,
      suppression_reason text,
      last_error text,
      created_at text not null,
      updated_at text not null,
      foreign key(ticket_id) references portal_ticket(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists portal_agenda_item (
      id text primary key,
      portal_client_id text not null,
      title text not null,
      activity_type text not null default 'Outro',
      start_date text not null,
      end_date text not null,
      all_day integer not null default 1,
      start_time text,
      end_time text,
      status text not null default 'Planejada',
      notes text,
      created_at text not null,
      updated_at text not null,
      foreign key(portal_client_id) references portal_client(id) on delete cascade
    );

    create table if not exists portal_certificate_evaluation (
      id text primary key,
      company_id text not null,
      portal_client_id text not null,
      cohort_id text,
      module_id text not null,
      respondent_name text not null,
      answers_json text not null,
      created_at text not null,
      updated_at text not null,
      unique(company_id, cohort_id, module_id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(portal_client_id) references portal_client(id) on delete cascade,
      foreign key(cohort_id) references cohort(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists portal_certificate_participant_evaluation (
      id text primary key,
      company_id text not null,
      portal_client_id text not null,
      cohort_id text not null,
      module_id text not null,
      participant_id text not null,
      participant_name text not null,
      answers_json text not null,
      created_at text not null,
      updated_at text not null,
      unique(company_id, cohort_id, module_id, participant_id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(portal_client_id) references portal_client(id) on delete cascade,
      foreign key(cohort_id) references cohort(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade,
      foreign key(participant_id) references cohort_participant(id) on delete cascade
    );

    create table if not exists financial_account (
      id text primary key,
      organization_id text not null,
      company_id text,
      name text not null,
      kind text not null,
      currency text not null default 'BRL',
      account_number text,
      branch_number text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id) references organization(id) on delete cascade
    );

    create table if not exists financial_category (
      id text primary key,
      organization_id text not null,
      company_id text,
      name text not null,
      kind text not null,
      parent_category_id text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id, parent_category_id) references financial_category(company_id, id) on delete restrict
    );

    create table if not exists financial_transaction (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_entity_id text,
      financial_account_id text,
      financial_category_id text,
      financial_cost_center_id text,
      financial_payment_method_id text,
      kind text not null,
      status text not null,
      amount_cents integer not null,
      issue_date text,
      due_date text,
      settlement_date text,
      competence_date text,
      source text not null default 'manual',
      source_ref text,
      note text,
      created_by text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_entity (
      id text primary key,
      organization_id text not null,
      legal_name text not null,
      trade_name text,
      document_number text,
      kind text not null check(kind in ('customer', 'supplier', 'both')),
      email text,
      phone text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade
    );

    create table if not exists financial_entity_tag (
      id text primary key,
      organization_id text not null,
      name text not null,
      normalized_name text not null,
      is_system integer not null default 0,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, normalized_name),
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade
    );

    create table if not exists financial_entity_tag_map (
      organization_id text not null,
      financial_entity_id text not null,
      financial_entity_tag_id text not null,
      created_at text not null,
      primary key(organization_id, financial_entity_id, financial_entity_tag_id),
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete cascade,
      foreign key(organization_id, financial_entity_tag_id) references financial_entity_tag(organization_id, id) on delete cascade
    );

    create table if not exists financial_cost_center (
      id text primary key,
      organization_id text not null,
      name text not null,
      code text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade
    );

    create table if not exists financial_payment_method (
      id text primary key,
      organization_id text not null,
      name text not null,
      kind text not null check(kind in ('cash', 'pix', 'boleto', 'card', 'transfer', 'other')),
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade
    );

    create table if not exists financial_entity_default_profile (
      id text primary key,
      organization_id text not null,
      financial_entity_id text not null,
      context text not null check(context in ('payable', 'receivable', 'transaction')),
      financial_category_id text,
      financial_cost_center_id text,
      financial_account_id text,
      financial_payment_method_id text,
      due_rule text,
      competence_rule text,
      recurrence_rule text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, financial_entity_id, context),
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete cascade,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_favorite_combination (
      id text primary key,
      organization_id text not null,
      name text not null,
      context text not null default 'any' check(context in ('any', 'payable', 'receivable', 'transaction')),
      financial_category_id text,
      financial_cost_center_id text,
      financial_account_id text,
      financial_payment_method_id text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_payable (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_transaction_id text,
      financial_entity_id text,
      financial_account_id text,
      financial_category_id text,
      financial_cost_center_id text,
      financial_payment_method_id text,
      supplier_name text,
      description text not null,
      amount_cents integer not null,
      paid_amount_cents integer not null default 0,
      status text not null,
      issue_date text,
      due_date text,
      paid_at text,
      source text not null default 'manual',
      source_ref text,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_receivable (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_transaction_id text,
      financial_entity_id text,
      financial_account_id text,
      financial_category_id text,
      financial_cost_center_id text,
      financial_payment_method_id text,
      customer_name text,
      description text not null,
      amount_cents integer not null,
      received_amount_cents integer not null default 0,
      status text not null,
      issue_date text,
      due_date text,
      received_at text,
      source text not null default 'manual',
      source_ref text,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_import_job (
      id text primary key,
      organization_id text not null,
      company_id text,
      import_type text not null,
      source_file_name text not null,
      source_file_hash text,
      source_file_mime_type text,
      source_file_size_bytes integer not null default 0,
      status text not null,
      total_rows integer not null default 0,
      processed_rows integer not null default 0,
      error_rows integer not null default 0,
      error_summary text,
      created_by text,
      created_at text not null,
      updated_at text not null,
      finished_at text,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_bank_statement_entry (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_account_id text not null,
      financial_import_job_id text,
      statement_date text not null,
      posted_at text,
      amount_cents integer not null,
      description text not null,
      dedupe_hash text,
      reference_code text,
      balance_cents integer,
      source text not null default 'bank_import',
      source_ref text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_import_job_id) references financial_import_job(organization_id, id) on delete restrict
    );

    create table if not exists financial_reconciliation_match (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_bank_statement_entry_id text not null,
      financial_transaction_id text not null,
      match_type text not null,
      match_status text not null,
      matched_amount_cents integer not null,
      matched_at text not null,
      matched_by text,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_bank_statement_entry_id) references financial_bank_statement_entry(organization_id, id) on delete cascade,
      foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete cascade
    );

    create table if not exists financial_reconciliation_memory (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_account_id text not null,
      normalized_pattern text not null,
      direction text not null check(direction in ('inflow', 'outflow')),
      financial_entity_id text,
      financial_category_id text,
      financial_cost_center_id text,
      financial_payment_method_id text,
      usage_count integer not null default 1,
      confidence_score real not null default 0.7,
      last_approved_at text not null,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, financial_account_id, normalized_pattern, direction),
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete cascade,
      foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
    );

    create table if not exists financial_reconciliation_batch (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_import_job_id text not null,
      financial_account_id text not null,
      source_file_name text not null,
      source_file_hash text not null,
      approved_by text,
      approved_at text not null,
      total_rows integer not null,
      approved_rows integer not null,
      skipped_rows integer not null,
      inflow_cents integer not null,
      outflow_cents integer not null,
      decision_summary_json text not null,
      created_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_import_job_id) references financial_import_job(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict
    );

    create table if not exists financial_debt (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_payable_id text,
      financial_receivable_id text,
      financial_transaction_id text,
      debt_type text not null,
      status text not null,
      principal_amount_cents integer not null,
      outstanding_amount_cents integer not null,
      due_date text,
      settled_at text,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_payable_id) references financial_payable(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_receivable_id) references financial_receivable(organization_id, id) on delete restrict,
      foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict
    );

    create table if not exists financial_operation_audit (
      id text primary key,
      organization_id text not null,
      company_id text,
      resource_type text not null check(resource_type in ('payable', 'receivable')),
      resource_id text not null,
      action text not null,
      amount_cents integer,
      note text,
      created_by text,
      created_at text not null,
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete set null
    );

    create table if not exists financial_ai_interaction (
      id text primary key,
      organization_id text not null,
      company_id text,
      created_by text,
      surface_path text,
      transcript text not null,
      status text not null check(status in ('draft', 'executed', 'canceled', 'failed')),
      risk_level text not null check(risk_level in ('low', 'medium', 'high')),
      plan_json text not null default '{}',
      result_json text not null default '{}',
      error_message text,
      confirmed_at text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_recurring_rule (
      id text primary key,
      organization_id text not null,
      company_id text,
      resource_type text not null check(resource_type in ('payable', 'receivable')),
      template_resource_id text not null,
      name text not null,
      frequency text not null default 'monthly' check(frequency in ('monthly')),
      day_of_month integer not null check(day_of_month between 1 and 31),
      start_date text not null,
      end_date text,
      materialization_months integer not null default 3,
      status text not null default 'active' check(status in ('active', 'paused', 'ended')),
      last_materialized_until text,
      created_by text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_automation_rule (
      id text primary key,
      organization_id text not null,
      company_id text,
      name text not null,
      trigger_type text not null,
      conditions_json text not null default '{}',
      action_type text not null,
      action_payload_json text not null default '{}',
      is_active integer not null default 1,
      created_by text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_attachment (
      id text primary key,
      organization_id text not null,
      company_id text,
      resource_type text not null check(resource_type in ('payable', 'receivable', 'transaction', 'reconciliation')),
      resource_id text not null,
      file_name text not null,
      mime_type text not null,
      file_size_bytes integer not null default 0,
      storage_ref text not null,
      created_by text,
      created_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_bank_integration (
      id text primary key,
      organization_id text not null,
      company_id text,
      provider text not null,
      status text not null,
      account_name text,
      last_sync_at text,
      created_by text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_simulation_scenario (
      id text primary key,
      organization_id text not null,
      company_id text,
      name text not null,
      description text,
      start_date text not null,
      end_date text not null,
      starting_balance_cents integer not null default 0,
      created_by text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists financial_simulation_item (
      id text primary key,
      organization_id text not null,
      company_id text,
      financial_simulation_scenario_id text not null,
      source_type text not null check(source_type in ('manual', 'payable', 'receivable', 'transaction')),
      source_id text,
      kind text not null check(kind in ('manual_inflow', 'manual_outflow', 'expected_inflow', 'scheduled_outflow', 'partial_payment')),
      label text not null,
      amount_cents integer not null,
      event_date text not null,
      probability_percent integer not null default 100,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(organization_id, financial_simulation_scenario_id) references financial_simulation_scenario(organization_id, id) on delete cascade
    );

    create table if not exists billing_plan (
      id text primary key,
      organization_id text not null,
      company_id text not null,
      code text not null,
      name text not null,
      billing_cycle text not null,
      price_cents integer not null default 0,
      currency text not null default 'BRL',
      is_active integer not null default 1,
      features_json text not null default '[]',
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, code),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists billing_subscription (
      id text primary key,
      organization_id text not null,
      company_id text not null,
      billing_plan_id text not null,
      status text not null,
      started_at text not null,
      current_period_start text,
      current_period_end text,
      trial_ends_at text,
      canceled_at text,
      auto_renew integer not null default 1,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(company_id, billing_plan_id) references billing_plan(company_id, id) on delete restrict
    );

    create table if not exists billing_invoice (
      id text primary key,
      organization_id text not null,
      company_id text not null,
      billing_subscription_id text,
      invoice_number text not null,
      status text not null,
      issue_date text not null,
      due_date text,
      paid_at text,
      amount_cents integer not null,
      currency text not null default 'BRL',
      pdf_url text,
      note text,
      created_at text not null,
      updated_at text not null,
      unique(organization_id, id),
      unique(company_id, invoice_number),
      unique(company_id, id),
      foreign key(organization_id) references organization(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(company_id, billing_subscription_id) references billing_subscription(company_id, id) on delete restrict
    );

    create table if not exists app_setting (
      key text primary key,
      value text not null,
      updated_at text not null
    );

    create table if not exists organization (
      id text primary key,
      name text not null unique,
      slug text not null unique,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists internal_user (
      id text primary key,
      username text not null unique,
      display_name text,
      password_hash text not null,
      role text not null default 'supremo',
      permissions_json text not null default '[]',
      organization_id text references organization(id) on delete set null,
      is_active integer not null default 1,
      last_login_at text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists internal_session (
      id text primary key,
      internal_user_id text not null,
      token_hash text not null unique,
      expires_at text not null,
      created_at text not null,
      last_seen_at text not null,
      foreign key(internal_user_id) references internal_user(id) on delete cascade
    );

    create table if not exists internal_audit_log (
      id text primary key,
      internal_user_id text,
      username text not null,
      action text not null,
      resource_type text not null,
      resource_id text,
      payload_json text not null default '{}',
      created_at text not null,
      foreign key(internal_user_id) references internal_user(id) on delete set null
    );

    create table if not exists technician (
      id text primary key,
      name text not null,
      availability_notes text,
      hourly_cost real,
      calendar_color text
    );

    create table if not exists technician_skill (
      technician_id text not null,
      module_id text not null,
      primary key (technician_id, module_id),
      foreign key(technician_id) references technician(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists cohort (
      id text primary key,
      code text not null unique,
      name text not null,
      start_date text not null,
      technician_id text,
      status text not null default 'Planejada',
      capacity_companies integer not null,
      period text not null default 'Integral',
      start_time text,
      end_time text,
      delivery_mode text not null default 'Online',
      notes text,
      foreign key(technician_id) references technician(id) on delete set null
    );

    create table if not exists cohort_module_block (
      id text primary key,
      cohort_id text not null,
      module_id text not null,
      order_in_cohort integer not null,
      start_day_offset integer not null,
      duration_days integer not null,
      unique(cohort_id, order_in_cohort),
      foreign key(cohort_id) references cohort(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete restrict
    );

    create table if not exists cohort_schedule_day (
      id text primary key,
      cohort_id text not null,
      day_index integer not null,
      day_date text not null,
      start_time text,
      end_time text,
      unique(cohort_id, day_index),
      foreign key(cohort_id) references cohort(id) on delete cascade
    );

    create table if not exists cohort_allocation (
      id text primary key,
      cohort_id text not null,
      company_id text not null,
      module_id text not null,
      entry_day integer not null,
      status text not null default 'Previsto',
      notes text,
      override_installation_prereq integer not null default 0,
      override_reason text,
      executed_at text,
      unique(cohort_id, company_id, module_id),
      foreign key(cohort_id) references cohort(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete restrict
    );

    create table if not exists cohort_participant (
      id text primary key,
      cohort_id text not null,
      company_id text not null,
      participant_name text not null,
      created_at text not null,
      unique(cohort_id, company_id, participant_name),
      foreign key(cohort_id) references cohort(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists cohort_participant_module (
      participant_id text not null,
      module_id text not null,
      primary key (participant_id, module_id),
      foreign key(participant_id) references cohort_participant(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists optional_module (
      id text primary key,
      code text not null unique,
      category text,
      name text not null,
      duration_days integer not null,
      profile text,
      notes text
    );

    create table if not exists company_optional_progress (
      id text primary key,
      company_id text not null,
      optional_module_id text not null,
      status text not null default 'Planejado',
      notes text,
      unique(company_id, optional_module_id),
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(optional_module_id) references optional_module(id) on delete cascade
    );

    create table if not exists module_prerequisite (
      module_id text not null,
      prerequisite_module_id text not null,
      primary key (module_id, prerequisite_module_id),
      foreign key(module_id) references module_template(id) on delete cascade,
      foreign key(prerequisite_module_id) references module_template(id) on delete cascade
    );

    create table if not exists company_license (
      id text primary key,
      company_id text not null,
      name text not null,
      program_id text,
      user_name text,
      module_list text,
      license_identifier text,
      renewal_cycle text not null default 'Mensal',
      expires_at text not null,
      notes text,
      last_renewed_at text,
      created_at text not null,
      updated_at text not null,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists company_license_module (
      license_id text not null,
      module_id text not null,
      primary key (license_id, module_id),
      foreign key(license_id) references company_license(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade
    );

    create table if not exists license_program (
      id text primary key,
      name text not null unique,
      topsolid_kind text,
      topsolid_code text,
      notes text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists recruitment_candidate (
      id text primary key,
      name text not null,
      process_status text not null default 'Em_processo',
      stage text not null default 'Triagem',
      strengths text,
      concerns text,
      specialties text,
      equipment_notes text,
      career_plan text,
      notes text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists calendar_activity (
      id text primary key,
      title text not null,
      activity_type text not null default 'Outro',
      start_date text not null,
      end_date text not null,
      selected_dates text,
      linked_module_id text,
      hours_scope text not null default 'none',
      all_day integer not null default 1,
      start_time text,
      end_time text,
      technician_id text,
      company_id text,
      status text not null default 'Planejada',
      notes text,
      created_at text not null,
      updated_at text not null,
      foreign key(technician_id) references technician(id) on delete set null,
      foreign key(company_id) references company(id) on delete set null
    );

    create table if not exists calendar_activity_technician (
      activity_id text not null,
      technician_id text not null,
      primary key (activity_id, technician_id),
      foreign key(activity_id) references calendar_activity(id) on delete cascade,
      foreign key(technician_id) references technician(id) on delete cascade
    );

    create table if not exists calendar_activity_day (
      activity_id text not null,
      day_date text not null,
      all_day integer not null default 1,
      start_time text,
      end_time text,
      primary key (activity_id, day_date),
      foreign key(activity_id) references calendar_activity(id) on delete cascade
    );

    create table if not exists planning_workspace (
      id text primary key,
      name text not null,
      status text not null default 'Rascunho',
      mode text not null default 'Manual',
      horizon_days integer not null default 60,
      notes text,
      created_at text not null,
      updated_at text not null,
      published_at text
    );

    create table if not exists planning_workspace_client (
      workspace_id text not null,
      company_id text not null,
      priority integer not null default 0,
      created_at text not null,
      primary key (workspace_id, company_id),
      foreign key(workspace_id) references planning_workspace(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade
    );

    create table if not exists planning_cohort (
      id text primary key,
      workspace_id text not null,
      company_id text not null,
      module_id text not null,
      technician_id text,
      published_cohort_id text,
      name text not null,
      status text not null default 'Rascunho',
      delivery_mode text not null default 'Online',
      period text not null default 'Meio_periodo',
      notes text,
      created_at text not null,
      updated_at text not null,
      foreign key(workspace_id) references planning_workspace(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade,
      foreign key(technician_id) references technician(id) on delete set null,
      foreign key(published_cohort_id) references cohort(id) on delete set null
    );

    create table if not exists planning_encounter (
      id text primary key,
      workspace_id text not null,
      planning_cohort_id text not null,
      company_id text not null,
      module_id text not null,
      technician_id text,
      encounter_index integer not null,
      day_date text not null,
      start_time text not null,
      end_time text not null,
      status text not null default 'Rascunho',
      notes text,
      published_cohort_id text,
      created_at text not null,
      updated_at text not null,
      unique(planning_cohort_id, encounter_index),
      foreign key(workspace_id) references planning_workspace(id) on delete cascade,
      foreign key(planning_cohort_id) references planning_cohort(id) on delete cascade,
      foreign key(company_id) references company(id) on delete cascade,
      foreign key(module_id) references module_template(id) on delete cascade,
      foreign key(technician_id) references technician(id) on delete set null,
      foreign key(published_cohort_id) references cohort(id) on delete set null
    );

    create table if not exists planning_version (
      id text primary key,
      workspace_id text not null,
      version_number integer not null,
      action text not null,
      summary_json text not null default '{}',
      created_at text not null,
      unique(workspace_id, version_number),
      foreign key(workspace_id) references planning_workspace(id) on delete cascade
    );

    create table if not exists internal_document (
      id text primary key,
      title text not null,
      category text,
      notes text,
      file_name text not null,
      mime_type text not null,
      file_data_base64 text not null,
      file_size_bytes integer not null default 0,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists implementation_kanban_card (
      id text primary key,
      title text not null,
      description text,
      status text not null default 'Todo',
      column_id text,
      client_name text,
      license_name text,
      module_name text,
      technician_id text,
      subcategory text,
      support_resolution text,
      support_third_party_notes text,
      support_handoff_target text,
      support_handoff_date text,
      priority text not null default 'Normal',
      due_date text,
      attachment_image_data_url text,
      attachment_file_name text,
      attachment_file_data_base64 text,
      position integer not null default 0,
      created_at text not null,
      updated_at text not null,
      foreign key(column_id) references implementation_kanban_column(id) on delete set null
    );

    create table if not exists implementation_kanban_column (
      id text primary key,
      title text not null,
      color text,
      position integer not null default 0,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists hours_event_store (
      id text primary key,
      aggregate_type text not null,
      aggregate_id text not null,
      company_id text not null,
      event_type text not null,
      payload_json text not null,
      idempotency_key text not null,
      actor_type text not null,
      actor_id text,
      correlation_id text,
      occurred_at text not null,
      created_at text not null
    );

    create table if not exists hours_projection_balance (
      company_id text primary key,
      available_hours real not null default 0,
      consumed_hours real not null default 0,
      balance_hours real not null default 0,
      remaining_diarias real not null default 0,
      updated_at text not null
    );

    create table if not exists hours_projection_ledger (
      id text primary key,
      company_id text not null,
      event_id text not null,
      event_type text not null,
      delta_hours real not null default 0,
      balance_after real not null default 0,
      payload_json text not null,
      created_at text not null
    );

    create table if not exists hours_projection_pending (
      id text primary key,
      company_id text not null,
      event_id text not null,
      event_type text not null,
      delta_hours real not null default 0,
      reason text,
      status text not null default 'Pendente',
      payload_json text not null,
      created_at text not null,
      updated_at text not null
    );
  `);

  ensureColumn('company', 'priority', 'priority integer not null default 0');
  ensureColumn('company', 'priority_level', "priority_level text not null default 'Normal'");
  ensureColumn('company', 'contact_name', 'contact_name text');
  ensureColumn('company', 'contact_phone', 'contact_phone text');
  ensureColumn('company', 'contact_email', 'contact_email text');
  ensureColumn('company', 'modality', "modality text not null default 'Turma_Online'");
  ensureColumn('company', 'is_third_party', 'is_third_party integer not null default 0');
  ensureColumn('company_module_progress', 'custom_duration_days', 'custom_duration_days integer');
  ensureColumn('company_module_progress', 'custom_units', 'custom_units integer');
  ensureColumn('cohort', 'period', "period text not null default 'Integral'");
  ensureColumn('cohort', 'start_time', 'start_time text');
  ensureColumn('cohort', 'end_time', 'end_time text');
  ensureColumn('cohort', 'delivery_mode', "delivery_mode text not null default 'Online'");
  ensureColumn(
    'cohort',
    'planning_workspace_id',
    'planning_workspace_id text references planning_workspace(id) on delete set null'
  );
  ensureColumn(
    'cohort',
    'planning_cohort_id',
    'planning_cohort_id text references planning_cohort(id) on delete set null'
  );
  ensureColumn(
    'cohort_allocation',
    'override_installation_prereq',
    'override_installation_prereq integer not null default 0'
  );
  ensureColumn('cohort_allocation', 'override_reason', 'override_reason text');
  ensureColumn('cohort_allocation', 'executed_at', 'executed_at text');
  ensureColumn('company_license', 'program_id', 'program_id text');
  ensureColumn('company_license', 'user_name', 'user_name text');
  ensureColumn('company_license', 'module_list', 'module_list text');
  ensureColumn('company_license', 'license_identifier', 'license_identifier text');
  ensureColumn('license_program', 'topsolid_kind', 'topsolid_kind text');
  ensureColumn('license_program', 'topsolid_code', 'topsolid_code text');
  ensureColumn('calendar_activity', 'selected_dates', 'selected_dates text');
  ensureColumn('module_template', 'delivery_mode', "delivery_mode text not null default 'ministrado'");
  ensureColumn('module_template', 'client_hours_policy', "client_hours_policy text not null default 'consome'");
  ensureColumn('calendar_activity', 'linked_module_id', 'linked_module_id text');
  ensureColumn('calendar_activity', 'hours_scope', "hours_scope text not null default 'none'");
  ensureColumn('calendar_activity', 'hours_consumed_snapshot', 'hours_consumed_snapshot real not null default 0');
  ensureColumn('technician', 'hourly_cost', 'hourly_cost real');
  ensureColumn('implementation_kanban_card', 'column_id', 'column_id text');
  ensureColumn('implementation_kanban_card', 'client_name', 'client_name text');
  ensureColumn('implementation_kanban_card', 'license_name', 'license_name text');
  ensureColumn('implementation_kanban_card', 'module_name', 'module_name text');
  ensureColumn('implementation_kanban_card', 'technician_id', 'technician_id text');
  ensureColumn('implementation_kanban_card', 'subcategory', 'subcategory text');
  ensureColumn('implementation_kanban_card', 'support_resolution', 'support_resolution text');
  ensureColumn('implementation_kanban_card', 'support_third_party_notes', 'support_third_party_notes text');
  ensureColumn('implementation_kanban_card', 'support_handoff_target', 'support_handoff_target text');
  ensureColumn('implementation_kanban_card', 'support_handoff_date', 'support_handoff_date text');
  ensureColumn('implementation_kanban_card', 'priority', "priority text not null default 'Normal'");
  ensureColumn('implementation_kanban_card', 'due_date', 'due_date text');
  ensureColumn('implementation_kanban_card', 'attachment_image_data_url', 'attachment_image_data_url text');
  ensureColumn('implementation_kanban_card', 'attachment_file_name', 'attachment_file_name text');
  ensureColumn('implementation_kanban_card', 'attachment_file_data_base64', 'attachment_file_data_base64 text');
  ensureColumn('portal_session', 'is_internal', 'is_internal integer not null default 0');
  ensureColumn('portal_ticket', 'whatsapp_number', 'whatsapp_number text');
  ensureColumn('portal_ticket', 'last_read_cliente_at', 'last_read_cliente_at text');
  ensureColumn('portal_ticket', 'last_read_holand_at', 'last_read_holand_at text');
  ensureColumn('portal_ticket', 'kanban_card_id', 'kanban_card_id text');
  ensureColumn('portal_client', 'support_intro_text', 'support_intro_text text');
  ensureColumn('portal_client', 'hidden_module_ids_json', "hidden_module_ids_json text not null default '[]'");
  ensureColumn('portal_client', 'module_date_overrides_json', "module_date_overrides_json text not null default '{}'");
  ensureColumn('portal_client', 'module_status_overrides_json', "module_status_overrides_json text not null default '{}'");
  ensureColumn('portal_client', 'module_delivery_mode_overrides_json', "module_delivery_mode_overrides_json text not null default '{}'");
  ensureColumn('organization', 'account_workspace_id', 'account_workspace_id text');
  for (const table of ORQUESTRADOR_TENANT_TABLES) {
    if (!hasTable(table)) {
      continue;
    }
    ensureColumn(table, 'organization_id', 'organization_id text');
    db.prepare(`update ${table} set organization_id = ? where organization_id is null`).run(DEFAULT_ORGANIZATION_ID);
  }
  ensureColumn('financial_transaction', 'is_deleted', 'is_deleted integer not null default 0');
  ensureColumn(
    'financial_account',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'financial_category',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'financial_transaction',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'financial_transaction',
    'financial_entity_id',
    'financial_entity_id text'
  );
  ensureColumn('financial_transaction', 'financial_cost_center_id', 'financial_cost_center_id text');
  ensureColumn('financial_transaction', 'financial_payment_method_id', 'financial_payment_method_id text');
  ensureColumn(
    'financial_payable',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn('financial_payable', 'financial_cost_center_id', 'financial_cost_center_id text');
  ensureColumn('financial_payable', 'financial_payment_method_id', 'financial_payment_method_id text');
  ensureColumn('financial_payable', 'paid_amount_cents', 'paid_amount_cents integer not null default 0');
  ensureColumn(
    'financial_receivable',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn('financial_receivable', 'financial_cost_center_id', 'financial_cost_center_id text');
  ensureColumn('financial_receivable', 'financial_payment_method_id', 'financial_payment_method_id text');
  ensureColumn('financial_receivable', 'received_amount_cents', 'received_amount_cents integer not null default 0');
  ensureColumn(
    'financial_import_job',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn('financial_import_job', 'source_file_hash', 'source_file_hash text');
  ensureColumn(
    'financial_bank_statement_entry',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn('financial_bank_statement_entry', 'dedupe_hash', 'dedupe_hash text');
  ensureColumn(
    'financial_reconciliation_match',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'financial_debt',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'billing_plan',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'billing_subscription',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn(
    'billing_invoice',
    'organization_id',
    'organization_id text references organization(id) on delete cascade'
  );
  ensureColumn('internal_user', 'display_name', 'display_name text');
  ensureColumn('internal_user', 'role', "role text not null default 'supremo'");
  ensureColumn('internal_user', 'permissions_json', "permissions_json text not null default '[]'");
  ensureColumn(
    'internal_user',
    'organization_id',
    'organization_id text references organization(id) on delete set null'
  );
  ensureColumn('internal_user', 'is_active', 'is_active integer not null default 1');
  ensureColumn('internal_user', 'last_login_at', 'last_login_at text');
  ensureColumn('internal_user', 'preferences_json', "preferences_json text not null default '{}'");
  ensureColumn('technician', 'calendar_color', 'calendar_color text');

  const companyNeedsTenantRebuild = !hasCompositeUniqueIndex('company', ['organization_id', 'name'])
    || readTableColumns('company').find((column) => column.name === 'organization_id')?.notnull !== 1;
  const technicianNeedsTenantRebuild = !hasCompositeUniqueIndex('technician', ['organization_id', 'name'])
    || readTableColumns('technician').find((column) => column.name === 'organization_id')?.notnull !== 1;
  const cohortNeedsTenantRebuild = !hasCompositeUniqueIndex('cohort', ['organization_id', 'code'])
    || readTableColumns('cohort').find((column) => column.name === 'organization_id')?.notnull !== 1;
  const licenseProgramNeedsTenantRebuild = !hasCompositeUniqueIndex('license_program', ['organization_id', 'name'])
    || readTableColumns('license_program').find((column) => column.name === 'organization_id')?.notnull !== 1;

  if (companyNeedsTenantRebuild || technicianNeedsTenantRebuild || cohortNeedsTenantRebuild || licenseProgramNeedsTenantRebuild) {
    db.exec('pragma foreign_keys = off');
    try {
      if (companyNeedsTenantRebuild) {
        db.exec(`
          create table company_new (
            id text primary key,
            organization_id text not null default 'org-holand',
            name text not null,
            status text not null default 'Em_treinamento',
            notes text,
            priority integer not null default 0,
            priority_level text not null default 'Normal',
            contact_name text,
            contact_phone text,
            contact_email text,
            modality text not null default 'Turma_Online',
            is_third_party integer not null default 0,
            unique(organization_id, name),
            unique(organization_id, id),
            foreign key(organization_id) references organization(id) on delete cascade
          );
        `);
        db.exec(`
          insert into company_new (
            id, organization_id, name, status, notes, priority, priority_level,
            contact_name, contact_phone, contact_email, modality, is_third_party
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            name,
            coalesce(status, 'Em_treinamento'),
            notes,
            coalesce(priority, 0),
            coalesce(priority_level, 'Normal'),
            contact_name,
            contact_phone,
            contact_email,
            coalesce(modality, 'Turma_Online'),
            coalesce(is_third_party, 0)
          from company;
        `);
        db.exec('drop table company;');
        db.exec('alter table company_new rename to company;');
      }

      if (technicianNeedsTenantRebuild) {
        db.exec(`
          create table technician_new (
            id text primary key,
            organization_id text not null default 'org-holand',
            name text not null,
            availability_notes text,
            hourly_cost real,
            calendar_color text,
            unique(organization_id, name),
            unique(organization_id, id),
            foreign key(organization_id) references organization(id) on delete cascade
          );
        `);
        db.exec(`
          insert into technician_new (
            id, organization_id, name, availability_notes, hourly_cost, calendar_color
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            name,
            availability_notes,
            hourly_cost,
            calendar_color
          from technician;
        `);
        db.exec('drop table technician;');
        db.exec('alter table technician_new rename to technician;');
      }

      if (cohortNeedsTenantRebuild) {
        db.exec(`
          create table cohort_new (
            id text primary key,
            organization_id text not null default 'org-holand',
            code text not null,
            name text not null,
            start_date text not null,
            technician_id text,
            status text not null default 'Planejada',
            capacity_companies integer not null,
            period text not null default 'Integral',
            start_time text,
            end_time text,
            delivery_mode text not null default 'Online',
            notes text,
            planning_workspace_id text,
            planning_cohort_id text,
            unique(organization_id, code),
            unique(organization_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(technician_id) references technician(id) on delete set null,
            foreign key(planning_workspace_id) references planning_workspace(id) on delete set null,
            foreign key(planning_cohort_id) references planning_cohort(id) on delete set null
          );
        `);
        db.exec(`
          insert into cohort_new (
            id, organization_id, code, name, start_date, technician_id, status,
            capacity_companies, period, start_time, end_time, delivery_mode, notes,
            planning_workspace_id, planning_cohort_id
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            code,
            name,
            start_date,
            technician_id,
            coalesce(status, 'Planejada'),
            capacity_companies,
            coalesce(period, 'Integral'),
            start_time,
            end_time,
            coalesce(delivery_mode, 'Online'),
            notes,
            planning_workspace_id,
            planning_cohort_id
          from cohort;
        `);
        db.exec('drop table cohort;');
        db.exec('alter table cohort_new rename to cohort;');
      }

      if (licenseProgramNeedsTenantRebuild) {
        db.exec(`
          create table license_program_new (
            id text primary key,
            organization_id text not null default 'org-holand',
            name text not null,
            topsolid_kind text,
            topsolid_code text,
            notes text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, name),
            unique(organization_id, id),
            foreign key(organization_id) references organization(id) on delete cascade
          );
        `);
        db.exec(`
          insert into license_program_new (
            id, organization_id, name, topsolid_kind, topsolid_code, notes, created_at, updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            name,
            topsolid_kind,
            topsolid_code,
            notes,
            created_at,
            updated_at
          from license_program;
        `);
        db.exec('drop table license_program;');
        db.exec('alter table license_program_new rename to license_program;');
      }
    } finally {
      db.exec('pragma foreign_keys = on');
    }
  }

  const financialAccountColumns = readTableColumns('financial_account');
  const financialCategoryColumns = readTableColumns('financial_category');
  const financialAccountNeedsRebuild = !hasCompositeUniqueIndex('financial_account', ['organization_id', 'id'])
    || financialAccountColumns.find((column) => column.name === 'company_id')?.notnull === 1;
  const financialCategoryNeedsRebuild = !hasCompositeUniqueIndex('financial_category', ['organization_id', 'id'])
    || financialCategoryColumns.find((column) => column.name === 'company_id')?.notnull === 1;

  if (financialAccountNeedsRebuild || financialCategoryNeedsRebuild) {
    db.exec('pragma foreign_keys = off');
    try {
      if (financialAccountNeedsRebuild) {
        db.exec(`
          create table financial_account_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            name text not null,
            kind text not null,
            currency text not null default 'BRL',
            account_number text,
            branch_number text,
            is_active integer not null default 1,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id) references organization(id) on delete cascade
          );
        `);
        db.exec(`
          insert into financial_account_new (
            id,
            organization_id,
            company_id,
            name,
            kind,
            currency,
            account_number,
            branch_number,
            is_active,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            name,
            kind,
            coalesce(currency, 'BRL'),
            account_number,
            branch_number,
            coalesce(is_active, 1),
            created_at,
            updated_at
          from financial_account;
        `);
        db.exec('drop table financial_account;');
        db.exec('alter table financial_account_new rename to financial_account;');
      }

      if (financialCategoryNeedsRebuild) {
        db.exec(`
          create table financial_category_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            name text not null,
            kind text not null,
            parent_category_id text,
            is_active integer not null default 1,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id, parent_category_id) references financial_category_new(company_id, id) on delete restrict
          );
        `);
        db.exec(`
          insert into financial_category_new (
            id,
            organization_id,
            company_id,
            name,
            kind,
            parent_category_id,
            is_active,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            name,
            kind,
            parent_category_id,
            coalesce(is_active, 1),
            created_at,
            updated_at
          from financial_category;
        `);
        db.exec('drop table financial_category;');
        db.exec('alter table financial_category_new rename to financial_category;');
      }
    } finally {
      db.exec('pragma foreign_keys = on');
    }
  }

  const transactionColumns = db.prepare('pragma table_info(financial_transaction)').all() as Array<{
    name: string;
    notnull: number;
  }>;
  const transactionForeignKeys = db.prepare('pragma foreign_key_list(financial_transaction)').all() as Array<{
    table: string;
    from: string;
    to: string;
  }>;
  const transactionCompanyIdColumn = transactionColumns.find((column) => column.name === 'company_id');
  const transactionOrganizationIdColumn = transactionColumns.find((column) => column.name === 'organization_id');
  const hasFinancialEntityForeignKey = transactionForeignKeys.some(
    (row) => row.table === 'financial_entity' && row.from === 'organization_id' && row.to === 'organization_id'
  );
  const hasFinancialAccountForeignKey = transactionForeignKeys.some(
    (row) => row.table === 'financial_account' && row.from === 'organization_id' && row.to === 'organization_id'
  );
  const hasFinancialCategoryForeignKey = transactionForeignKeys.some(
    (row) => row.table === 'financial_category' && row.from === 'organization_id' && row.to === 'organization_id'
  );
  const financialTransactionNeedsRebuild = Boolean(
    transactionColumns.length > 0 && (
      !transactionOrganizationIdColumn ||
      transactionCompanyIdColumn?.notnull === 1 ||
      !hasFinancialEntityForeignKey ||
      !hasFinancialAccountForeignKey ||
      !hasFinancialCategoryForeignKey
    )
  );

  if (financialTransactionNeedsRebuild) {
    db.exec('pragma foreign_keys = off');
    try {
      db.exec(`
        create table financial_transaction_new (
          id text primary key,
          organization_id text not null,
          company_id text,
          financial_entity_id text,
          financial_account_id text,
          financial_category_id text,
          financial_cost_center_id text,
          financial_payment_method_id text,
          kind text not null,
          status text not null,
          amount_cents integer not null,
          issue_date text,
          due_date text,
          settlement_date text,
          competence_date text,
          source text not null default 'manual',
          source_ref text,
          note text,
          created_by text,
          created_at text not null,
          updated_at text not null,
          is_deleted integer not null default 0,
          unique(organization_id, id),
          unique(company_id, id),
          foreign key(organization_id) references organization(id) on delete cascade,
          foreign key(company_id) references company(id) on delete cascade,
          foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
          foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
          foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
          foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
          foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
        );
      `);
      db.exec(`
        insert into financial_transaction_new (
          id,
          organization_id,
          company_id,
          financial_entity_id,
          financial_account_id,
          financial_category_id,
          financial_cost_center_id,
          financial_payment_method_id,
          kind,
          status,
          amount_cents,
          issue_date,
          due_date,
          settlement_date,
          competence_date,
          source,
          source_ref,
          note,
          created_by,
          created_at,
          updated_at,
          is_deleted
        )
        select
          id,
          organization_id,
          company_id,
          financial_entity_id,
          financial_account_id,
          financial_category_id,
          financial_cost_center_id,
          financial_payment_method_id,
          kind,
          status,
          amount_cents,
          issue_date,
          due_date,
          settlement_date,
          competence_date,
          coalesce(source, 'manual'),
          source_ref,
          note,
          created_by,
          created_at,
          updated_at,
          coalesce(is_deleted, 0)
        from financial_transaction;
      `);
      db.exec('drop table financial_transaction;');
      db.exec('alter table financial_transaction_new rename to financial_transaction;');
    } finally {
      db.exec('pragma foreign_keys = on');
    }
  }

  const payableColumns = readTableColumns('financial_payable');
  const receivableColumns = readTableColumns('financial_receivable');
  const importJobColumns = readTableColumns('financial_import_job');
  const statementEntryColumns = readTableColumns('financial_bank_statement_entry');
  const reconciliationColumns = readTableColumns('financial_reconciliation_match');
  const debtColumns = readTableColumns('financial_debt');

  const financialPayableNeedsRebuild = payableColumns.length > 0 && (
    payableColumns.find((column) => column.name === 'company_id')?.notnull === 1
    || !hasColumn('financial_payable', 'financial_entity_id')
    || !hasForeignKey('financial_payable', 'financial_transaction', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_payable', 'financial_entity', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_payable', 'financial_account', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_payable', 'financial_category', 'organization_id', 'organization_id')
  );

  const financialReceivableNeedsRebuild = receivableColumns.length > 0 && (
    receivableColumns.find((column) => column.name === 'company_id')?.notnull === 1
    || !hasColumn('financial_receivable', 'financial_entity_id')
    || !hasForeignKey('financial_receivable', 'financial_transaction', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_receivable', 'financial_entity', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_receivable', 'financial_account', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_receivable', 'financial_category', 'organization_id', 'organization_id')
  );

  const financialImportJobNeedsRebuild = importJobColumns.length > 0
    && importJobColumns.find((column) => column.name === 'company_id')?.notnull === 1;

  const financialStatementEntryNeedsRebuild = statementEntryColumns.length > 0 && (
    statementEntryColumns.find((column) => column.name === 'company_id')?.notnull === 1
    || !hasForeignKey('financial_bank_statement_entry', 'financial_account', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_bank_statement_entry', 'financial_import_job', 'organization_id', 'organization_id')
  );

  const financialReconciliationNeedsRebuild = reconciliationColumns.length > 0 && (
    reconciliationColumns.find((column) => column.name === 'company_id')?.notnull === 1
    || !hasForeignKey('financial_reconciliation_match', 'organization', 'organization_id', 'id')
    || !hasForeignKey('financial_reconciliation_match', 'financial_bank_statement_entry', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_reconciliation_match', 'financial_transaction', 'organization_id', 'organization_id')
  );

  const financialDebtNeedsRebuild = debtColumns.length > 0 && (
    debtColumns.find((column) => column.name === 'company_id')?.notnull === 1
    || !hasForeignKey('financial_debt', 'organization', 'organization_id', 'id')
    || !hasForeignKey('financial_debt', 'financial_payable', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_debt', 'financial_receivable', 'organization_id', 'organization_id')
    || !hasForeignKey('financial_debt', 'financial_transaction', 'organization_id', 'organization_id')
  );

  if (
    financialPayableNeedsRebuild
    || financialReceivableNeedsRebuild
    || financialImportJobNeedsRebuild
    || financialStatementEntryNeedsRebuild
    || financialReconciliationNeedsRebuild
    || financialDebtNeedsRebuild
  ) {
    db.exec('pragma foreign_keys = off');
    try {
      if (financialPayableNeedsRebuild) {
        db.exec(`
          create table financial_payable_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            financial_transaction_id text,
            financial_entity_id text,
            financial_account_id text,
            financial_category_id text,
            financial_cost_center_id text,
            financial_payment_method_id text,
            supplier_name text,
            description text not null,
            amount_cents integer not null,
            status text not null,
            issue_date text,
            due_date text,
            paid_at text,
            source text not null default 'manual',
            source_ref text,
            note text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
          );
        `);
        db.exec(`
          insert into financial_payable_new (
            id,
            organization_id,
            company_id,
            financial_transaction_id,
            financial_entity_id,
            financial_account_id,
            financial_category_id,
            financial_cost_center_id,
            financial_payment_method_id,
            supplier_name,
            description,
            amount_cents,
            status,
            issue_date,
            due_date,
            paid_at,
            source,
            source_ref,
            note,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            financial_transaction_id,
            null,
            financial_account_id,
            financial_category_id,
            financial_cost_center_id,
            financial_payment_method_id,
            supplier_name,
            description,
            amount_cents,
            status,
            issue_date,
            due_date,
            paid_at,
            coalesce(source, 'manual'),
            source_ref,
            note,
            created_at,
            updated_at
          from financial_payable;
        `);
        db.exec('drop table financial_payable;');
        db.exec('alter table financial_payable_new rename to financial_payable;');
      }

      if (financialReceivableNeedsRebuild) {
        db.exec(`
          create table financial_receivable_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            financial_transaction_id text,
            financial_entity_id text,
            financial_account_id text,
            financial_category_id text,
            financial_cost_center_id text,
            financial_payment_method_id text,
            customer_name text,
            description text not null,
            amount_cents integer not null,
            status text not null,
            issue_date text,
            due_date text,
            received_at text,
            source text not null default 'manual',
            source_ref text,
            note text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_entity_id) references financial_entity(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_category_id) references financial_category(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_cost_center_id) references financial_cost_center(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_payment_method_id) references financial_payment_method(organization_id, id) on delete restrict
          );
        `);
        db.exec(`
          insert into financial_receivable_new (
            id,
            organization_id,
            company_id,
            financial_transaction_id,
            financial_entity_id,
            financial_account_id,
            financial_category_id,
            financial_cost_center_id,
            financial_payment_method_id,
            customer_name,
            description,
            amount_cents,
            status,
            issue_date,
            due_date,
            received_at,
            source,
            source_ref,
            note,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            financial_transaction_id,
            null,
            financial_account_id,
            financial_category_id,
            financial_cost_center_id,
            financial_payment_method_id,
            customer_name,
            description,
            amount_cents,
            status,
            issue_date,
            due_date,
            received_at,
            coalesce(source, 'manual'),
            source_ref,
            note,
            created_at,
            updated_at
          from financial_receivable;
        `);
        db.exec('drop table financial_receivable;');
        db.exec('alter table financial_receivable_new rename to financial_receivable;');
      }

      if (financialImportJobNeedsRebuild) {
        db.exec(`
          create table financial_import_job_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            import_type text not null,
            source_file_name text not null,
            source_file_hash text,
            source_file_mime_type text,
            source_file_size_bytes integer not null default 0,
            status text not null,
            total_rows integer not null default 0,
            processed_rows integer not null default 0,
            error_rows integer not null default 0,
            error_summary text,
            created_by text,
            created_at text not null,
            updated_at text not null,
            finished_at text,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade
          );
        `);
        db.exec(`
          insert into financial_import_job_new (
            id,
            organization_id,
            company_id,
            import_type,
            source_file_name,
            source_file_hash,
            source_file_mime_type,
            source_file_size_bytes,
            status,
            total_rows,
            processed_rows,
            error_rows,
            error_summary,
            created_by,
            created_at,
            updated_at,
            finished_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            import_type,
            source_file_name,
            source_file_hash,
            source_file_mime_type,
            coalesce(source_file_size_bytes, 0),
            status,
            coalesce(total_rows, 0),
            coalesce(processed_rows, 0),
            coalesce(error_rows, 0),
            error_summary,
            created_by,
            created_at,
            updated_at,
            finished_at
          from financial_import_job;
        `);
        db.exec('drop table financial_import_job;');
        db.exec('alter table financial_import_job_new rename to financial_import_job;');
      }

      if (financialStatementEntryNeedsRebuild) {
        db.exec(`
          create table financial_bank_statement_entry_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            financial_account_id text not null,
            financial_import_job_id text,
            statement_date text not null,
            posted_at text,
            amount_cents integer not null,
            description text not null,
            dedupe_hash text,
            reference_code text,
            balance_cents integer,
            source text not null default 'bank_import',
            source_ref text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id, financial_account_id) references financial_account(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_import_job_id) references financial_import_job(organization_id, id) on delete restrict
          );
        `);
        db.exec(`
          insert into financial_bank_statement_entry_new (
            id,
            organization_id,
            company_id,
            financial_account_id,
            financial_import_job_id,
            statement_date,
            posted_at,
            amount_cents,
            description,
            dedupe_hash,
            reference_code,
            balance_cents,
            source,
            source_ref,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            financial_account_id,
            financial_import_job_id,
            statement_date,
            posted_at,
            amount_cents,
            description,
            dedupe_hash,
            reference_code,
            balance_cents,
            coalesce(source, 'bank_import'),
            source_ref,
            created_at,
            updated_at
          from financial_bank_statement_entry;
        `);
        db.exec('drop table financial_bank_statement_entry;');
        db.exec('alter table financial_bank_statement_entry_new rename to financial_bank_statement_entry;');
      }

      if (financialReconciliationNeedsRebuild) {
        db.exec(`
          create table financial_reconciliation_match_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            financial_bank_statement_entry_id text not null,
            financial_transaction_id text not null,
            match_type text not null,
            match_status text not null,
            matched_amount_cents integer not null,
            matched_at text not null,
            matched_by text,
            note text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id, financial_bank_statement_entry_id) references financial_bank_statement_entry(organization_id, id) on delete cascade,
            foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete cascade
          );
        `);
        db.exec(`
          insert into financial_reconciliation_match_new (
            id,
            organization_id,
            company_id,
            financial_bank_statement_entry_id,
            financial_transaction_id,
            match_type,
            match_status,
            matched_amount_cents,
            matched_at,
            matched_by,
            note,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            financial_bank_statement_entry_id,
            financial_transaction_id,
            match_type,
            match_status,
            matched_amount_cents,
            matched_at,
            matched_by,
            note,
            created_at,
            updated_at
          from financial_reconciliation_match;
        `);
        db.exec('drop table financial_reconciliation_match;');
        db.exec('alter table financial_reconciliation_match_new rename to financial_reconciliation_match;');
      }

      if (financialDebtNeedsRebuild) {
        db.exec(`
          create table financial_debt_new (
            id text primary key,
            organization_id text not null,
            company_id text,
            financial_payable_id text,
            financial_receivable_id text,
            financial_transaction_id text,
            debt_type text not null,
            status text not null,
            principal_amount_cents integer not null,
            outstanding_amount_cents integer not null,
            due_date text,
            settled_at text,
            note text,
            created_at text not null,
            updated_at text not null,
            unique(organization_id, id),
            unique(company_id, id),
            foreign key(organization_id) references organization(id) on delete cascade,
            foreign key(company_id) references company(id) on delete cascade,
            foreign key(organization_id, financial_payable_id) references financial_payable(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_receivable_id) references financial_receivable(organization_id, id) on delete restrict,
            foreign key(organization_id, financial_transaction_id) references financial_transaction(organization_id, id) on delete restrict
          );
        `);
        db.exec(`
          insert into financial_debt_new (
            id,
            organization_id,
            company_id,
            financial_payable_id,
            financial_receivable_id,
            financial_transaction_id,
            debt_type,
            status,
            principal_amount_cents,
            outstanding_amount_cents,
            due_date,
            settled_at,
            note,
            created_at,
            updated_at
          )
          select
            id,
            coalesce(organization_id, '${DEFAULT_ORGANIZATION_ID}'),
            company_id,
            financial_payable_id,
            financial_receivable_id,
            financial_transaction_id,
            debt_type,
            status,
            principal_amount_cents,
            outstanding_amount_cents,
            due_date,
            settled_at,
            note,
            created_at,
            updated_at
          from financial_debt;
        `);
        db.exec('drop table financial_debt;');
        db.exec('alter table financial_debt_new rename to financial_debt;');
      }
    } finally {
      db.exec('pragma foreign_keys = on');
    }
  }

  db.exec(`
    drop index if exists idx_portal_user_username;
    create index if not exists idx_portal_user_client_active on portal_user(portal_client_id, is_active);
    create index if not exists idx_portal_session_company_expires on portal_session(company_id, expires_at);
    create index if not exists idx_portal_session_client on portal_session(portal_client_id);
    create index if not exists idx_portal_ticket_company_created on portal_ticket(company_id, created_at desc);
    create index if not exists idx_portal_ticket_kanban on portal_ticket(kanban_card_id);
    create index if not exists idx_portal_ticket_message_ticket_created on portal_ticket_message(ticket_id, created_at asc);
    create index if not exists idx_portal_ticket_attachment_message on portal_ticket_attachment(ticket_message_id);
    create index if not exists idx_portal_ticket_webhook_queue_pending
      on portal_ticket_webhook_queue(company_id, recipient_side, sent_at, suppressed_at, available_at, created_at);
    create index if not exists idx_portal_agenda_item_client_date on portal_agenda_item(portal_client_id, start_date, end_date);
    create index if not exists idx_portal_certificate_evaluation_lookup
      on portal_certificate_evaluation(company_id, cohort_id, module_id);
    create index if not exists idx_portal_certificate_participant_evaluation_lookup
      on portal_certificate_participant_evaluation(company_id, cohort_id, module_id, participant_id);
    create unique index if not exists idx_hours_event_store_idempotency_key on hours_event_store(idempotency_key);
    create index if not exists idx_planning_workspace_status on planning_workspace(status, updated_at desc);
    create index if not exists idx_planning_workspace_client_company on planning_workspace_client(company_id);
    create index if not exists idx_planning_cohort_workspace on planning_cohort(workspace_id, status);
    create index if not exists idx_planning_cohort_company_module on planning_cohort(company_id, module_id);
    create index if not exists idx_planning_encounter_workspace_date on planning_encounter(workspace_id, day_date);
    create index if not exists idx_planning_encounter_technician_date on planning_encounter(technician_id, day_date);
    create index if not exists idx_cohort_planning_links on cohort(planning_workspace_id, planning_cohort_id);
    create index if not exists idx_company_org_status on company(organization_id, status);
    create index if not exists idx_technician_org_name on technician(organization_id, name);
    create index if not exists idx_cohort_org_start on cohort(organization_id, start_date);
    create index if not exists idx_calendar_activity_org_start on calendar_activity(organization_id, start_date);
    create index if not exists idx_planning_workspace_org_status on planning_workspace(organization_id, status, updated_at desc);
    create index if not exists idx_company_license_org_company on company_license(organization_id, company_id);
    create index if not exists idx_internal_session_user on internal_session(internal_user_id);
    create index if not exists idx_internal_session_expires on internal_session(expires_at);
    create index if not exists idx_internal_audit_created on internal_audit_log(created_at desc);
    create unique index if not exists idx_organization_account_workspace_id
      on organization(account_workspace_id)
      where account_workspace_id is not null;
    create index if not exists idx_financial_account_org_active on financial_account(organization_id, is_active);
    create index if not exists idx_financial_category_org_parent on financial_category(organization_id, parent_category_id);
    create index if not exists idx_financial_transaction_org_status_due on financial_transaction(organization_id, status, due_date);
    create index if not exists idx_financial_transaction_org_account on financial_transaction(organization_id, financial_account_id);
    create index if not exists idx_financial_transaction_org_category on financial_transaction(organization_id, financial_category_id);
    create index if not exists idx_financial_transaction_org_cost_center on financial_transaction(organization_id, financial_cost_center_id);
    create index if not exists idx_financial_payable_org_status_due on financial_payable(organization_id, status, due_date);
    create index if not exists idx_financial_payable_org_transaction on financial_payable(organization_id, financial_transaction_id);
    create index if not exists idx_financial_payable_org_cost_center on financial_payable(organization_id, financial_cost_center_id);
    create index if not exists idx_financial_receivable_org_status_due on financial_receivable(organization_id, status, due_date);
    create index if not exists idx_financial_receivable_org_transaction on financial_receivable(organization_id, financial_transaction_id);
    create index if not exists idx_financial_receivable_org_cost_center on financial_receivable(organization_id, financial_cost_center_id);
    create index if not exists idx_financial_entity_org_kind on financial_entity(organization_id, kind, is_active);
    create index if not exists idx_financial_entity_tag_org_active
      on financial_entity_tag(organization_id, is_active, normalized_name);
    create index if not exists idx_financial_entity_tag_map_entity
      on financial_entity_tag_map(organization_id, financial_entity_id);
    create index if not exists idx_financial_entity_default_profile_entity_context
      on financial_entity_default_profile(organization_id, financial_entity_id, context, is_active);
    create index if not exists idx_financial_favorite_combination_org_context
      on financial_favorite_combination(organization_id, context, is_active, name collate nocase);
    create index if not exists idx_financial_cost_center_org_active on financial_cost_center(organization_id, is_active);
    create index if not exists idx_financial_payment_method_org_kind on financial_payment_method(organization_id, kind, is_active);
    create index if not exists idx_financial_import_job_org_status on financial_import_job(organization_id, status, created_at desc);
    create index if not exists idx_financial_bank_statement_entry_org_account_date
      on financial_bank_statement_entry(organization_id, financial_account_id, statement_date);
    create index if not exists idx_financial_statement_dedupe
      on financial_bank_statement_entry(organization_id, financial_account_id, dedupe_hash);
    create index if not exists idx_financial_reconciliation_match_org_entry
      on financial_reconciliation_match(organization_id, financial_bank_statement_entry_id, financial_transaction_id);
    create index if not exists idx_financial_reconciliation_batch_job
      on financial_reconciliation_batch(organization_id, financial_import_job_id);
    create index if not exists idx_financial_debt_org_status_due on financial_debt(organization_id, status, due_date);
    create index if not exists idx_financial_debt_org_payable on financial_debt(organization_id, financial_payable_id);
    create index if not exists idx_financial_debt_org_receivable on financial_debt(organization_id, financial_receivable_id);
    create index if not exists idx_financial_operation_audit_resource
      on financial_operation_audit(organization_id, resource_type, resource_id, created_at desc);
    create index if not exists idx_financial_ai_interaction_org_status
      on financial_ai_interaction(organization_id, status, created_at);
    create index if not exists idx_financial_recurring_rule_org_status
      on financial_recurring_rule(organization_id, status, start_date);
    create index if not exists idx_financial_recurring_rule_template
      on financial_recurring_rule(organization_id, resource_type, template_resource_id);
    create index if not exists idx_financial_automation_rule_org
      on financial_automation_rule(organization_id, is_active, created_at desc);
    create index if not exists idx_financial_attachment_resource
      on financial_attachment(organization_id, resource_type, resource_id, created_at desc);
    create index if not exists idx_financial_bank_integration_org
      on financial_bank_integration(organization_id, status, created_at desc);
    create index if not exists idx_financial_simulation_scenario_org
      on financial_simulation_scenario(organization_id, created_at desc);
    create index if not exists idx_financial_simulation_item_scenario
      on financial_simulation_item(organization_id, financial_simulation_scenario_id, event_date);
    create index if not exists idx_billing_plan_org_active on billing_plan(organization_id, is_active);
    create index if not exists idx_billing_subscription_org_status on billing_subscription(organization_id, status, created_at desc);
    create index if not exists idx_billing_subscription_org_plan on billing_subscription(organization_id, billing_plan_id);
    create index if not exists idx_billing_invoice_org_status_due on billing_invoice(organization_id, status, due_date);
    create index if not exists idx_billing_invoice_org_subscription on billing_invoice(organization_id, billing_subscription_id);
    create index if not exists idx_financial_account_company_active on financial_account(company_id, is_active);
    create index if not exists idx_financial_category_company_parent on financial_category(company_id, parent_category_id);
    create index if not exists idx_financial_transaction_company_status_due on financial_transaction(company_id, status, due_date);
    create index if not exists idx_financial_transaction_company_account on financial_transaction(company_id, financial_account_id);
    create index if not exists idx_financial_transaction_company_category on financial_transaction(company_id, financial_category_id);
    create index if not exists idx_financial_payable_company_status_due on financial_payable(company_id, status, due_date);
    create index if not exists idx_financial_payable_company_transaction on financial_payable(company_id, financial_transaction_id);
    create index if not exists idx_financial_receivable_company_status_due on financial_receivable(company_id, status, due_date);
    create index if not exists idx_financial_receivable_company_transaction on financial_receivable(company_id, financial_transaction_id);
    create index if not exists idx_financial_import_job_company_status on financial_import_job(company_id, status, created_at desc);
    create index if not exists idx_financial_bank_statement_entry_account_date
      on financial_bank_statement_entry(company_id, financial_account_id, statement_date);
    create index if not exists idx_financial_reconciliation_match_entry
      on financial_reconciliation_match(company_id, financial_bank_statement_entry_id, financial_transaction_id);
    create index if not exists idx_financial_debt_company_status_due on financial_debt(company_id, status, due_date);
    create index if not exists idx_financial_debt_payable on financial_debt(company_id, financial_payable_id);
    create index if not exists idx_financial_debt_receivable on financial_debt(company_id, financial_receivable_id);
    create index if not exists idx_billing_plan_company_active on billing_plan(company_id, is_active);
    create index if not exists idx_billing_subscription_company_status on billing_subscription(company_id, status, created_at desc);
    create index if not exists idx_billing_subscription_plan on billing_subscription(company_id, billing_plan_id);
    create index if not exists idx_billing_invoice_company_status_due on billing_invoice(company_id, status, due_date);
    create index if not exists idx_billing_invoice_subscription on billing_invoice(company_id, billing_subscription_id);
  `);

  const organizationSeedNowIso = new Date().toISOString();
  db.prepare(`
    insert or ignore into organization (id, name, slug, is_active, created_at, updated_at)
    values ('org-holand', 'Holand', 'holand', 1, ?, ?)
  `).run(organizationSeedNowIso, organizationSeedNowIso);

  const insertEntityTag = db.prepare(`
    insert or ignore into financial_entity_tag (
      id, organization_id, name, normalized_name, is_system, is_active, created_at, updated_at
    ) values (?, ?, ?, ?, 1, 1, ?, ?)
  `);
  [
    ['fetag-funcionario', 'Funcionário'],
    ['fetag-banco', 'Banco'],
    ['fetag-imposto', 'Imposto'],
    ['fetag-software', 'Software'],
    ['fetag-aluguel', 'Aluguel'],
    ['fetag-prestador', 'Prestador'],
    ['fetag-cliente-recorrente', 'Cliente recorrente'],
    ['fetag-fornecedor-critico', 'Fornecedor crítico'],
    ['fetag-comissao', 'Comissão'],
    ['fetag-marketing', 'Marketing'],
    ['fetag-juridico', 'Jurídico']
  ].forEach(([id, name]) => {
    insertEntityTag.run(id, DEFAULT_ORGANIZATION_ID, name, normalizeFinanceText(name), organizationSeedNowIso, organizationSeedNowIso);
  });

  const internalUserCount = db.prepare('select count(*) as count from internal_user').get() as { count: number };
  if (internalUserCount.count === 0) {
    const createdAtIso = new Date().toISOString();
    db.prepare(`
      insert into internal_user (
        id, username, display_name, password_hash, role, permissions_json, organization_id, is_active, last_login_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, 1, null, ?, ?)
    `).run(
      'iuser-supremo-default',
      'holand',
      'Equipe Holand',
      hashInternalPasswordSeed('Holand2026!@#'),
      'supremo',
      JSON.stringify([
        'dashboard',
        'calendar',
        'cohorts',
        'clients',
        'technicians',
        'implementation',
        'support',
        'recruitment',
        'licenses',
        'license_programs',
        'docs',
        'admin'
      ]),
      DEFAULT_ORGANIZATION_ID,
      createdAtIso,
      createdAtIso
    );
  }

  db.prepare(`
    update internal_user
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);

  db.prepare(`
    update financial_account
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_category
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_transaction
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_payable
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_receivable
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_import_job
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_bank_statement_entry
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_reconciliation_match
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update financial_debt
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update billing_plan
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update billing_subscription
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);
  db.prepare(`
    update billing_invoice
    set organization_id = coalesce(organization_id, ?)
    where organization_id is null
  `).run(DEFAULT_ORGANIZATION_ID);

  db.exec(`
    create trigger if not exists financial_transaction_financial_entity_consistency_insert
    before insert on financial_transaction
    for each row
    when new.financial_entity_id is not null
      and not exists (
        select 1
        from financial_entity fe
        where fe.organization_id = new.organization_id
          and fe.id = new.financial_entity_id
      )
    begin
      select raise(abort, 'financial_transaction financial_entity mismatch');
    end;

    create trigger if not exists financial_transaction_financial_entity_consistency_update
    before update of organization_id, financial_entity_id on financial_transaction
    for each row
    when new.financial_entity_id is not null
      and not exists (
        select 1
        from financial_entity fe
        where fe.organization_id = new.organization_id
          and fe.id = new.financial_entity_id
      )
    begin
      select raise(abort, 'financial_transaction financial_entity mismatch');
    end;

    create trigger if not exists portal_session_tenant_consistency_insert
    before insert on portal_session
    for each row
    when not exists (
      select 1
      from portal_user pu
      join portal_client pc on pc.id = pu.portal_client_id
      where pu.id = new.portal_user_id
        and pu.portal_client_id = new.portal_client_id
        and pc.company_id = new.company_id
    )
    begin
      select raise(abort, 'portal_session tenant mismatch');
    end;

    create trigger if not exists portal_session_tenant_consistency_update
    before update of portal_user_id, portal_client_id, company_id on portal_session
    for each row
    when not exists (
      select 1
      from portal_user pu
      join portal_client pc on pc.id = pu.portal_client_id
      where pu.id = new.portal_user_id
        and pu.portal_client_id = new.portal_client_id
        and pc.company_id = new.company_id
    )
    begin
      select raise(abort, 'portal_session tenant mismatch');
    end;

    create trigger if not exists portal_ticket_tenant_consistency_insert
    before insert on portal_ticket
    for each row
    when not exists (
      select 1
      from portal_user pu
      join portal_client pc on pc.id = pu.portal_client_id
      where pu.id = new.portal_user_id
        and pc.company_id = new.company_id
    )
    begin
      select raise(abort, 'portal_ticket tenant mismatch');
    end;

    create trigger if not exists portal_ticket_tenant_consistency_update
    before update of portal_user_id, company_id on portal_ticket
    for each row
    when not exists (
      select 1
      from portal_user pu
      join portal_client pc on pc.id = pu.portal_client_id
      where pu.id = new.portal_user_id
        and pc.company_id = new.company_id
    )
    begin
      select raise(abort, 'portal_ticket tenant mismatch');
    end;
  `);

  db.exec(`
    insert or ignore into cohort_participant_module (participant_id, module_id)
    select cp.id, a.module_id
    from cohort_participant cp
    join cohort_allocation a on a.cohort_id = cp.cohort_id and a.company_id = cp.company_id
    where a.status <> 'Cancelado'
  `);

  const activitiesWithSingleTechnician = db.prepare(`
    select id, technician_id
    from calendar_activity
    where technician_id is not null and trim(technician_id) <> ''
  `).all() as Array<{ id: string; technician_id: string }>;
  const insertActivityTechnician = db.prepare(`
    insert or ignore into calendar_activity_technician (activity_id, technician_id)
    values (?, ?)
  `);
  activitiesWithSingleTechnician.forEach((row) => {
    insertActivityTechnician.run(row.id, row.technician_id);
  });

  const activitiesWithoutDayRows = db.prepare(`
    select ca.id, ca.start_date, ca.end_date, ca.selected_dates, ca.all_day, ca.start_time, ca.end_time
    from calendar_activity ca
    where not exists (
      select 1
      from calendar_activity_day cad
      where cad.activity_id = ca.id
    )
  `).all() as Array<{
    id: string;
    start_date: string;
    end_date: string;
    selected_dates: string | null;
    all_day: number;
    start_time: string | null;
    end_time: string | null;
  }>;
  const insertActivityDay = db.prepare(`
    insert or ignore into calendar_activity_day (activity_id, day_date, all_day, start_time, end_time)
    values (?, ?, ?, ?, ?)
  `);
  activitiesWithoutDayRows.forEach((activity) => {
    const selectedDates = uniqueSortedIsoDates((activity.selected_dates ?? '').split('|'));
    const fallbackDates = iterateIsoDateRange(activity.start_date, activity.end_date || activity.start_date);
    const dates = selectedDates.length > 0 ? selectedDates : fallbackDates;
    const allDay = Number(activity.all_day) === 1 ? 1 : 0;
    const startTime = allDay === 1 ? null : activity.start_time;
    const endTime = allDay === 1 ? null : activity.end_time;
    dates.forEach((dateIso) => {
      insertActivityDay.run(activity.id, dateIso, allDay, startTime, endTime);
    });
  });

  const nowIso = new Date().toISOString().slice(0, 10);
  const defaultKanbanColumns: Array<{ id: string; title: string; color: string; position: number }> = [
    { id: 'kcol-todo', title: 'A fazer', color: '#7b8ea8', position: 0 },
    { id: 'kcol-doing', title: 'Em andamento', color: '#b17613', position: 1 },
    { id: 'kcol-done', title: 'Concluído', color: '#1c8b61', position: 2 }
  ];
  const existingColumnCount = db.prepare('select count(*) as count from implementation_kanban_column').get() as { count: number };
  if (existingColumnCount.count === 0) {
    const insertColumn = db.prepare(`
      insert into implementation_kanban_column (id, title, color, position, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?)
    `);
    defaultKanbanColumns.forEach((column) => {
      insertColumn.run(column.id, column.title, column.color, column.position, nowIso, nowIso);
    });
  }

  const statusToColumnId: Record<string, string> = {
    Todo: 'kcol-todo',
    Doing: 'kcol-doing',
    Done: 'kcol-done'
  };
  const cardsWithoutColumn = db.prepare(`
    select id, status
    from implementation_kanban_card
    where column_id is null or trim(column_id) = ''
  `).all() as Array<{ id: string; status: string }>;
  if (cardsWithoutColumn.length > 0) {
    const firstColumn = db.prepare(`
      select id
      from implementation_kanban_column
      order by position asc, created_at asc
      limit 1
    `).get() as { id: string } | undefined;
    const fallbackColumnId = firstColumn?.id ?? 'kcol-todo';
    const updateCardColumn = db.prepare('update implementation_kanban_card set column_id = ? where id = ?');
    cardsWithoutColumn.forEach((card) => {
      updateCardColumn.run(statusToColumnId[card.status] ?? fallbackColumnId, card.id);
    });
  }

  const licenseProgramCount = db.prepare('select count(*) as count from license_program').get() as { count: number };
  if (licenseProgramCount.count === 0) {
    const nowIso = new Date().toISOString().slice(0, 10);
    const insertProgram = db.prepare(`
      insert into license_program (id, name, notes, created_at, updated_at)
      values (?, ?, ?, ?, ?)
    `);
    insertProgram.run('lpr-topsolid-design', 'TopSolid Design', null, nowIso, nowIso);
    insertProgram.run('lpr-topsolid-cam', 'TopSolid CAM', null, nowIso, nowIso);
  }
}

function hasSeed(): boolean {
  const row = db.prepare('select count(*) as count from module_template').get() as { count: number };
  return row.count > 0;
}

function getDateOffsetIso(baseDate: string, offsetDays: number) {
  const value = new Date(`${baseDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function seedFinanceDemoData() {
  const organizationId = DEFAULT_ORGANIZATION_ID;
  const companyId = 'comp-01';
  const createdAt = new Date().toISOString();
  const today = nowDateIso();
  const yesterday = getDateOffsetIso(today, -1);
  const twoDaysAgo = getDateOffsetIso(today, -2);
  const threeDaysAgo = getDateOffsetIso(today, -3);
  const nextWeek = getDateOffsetIso(today, 7);
  const nextTwoWeeks = getDateOffsetIso(today, 14);
  const nextMonth = getDateOffsetIso(today, 30);
  const nextTwoMonths = getDateOffsetIso(today, 60);
  const currentMonth = new Date(`${today}T00:00:00.000Z`);
  const dateInMonth = (monthOffset: number, day: number) => {
    const value = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + monthOffset, day));
    return value.toISOString().slice(0, 10);
  };
  const periodFromOffset = (monthOffset: number) => dateInMonth(monthOffset, 1).slice(0, 7);
  const monthLabel = (monthOffset: number) => periodFromOffset(monthOffset);

  db.prepare(`
    insert or ignore into company (id, name, status, notes, priority)
    values (?, ?, ?, ?, ?)
  `).run(companyId, 'Metal Forte', 'Ativo', 'Cliente base para massa demo do financeiro', 0);

  const insertAccount = db.prepare(`
    insert or ignore into financial_account (
      id, organization_id, company_id, name, kind, currency, account_number, branch_number, is_active, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['facc-itau', 'Banco Itau Operacional', 'bank', '34123-4', '0001'],
    ['facc-caixa', 'Caixa Operacional', 'cash', null, null]
  ].forEach(([id, name, kind, accountNumber, branchNumber]) => {
    insertAccount.run(id, organizationId, companyId, name, kind, 'BRL', accountNumber, branchNumber, 1, createdAt, createdAt);
  });

  const insertCategory = db.prepare(`
    insert or ignore into financial_category (
      id, organization_id, company_id, name, kind, parent_category_id, is_active, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fcat-servicos', 'Receita de Servicos', 'income'],
    ['fcat-bilheteria', 'Bilheteria', 'income'],
    ['fcat-patrocinio', 'Patrocinio', 'income'],
    ['fcat-recorrencia', 'Receita Recorrente', 'income'],
    ['fcat-implantacao', 'Implantacao e Setup', 'income'],
    ['fcat-consultoria', 'Consultoria Financeira', 'income'],
    ['fcat-impostos', 'Impostos', 'expense'],
    ['fcat-operacional', 'Despesas Operacionais', 'expense'],
    ['fcat-cachê', 'Cache Artistico', 'expense'],
    ['fcat-seguros', 'Seguros', 'expense'],
    ['fcat-marketing', 'Marketing e Vendas', 'expense'],
    ['fcat-pessoas', 'Pessoas e Freelancers', 'expense'],
    ['fcat-tecnologia', 'Tecnologia', 'expense'],
    ['fcat-financeiras', 'Tarifas Financeiras', 'expense']
  ].forEach(([id, name, kind]) => {
    insertCategory.run(id, organizationId, companyId, name, kind, null, 1, createdAt, createdAt);
  });

  const insertEntity = db.prepare(`
    insert or ignore into financial_entity (
      id, organization_id, legal_name, trade_name, document_number, kind, email, phone, is_active, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fent-itau-bba', 'Itau BBA', 'Itau BBA', '12.345.678/0001-00', 'customer', 'contato@itaubba.com', '+55 11 3000-1000'],
    ['fent-joao-silva', 'Joao Silva', 'Joao Silva', '123.456.789-00', 'supplier', 'joao@silva.com', '+55 11 98888-1111'],
    ['fent-estudio-harmonia', 'Estudio Harmonia', 'Estudio Harmonia', '11.222.333/0001-55', 'supplier', 'adm@harmonia.com', '+55 11 98888-2222'],
    ['fent-sympla', 'Sympla', 'Sympla', '19.999.999/0001-99', 'customer', 'financeiro@sympla.com', '+55 31 3000-2000'],
    ['fent-bradesco', 'Bradesco', 'Bradesco Cultural', '60.746.948/0001-12', 'customer', 'cultural@bradesco.com', '+55 11 4000-3000'],
    ['fent-sesc', 'SESC Sao Paulo', 'SESC', '03.791.430/0001-83', 'customer', 'agenda@sescsp.org.br', '+55 11 4000-4000'],
    ['fent-porto', 'Porto Seguro', 'Porto Seguro', '61.198.164/0001-60', 'supplier', 'seguro@porto.com', '+55 11 4000-5000'],
    ['fent-ecad', 'ECAD', 'ECAD', '00.474.973/0001-62', 'supplier', 'ecad@ecad.org.br', '+55 21 4000-6000'],
    ['fent-natura', 'Natura Cosmeticos S.A.', 'Natura', '71.673.990/0001-77', 'customer', 'financeiro@natura.com', '+55 11 4444-1000'],
    ['fent-magalu', 'Magazine Luiza S.A.', 'Magalu', '47.960.950/0001-21', 'customer', 'eventos@magalu.com', '+55 16 5555-2000'],
    ['fent-vtex', 'VTEX Brasil Tecnologia', 'VTEX', '05.314.972/0001-74', 'customer', 'ap@vtex.com', '+55 21 5555-3000'],
    ['fent-hubspot', 'HubSpot Brasil', 'HubSpot', '44.111.222/0001-90', 'supplier', 'billing@hubspot.com', '+55 11 5555-4000'],
    ['fent-aws', 'Amazon Web Services Brasil', 'AWS', '23.412.321/0001-77', 'supplier', 'aws-br@amazon.com', '+55 11 5555-5000'],
    ['fent-meta', 'Meta Ads Brasil', 'Meta Ads', '10.111.222/0001-66', 'supplier', 'billing@meta.com', '+55 11 5555-6000'],
    ['fent-contabil', 'Atlas Contabilidade', 'Atlas Contabilidade', '33.555.777/0001-22', 'supplier', 'fiscal@atlascontabil.com', '+55 11 5555-7000']
  ].forEach(([id, legalName, tradeName, documentNumber, kind, email, phone]) => {
    insertEntity.run(id, organizationId, legalName, tradeName, documentNumber, kind, email, phone, 1, createdAt, createdAt);
  });

  const insertCostCenter = db.prepare(`
    insert or ignore into financial_cost_center (id, organization_id, name, code, is_active, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fcc-op', 'Operacao', 'OP'],
    ['fcc-com', 'Comercial', 'COM'],
    ['fcc-fin', 'Financeiro', 'FIN'],
    ['fcc-prod', 'Produto', 'PROD'],
    ['fcc-marketing', 'Marketing', 'MKT'],
    ['fcc-admin', 'Administrativo', 'ADM']
  ].forEach(([id, name, code]) => {
    insertCostCenter.run(id, organizationId, name, code, 1, createdAt, createdAt);
  });

  const insertPaymentMethod = db.prepare(`
    insert or ignore into financial_payment_method (id, organization_id, name, kind, is_active, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fpm-pix', 'PIX', 'pix'],
    ['fpm-boleto', 'Boleto', 'boleto'],
    ['fpm-transfer', 'Transferencia', 'transfer'],
    ['fpm-card', 'Cartao Corporativo', 'card']
  ].forEach(([id, name, kind]) => {
    insertPaymentMethod.run(id, organizationId, name, kind, 1, createdAt, createdAt);
  });

  const insertDemoTransaction = db.prepare(`
    insert or ignore into financial_transaction (
      id, organization_id, company_id, financial_entity_id, financial_account_id, financial_category_id,
      financial_cost_center_id, financial_payment_method_id, kind, status, amount_cents, issue_date,
      due_date, settlement_date, competence_date, source, source_ref, note, created_by, created_at, updated_at, is_deleted
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo_seed', ?, ?, 'seed', ?, ?, 0)
  `);
  const addDemoTransaction = (input: {
    id: string;
    entityId: string | null;
    accountId?: string;
    categoryId: string | null;
    costCenterId: string | null;
    paymentMethodId?: string | null;
    kind: 'income' | 'expense';
    status: 'settled' | 'open' | 'planned' | 'overdue';
    amountCents: number;
    issueDate: string;
    dueDate: string;
    settlementDate: string | null;
    competenceDate: string;
    note: string;
  }) => {
    insertDemoTransaction.run(
      input.id,
      organizationId,
      companyId,
      input.entityId,
      input.accountId ?? 'facc-itau',
      input.categoryId,
      input.costCenterId,
      input.paymentMethodId ?? 'fpm-transfer',
      input.kind,
      input.status,
      input.amountCents,
      input.issueDate,
      input.dueDate,
      input.settlementDate,
      input.competenceDate,
      input.id,
      input.note,
      createdAt,
      createdAt
    );
  };

  const insertTransaction = db.prepare(`
    insert or ignore into financial_transaction (
      id, organization_id, company_id, financial_entity_id, financial_account_id, financial_category_id,
      kind, status, amount_cents, issue_date, due_date, settlement_date, competence_date, note, created_at, updated_at, is_deleted
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const transactions = [
    ['ftxn-001', 'fent-itau-bba', 'facc-itau', 'fcat-patrocinio', 'income', 'settled', 15000000, threeDaysAgo, twoDaysAgo, twoDaysAgo, twoDaysAgo, 'Patrocinio Itau BBA'],
    ['ftxn-002', 'fent-joao-silva', 'facc-itau', 'fcat-cachê', 'expense', 'settled', 2500000, threeDaysAgo, yesterday, yesterday, yesterday, 'Cache Maestro Silva'],
    ['ftxn-003', 'fent-estudio-harmonia', 'facc-itau', 'fcat-operacional', 'expense', 'settled', 850000, twoDaysAgo, today, today, today, 'Aluguel Sala de Ensaio'],
    ['ftxn-004', 'fent-sympla', 'facc-itau', 'fcat-bilheteria', 'income', 'open', 4280000, today, nextWeek, null, today, 'Venda de Ingressos — Temporada Verao'],
    ['ftxn-005', 'fent-bradesco', 'facc-itau', 'fcat-patrocinio', 'income', 'planned', 8000000, today, nextMonth, null, nextMonth, 'Patrocinio Bradesco Cultural'],
    ['ftxn-006', 'fent-sesc', 'facc-itau', 'fcat-servicos', 'income', 'settled', 2200000, yesterday, today, today, today, 'Apresentacao SESC Pompeia'],
    ['ftxn-007', 'fent-porto', 'facc-itau', 'fcat-seguros', 'expense', 'open', 680000, today, nextTwoWeeks, null, today, 'Seguro de Instrumentos'],
    ['ftxn-008', 'fent-ecad', 'facc-itau', 'fcat-impostos', 'expense', 'overdue', 420000, yesterday, yesterday, null, yesterday, 'ECAD — Direitos Autorais'],
    ['ftxn-009', null, 'facc-caixa', null, 'expense', 'open', 195000, today, nextWeek, null, today, 'Despesa ainda sem categoria'],
    ['ftxn-010', 'fent-itau-bba', 'facc-itau', 'fcat-servicos', 'income', 'settled', 3000000, twoDaysAgo, yesterday, yesterday, yesterday, 'Receita de consultoria']
  ] as const;
  transactions.forEach((row) => {
    insertTransaction.run(
      row[0],
      organizationId,
      companyId,
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      createdAt,
      createdAt
    );
  });

  const historicalRevenuePlans = [
    { entityId: 'fent-natura', categoryId: 'fcat-recorrencia', costCenterId: 'fcc-com', note: 'Mensalidade Natura', baseCents: 7600000 },
    { entityId: 'fent-magalu', categoryId: 'fcat-servicos', costCenterId: 'fcc-op', note: 'Operacao Magalu Live', baseCents: 5400000 },
    { entityId: 'fent-vtex', categoryId: 'fcat-consultoria', costCenterId: 'fcc-prod', note: 'Consultoria VTEX', baseCents: 4200000 },
    { entityId: 'fent-sympla', categoryId: 'fcat-bilheteria', costCenterId: 'fcc-com', note: 'Bilheteria Sympla', baseCents: 3100000 }
  ] as const;
  const historicalExpensePlans = [
    { entityId: 'fent-aws', categoryId: 'fcat-tecnologia', costCenterId: 'fcc-prod', paymentMethodId: 'fpm-card', note: 'Infraestrutura AWS', baseCents: 1180000 },
    { entityId: 'fent-meta', categoryId: 'fcat-marketing', costCenterId: 'fcc-marketing', paymentMethodId: 'fpm-card', note: 'Campanhas Meta Ads', baseCents: 1650000 },
    { entityId: 'fent-contabil', categoryId: 'fcat-financeiras', costCenterId: 'fcc-admin', paymentMethodId: 'fpm-boleto', note: 'BPO contabil e fiscal', baseCents: 920000 },
    { entityId: 'fent-joao-silva', categoryId: 'fcat-pessoas', costCenterId: 'fcc-op', paymentMethodId: 'fpm-pix', note: 'Equipe freelancer operacional', baseCents: 2450000 },
    { entityId: 'fent-ecad', categoryId: 'fcat-impostos', costCenterId: 'fcc-fin', paymentMethodId: 'fpm-boleto', note: 'Impostos e direitos', baseCents: 1360000 }
  ] as const;

  for (let monthOffset = -11; monthOffset <= 2; monthOffset += 1) {
    const periodIndex = monthOffset + 11;
    const future = monthOffset > 0;
    const current = monthOffset === 0;
    const revenueMultiplier = 1 + periodIndex * 0.045 + (monthOffset === 0 ? 0.08 : 0);
    const expenseMultiplier = 1 + periodIndex * 0.025 + (current ? 0.04 : 0);
    const revenueStatus = future ? 'planned' : current ? 'open' : 'settled';
    const expenseStatus = future ? 'planned' : current ? 'open' : 'settled';

    historicalRevenuePlans.forEach((plan, index) => {
      const issueDate = dateInMonth(monthOffset, 2 + index * 3);
      const dueDate = dateInMonth(monthOffset, 8 + index * 4);
      const settlementDate = future || (current && index > 1) ? null : dateInMonth(monthOffset, 9 + index * 4);
      const amountCents = Math.round((plan.baseCents + index * 320000) * revenueMultiplier);
      addDemoTransaction({
        id: `ftxn-demo-rev-${periodFromOffset(monthOffset)}-${index + 1}`,
        entityId: plan.entityId,
        categoryId: plan.categoryId,
        costCenterId: plan.costCenterId,
        paymentMethodId: index % 2 === 0 ? 'fpm-transfer' : 'fpm-pix',
        kind: 'income',
        status: settlementDate ? 'settled' : revenueStatus,
        amountCents,
        issueDate,
        dueDate,
        settlementDate,
        competenceDate: issueDate,
        note: `${plan.note} ${monthLabel(monthOffset)}`
      });
    });

    if (monthOffset % 3 === 0 || current || future) {
      const issueDate = dateInMonth(monthOffset, 5);
      const dueDate = dateInMonth(monthOffset, 20);
      const settlementDate = future ? null : dateInMonth(monthOffset, 21);
      addDemoTransaction({
        id: `ftxn-demo-setup-${periodFromOffset(monthOffset)}`,
        entityId: monthOffset % 2 === 0 ? 'fent-bradesco' : 'fent-itau-bba',
        categoryId: 'fcat-implantacao',
        costCenterId: 'fcc-prod',
        paymentMethodId: 'fpm-boleto',
        kind: 'income',
        status: settlementDate ? 'settled' : 'planned',
        amountCents: Math.round(6800000 * revenueMultiplier),
        issueDate,
        dueDate,
        settlementDate,
        competenceDate: issueDate,
        note: `Projeto de implantacao ${monthLabel(monthOffset)}`
      });
    }

    historicalExpensePlans.forEach((plan, index) => {
      const issueDate = dateInMonth(monthOffset, 4 + index * 2);
      const dueDate = dateInMonth(monthOffset, 12 + index * 3);
      const settlementDate = future || (current && index > 2) ? null : dateInMonth(monthOffset, 13 + index * 3);
      const amountCents = Math.round((plan.baseCents + index * 180000) * expenseMultiplier);
      addDemoTransaction({
        id: `ftxn-demo-exp-${periodFromOffset(monthOffset)}-${index + 1}`,
        entityId: plan.entityId,
        categoryId: plan.categoryId,
        costCenterId: plan.costCenterId,
        paymentMethodId: plan.paymentMethodId,
        kind: 'expense',
        status: settlementDate ? 'settled' : expenseStatus,
        amountCents,
        issueDate,
        dueDate,
        settlementDate,
        competenceDate: issueDate,
        note: `${plan.note} ${monthLabel(monthOffset)}`
      });
    });
  }

  const insertReceivable = db.prepare(`
    insert or ignore into financial_receivable (
      id, organization_id, company_id, financial_transaction_id, financial_entity_id, financial_account_id, financial_category_id,
      customer_name, description, amount_cents, status, issue_date, due_date, received_at, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['frec-001', 'ftxn-004', 'fent-sympla', 'facc-itau', 'fcat-bilheteria', 'Sympla', 'Recebivel bilheteria aberto', 4280000, 'open', today, nextWeek, null, 'Bilheteria em aberto'],
    ['frec-002', 'ftxn-005', 'fent-bradesco', 'facc-itau', 'fcat-patrocinio', 'Bradesco Cultural', 'Patrocinio futuro', 8000000, 'planned', today, nextMonth, null, 'Previsto para proximo mes'],
    ['frec-003', 'ftxn-001', 'fent-itau-bba', 'facc-itau', 'fcat-patrocinio', 'Itau BBA', 'Patrocinio recebido', 15000000, 'received', threeDaysAgo, twoDaysAgo, twoDaysAgo, 'Ja liquidado'],
    ['frec-004', null, 'fent-sesc', 'facc-itau', 'fcat-servicos', 'SESC', 'Recebivel em atraso', 3500000, 'overdue', threeDaysAgo, yesterday, null, 'Cobrar cliente'],
    ['frec-005', null, 'fent-itau-bba', 'facc-itau', 'fcat-servicos', 'Itau BBA', 'Recebimento parcial', 1800000, 'partial', yesterday, nextTwoWeeks, null, 'Falta segunda parcela']
  ].forEach((row) => {
    insertReceivable.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], createdAt, createdAt);
  });

  const insertDemoReceivable = db.prepare(`
    insert or ignore into financial_receivable (
      id, organization_id, company_id, financial_transaction_id, financial_entity_id, financial_account_id,
      financial_category_id, financial_cost_center_id, financial_payment_method_id, customer_name,
      description, amount_cents, received_amount_cents, status, issue_date, due_date, received_at,
      source, source_ref, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo_seed', ?, ?, ?, ?)
  `);
  [
    ['frec-demo-001', null, 'fent-natura', 'facc-itau', 'fcat-recorrencia', 'fcc-com', 'fpm-boleto', 'Natura', 'Mensalidade enterprise em atraso', 9400000, 0, 'overdue', getDateOffsetIso(today, -18), getDateOffsetIso(today, -6), null, 'Cobrar sponsor financeiro ainda hoje'],
    ['frec-demo-002', null, 'fent-magalu', 'facc-itau', 'fcat-servicos', 'fcc-op', 'fpm-transfer', 'Magalu', 'Operacao live commerce - parcela 2', 6900000, 2500000, 'partial', getDateOffsetIso(today, -12), getDateOffsetIso(today, 4), null, 'Pagamento parcial identificado no banco'],
    ['frec-demo-003', null, 'fent-vtex', 'facc-itau', 'fcat-consultoria', 'fcc-prod', 'fpm-boleto', 'VTEX', 'Sprint de consultoria financeira', 5200000, 0, 'open', getDateOffsetIso(today, -3), getDateOffsetIso(today, 12), null, 'Contrato recorrente trimestral'],
    ['frec-demo-004', null, 'fent-bradesco', 'facc-itau', 'fcat-patrocinio', 'fcc-com', 'fpm-boleto', 'Bradesco Cultural', 'Patrocinio Q3 aprovado', 13200000, 0, 'planned', today, getDateOffsetIso(today, 28), null, 'Previsao assinada pelo cliente'],
    ['frec-demo-005', null, 'fent-itau-bba', 'facc-itau', 'fcat-implantacao', 'fcc-prod', 'fpm-transfer', 'Itau BBA', 'Setup modulo financeiro executivo', 7800000, 7800000, 'received', getDateOffsetIso(today, -10), getDateOffsetIso(today, -2), getDateOffsetIso(today, -1), 'Recebido e conciliado']
  ].forEach((row) => {
    insertDemoReceivable.run(
      row[0],
      organizationId,
      companyId,
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      row[12],
      row[13],
      row[14],
      row[0],
      row[15],
      createdAt,
      createdAt
    );
  });

  const insertPayable = db.prepare(`
    insert or ignore into financial_payable (
      id, organization_id, company_id, financial_transaction_id, financial_entity_id, financial_account_id, financial_category_id,
      supplier_name, description, amount_cents, status, issue_date, due_date, paid_at, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fpay-001', 'ftxn-007', 'fent-porto', 'facc-itau', 'fcat-seguros', 'Porto Seguro', 'Seguro mensal', 680000, 'open', today, nextTwoWeeks, null, 'Seguro recorrente'],
    ['fpay-002', 'ftxn-008', 'fent-ecad', 'facc-itau', 'fcat-impostos', 'ECAD', 'Direitos autorais', 420000, 'overdue', threeDaysAgo, yesterday, null, 'Pagamento atrasado'],
    ['fpay-003', 'ftxn-003', 'fent-estudio-harmonia', 'facc-itau', 'fcat-operacional', 'Estudio Harmonia', 'Aluguel sala', 850000, 'paid', twoDaysAgo, today, today, 'Pago hoje'],
    ['fpay-004', null, 'fent-joao-silva', 'facc-itau', 'fcat-cachê', 'Joao Silva', 'Cache vence hoje', 320000, 'open', yesterday, today, null, 'Urgente'],
    ['fpay-005', null, 'fent-estudio-harmonia', 'facc-itau', 'fcat-operacional', 'Estudio Harmonia', 'Pagamento em breve', 8500000, 'planned', today, nextWeek, null, 'Planejado para a proxima semana']
  ].forEach((row) => {
    insertPayable.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], createdAt, createdAt);
  });

  const insertDemoPayable = db.prepare(`
    insert or ignore into financial_payable (
      id, organization_id, company_id, financial_transaction_id, financial_entity_id, financial_account_id,
      financial_category_id, financial_cost_center_id, financial_payment_method_id, supplier_name,
      description, amount_cents, paid_amount_cents, status, issue_date, due_date, paid_at,
      source, source_ref, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo_seed', ?, ?, ?, ?)
  `);
  [
    ['fpay-demo-001', null, 'fent-aws', 'facc-itau', 'fcat-tecnologia', 'fcc-prod', 'fpm-card', 'AWS', 'Infraestrutura cloud acima do previsto', 1680000, 0, 'overdue', getDateOffsetIso(today, -20), getDateOffsetIso(today, -4), null, 'Validar aumento de uso no dashboard AWS'],
    ['fpay-demo-002', null, 'fent-meta', 'facc-itau', 'fcat-marketing', 'fcc-marketing', 'fpm-card', 'Meta Ads', 'Campanha performance junho', 2140000, 0, 'open', getDateOffsetIso(today, -5), getDateOffsetIso(today, 6), null, 'Pausar se CAC passar do limite'],
    ['fpay-demo-003', null, 'fent-contabil', 'facc-itau', 'fcat-financeiras', 'fcc-admin', 'fpm-boleto', 'Atlas Contabilidade', 'Fechamento fiscal e folha', 1180000, 0, 'open', getDateOffsetIso(today, -2), getDateOffsetIso(today, 10), null, 'Obrigacao mensal'],
    ['fpay-demo-004', null, 'fent-joao-silva', 'facc-itau', 'fcat-pessoas', 'fcc-op', 'fpm-pix', 'Joao Silva', 'Freelancers operacao de evento', 3860000, 1200000, 'partial', getDateOffsetIso(today, -8), getDateOffsetIso(today, 3), null, 'Restante apos aprovacao do evento'],
    ['fpay-demo-005', null, 'fent-porto', 'facc-itau', 'fcat-seguros', 'fcc-admin', 'fpm-boleto', 'Porto Seguro', 'Renovacao seguro equipamentos', 2440000, 0, 'planned', today, getDateOffsetIso(today, 31), null, 'Despesa prevista para proximo ciclo']
  ].forEach((row) => {
    insertDemoPayable.run(
      row[0],
      organizationId,
      companyId,
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      row[12],
      row[13],
      row[14],
      row[0],
      row[15],
      createdAt,
      createdAt
    );
  });

  const insertImportJob = db.prepare(`
    insert or ignore into financial_import_job (
      id, organization_id, company_id, import_type, source_file_name, source_file_mime_type, source_file_size_bytes,
      status, total_rows, processed_rows, error_rows, error_summary, created_by, finished_at, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fimp-001', 'OFX', 'extrato-abril.ofx', 'application/x-ofx', 48012, 'completed', 6, 6, 0, null, `${createdAt}`, `${createdAt}`],
    ['fimp-002', 'CSV', 'extrato-recebiveis.csv', 'text/csv', 21012, 'completed', 3, 3, 0, null, `${createdAt}`, `${createdAt}`]
  ].forEach((row) => {
    insertImportJob.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], 'seed', row[10], createdAt, createdAt);
  });

  const insertStatementEntry = db.prepare(`
    insert or ignore into financial_bank_statement_entry (
      id, organization_id, company_id, financial_account_id, financial_import_job_id, statement_date, posted_at,
      amount_cents, description, reference_code, balance_cents, source, source_ref, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fstmt-001', 'facc-itau', 'fimp-001', twoDaysAgo, twoDaysAgo, 15000000, 'Credito patrocinio Itau', 'ITAU001', 15000000, 'ofx', 'linha-1'],
    ['fstmt-002', 'facc-itau', 'fimp-001', yesterday, yesterday, -2500000, 'Pagamento cache Joao Silva', 'ITAU002', 12500000, 'ofx', 'linha-2'],
    ['fstmt-003', 'facc-itau', 'fimp-001', today, today, -850000, 'Pagamento aluguel estudio', 'ITAU003', 11650000, 'ofx', 'linha-3'],
    ['fstmt-004', 'facc-itau', 'fimp-001', today, today, -320000, 'Cache vence hoje', 'ITAU004', 11330000, 'ofx', 'linha-4'],
    ['fstmt-005', 'facc-itau', 'fimp-002', nextWeek, nextWeek, 4280000, 'Recebimento Sympla', 'CSV001', 15610000, 'csv', 'linha-5'],
    ['fstmt-006', 'facc-itau', 'fimp-002', nextWeek, nextWeek, -8500000, 'Pagamento Estudio', 'CSV002', 7110000, 'csv', 'linha-6']
  ].forEach((row) => {
    insertStatementEntry.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], createdAt, createdAt);
  });

  const insertMatch = db.prepare(`
    insert or ignore into financial_reconciliation_match (
      id, organization_id, company_id, financial_bank_statement_entry_id, financial_transaction_id,
      match_type, match_status, matched_amount_cents, matched_at, matched_by, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fmatch-001', 'fstmt-001', 'ftxn-001', 'seed', 'matched', 15000000, twoDaysAgo, 'seed', 'confidence=0.9800'],
    ['fmatch-002', 'fstmt-002', 'ftxn-002', 'seed', 'matched', 2500000, yesterday, 'seed', 'confidence=0.9600'],
    ['fmatch-003', 'fstmt-003', 'ftxn-003', 'seed', 'matched', 850000, today, 'seed', 'confidence=0.9500']
  ].forEach((row) => {
    insertMatch.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], createdAt, createdAt);
  });

  const insertDebt = db.prepare(`
    insert or ignore into financial_debt (
      id, organization_id, company_id, financial_payable_id, financial_receivable_id, financial_transaction_id,
      debt_type, status, principal_amount_cents, outstanding_amount_cents, due_date, settled_at, note, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['fdeb-001', 'fpay-002', null, 'ftxn-008', 'tributaria', 'open', 420000, 420000, nextMonth, null, 'ECAD ainda em aberto'],
    ['fdeb-002', null, 'frec-004', null, 'comercial', 'partial', 3500000, 1200000, nextTwoMonths, null, 'Recebivel renegociado']
  ].forEach((row) => {
    insertDebt.run(row[0], organizationId, companyId, row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], createdAt, createdAt);
  });
}

function shouldSeedFinanceDemoData() {
  const explicitValue = process.env.SEED_FINANCE_DEMO?.trim().toLowerCase();
  if (explicitValue) {
    return ['1', 'true', 'yes', 'on'].includes(explicitValue);
  }

  return process.env.NODE_ENV !== 'production';
}

export function seedDb() {
  if (!hasSeed()) {
    const today = nowDateIso();
    const createdAt = new Date().toISOString();
    const date = (offsetDays: number) => getDateOffsetIso(today, offsetDays);

    const modules: Array<[string, string, string, string, string, number, string, number, 'ministrado' | 'entregavel', 'consome' | 'nao_consume']> = [
      ['mod-01', 'VEL-01', 'Kickoff', 'Diagnóstico operacional', 'Mapeamento de processos, equipe, agenda e riscos antes da implantação.', 1, 'Essencial', 1, 'ministrado', 'consome'],
      ['mod-02', 'VEL-02', 'Implantacao', 'Configuração do ambiente', 'Cadastros, permissões, calendário, portal e parâmetros de operação.', 2, 'Essencial', 1, 'ministrado', 'consome'],
      ['mod-03', 'VEL-03', 'Agenda', 'Planejamento de capacidade', 'Montagem de agenda por técnico, conflito de horários e distribuição de carga.', 2, 'Intermediário', 1, 'ministrado', 'consome'],
      ['mod-04', 'VEL-04', 'Portal', 'Portal do cliente e certificados', 'Liberação de portal, agenda externa, chamados e certificados de entrega.', 1, 'Intermediário', 1, 'ministrado', 'consome'],
      ['mod-05', 'VEL-05', 'Suporte', 'Playbook de suporte técnico', 'Triagem, SLA, handoff, evidências e comunicação com o cliente.', 2, 'Intermediário', 0, 'ministrado', 'consome'],
      ['mod-06', 'VEL-06', 'Licencas', 'Governança de licenças', 'Controle de programas, usuários, ciclos de renovação e riscos de vencimento.', 1, 'Intermediário', 0, 'ministrado', 'consome'],
      ['mod-07', 'VEL-07', 'Automacao', 'Rotinas e automações operacionais', 'Padronização de tarefas recorrentes, alertas e conferências semanais.', 2, 'Avançado', 0, 'ministrado', 'consome'],
      ['mod-08', 'VEL-08', 'Entrega', 'Relatório executivo de implantação', 'Documento final com status, próximos passos e indicadores de adoção.', 1, 'Executivo', 0, 'entregavel', 'nao_consume'],
      ['mod-09', 'VEL-09', 'Expansao', 'Expansão multiunidade', 'Modelo para operação com filiais, múltiplos times e governança por unidade.', 3, 'Avançado', 0, 'ministrado', 'consome']
    ];

    const companies: Array<[string, string, string, string, number, string, string, string, string, string, number]> = [
      ['comp-01', 'Metal Forte', 'Ativo', 'Planta industrial com 42 usuários, implantação crítica e diretoria acompanhando SLA.', 95, 'Critica', 'Roberta Campos', '+55 19 99123-7700', 'roberta.campos@metalforte.ind.br', 'Hibrida', 0],
      ['comp-02', 'Grupo Aurora', 'Ativo', 'Rede varejista em rollout para 8 unidades, precisa de agenda por filial e portal ativo.', 88, 'Alta', 'Helena Mourão', '+55 11 98841-1200', 'helena.mourao@grupoaurora.com.br', 'Hibrida', 0],
      ['comp-03', 'NorteLog', 'Ativo', 'Operador logístico com implantação em duas filiais e risco alto de conflito de técnicos.', 82, 'Alta', 'Vanessa Farias', '+55 92 99102-2801', 'vanessa.farias@nortelog.com.br', 'Presencial', 0],
      ['comp-04', 'Conecta Saúde', 'Ativo', 'Healthtech validando portal, certificados e chamados para hospitais parceiros.', 74, 'Alta', 'Mônica Barcelos', '+55 51 99144-5550', 'monica.barcelos@conectasaude.com.br', 'Online', 0],
      ['comp-05', 'Zenith Educação', 'Em_treinamento', 'Implantação com turmas corporativas, participantes e certificados por módulo.', 66, 'Normal', 'Mariana Seabra', '+55 81 99190-1122', 'mariana.seabra@zenitheducacao.com.br', 'Online', 0],
      ['comp-06', 'Atlas Contabilidade', 'Ativo', 'Conta madura em expansão, foco em licenças e suporte recorrente.', 58, 'Normal', 'Sofia Mendes', '+55 21 99140-2203', 'sofia.mendes@atlascontabil.com.br', 'Online', 0],
      ['comp-07', 'Estúdio Maralto', 'Em_treinamento', 'Cliente pequeno, ótimo para demonstrar implantação rápida e comunicação simples.', 44, 'Normal', 'Lívia Ramos', '+55 48 99111-1910', 'livia@maralto.studio', 'Online', 0],
      ['comp-08', 'Flor de Sal Alimentos', 'Ativo', 'Expansão comercial com necessidade de agenda e handoff entre consultores.', 39, 'Normal', 'Isadora Gomes', '+55 85 99907-4433', 'isadora.gomes@flordesal.com.br', 'Hibrida', 0],
      ['comp-09', 'Casa Riviera', 'Pausado', 'Conta aguardando janela de retomada, mantendo portal e chamados em observação.', 22, 'Baixa', 'Bianca Teixeira', '+55 13 99606-8800', 'bianca@casariviera.com.br', 'Online', 0],
      ['comp-10', 'Omnix Tech', 'Ativo', 'Conta estratégica de RevOps com agenda avançada e expansão multiunidade em avaliação.', 91, 'Critica', 'Tatiane Freitas', '+55 11 99612-9200', 'tatiane.freitas@omnixtech.com.br', 'Hibrida', 0]
    ];

    const techs: Array<[string, string, string, number, string]> = [
      ['tech-01', 'Carlos Lima', 'Manhã reservada para implantação presencial; tarde para suporte remoto.', 185, '#2563eb'],
      ['tech-02', 'Ana Souza', 'Especialista em agenda, portal e governança de clientes estratégicos.', 220, '#16a34a'],
      ['tech-03', 'Paulo Reis', 'Consultor sênior para diagnóstico, rollout e recuperação de contas críticas.', 260, '#b45309'],
      ['tech-04', 'Marina Telles', 'Foco em suporte, certificados, portal e comunicação com usuários finais.', 175, '#be185d'],
      ['tech-05', 'Igor Nascimento', 'Especialista em licenças, dados, integração e conferência operacional.', 210, '#7c3aed'],
      ['tech-06', 'Bruna Carvalho', 'Boa disponibilidade para treinamentos online e turmas de adoção.', 160, '#0891b2'],
      ['tech-07', 'Renan Oliveira', 'Backup técnico para campo, filiais e visitas de urgência.', 195, '#dc2626']
    ];

    const insertModule = db.prepare(
      'insert into module_template (id, code, category, name, description, duration_days, profile, is_mandatory, delivery_mode, client_hours_policy) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    modules.forEach((m) => insertModule.run(...m));

    const insertCompany = db.prepare(`
      insert into company (
        id, name, status, notes, priority, priority_level, contact_name, contact_phone, contact_email, modality, is_third_party
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    companies.forEach((c) => insertCompany.run(...c));

    const insertTech = db.prepare('insert into technician (id, name, availability_notes, hourly_cost, calendar_color) values (?, ?, ?, ?, ?)');
    techs.forEach((t) => insertTech.run(...t));

    const insertSkill = db.prepare('insert into technician_skill (technician_id, module_id) values (?, ?)');
    [
      ['tech-01', ['mod-01', 'mod-02', 'mod-03', 'mod-05']],
      ['tech-02', ['mod-01', 'mod-03', 'mod-04', 'mod-08', 'mod-09']],
      ['tech-03', ['mod-01', 'mod-02', 'mod-07', 'mod-09']],
      ['tech-04', ['mod-04', 'mod-05', 'mod-08']],
      ['tech-05', ['mod-02', 'mod-06', 'mod-07']],
      ['tech-06', ['mod-01', 'mod-03', 'mod-04']],
      ['tech-07', ['mod-02', 'mod-05', 'mod-09']]
    ].forEach(([technicianId, moduleIds]) => {
      (moduleIds as string[]).forEach((moduleId) => insertSkill.run(technicianId, moduleId));
    });

    const progress = db.prepare(`
      insert into company_module_progress (
        id, company_id, module_id, status, notes, completed_at, custom_duration_days, custom_units
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const progressRows: Array<[string, string, string, string, string, string | null, number | null, number | null]> = [
      ['prog-01-01', 'comp-01', 'mod-01', 'Concluido', 'Diagnóstico executivo validado pela Roberta.', date(-28), null, null],
      ['prog-01-02', 'comp-01', 'mod-02', 'Concluido', 'Ambiente liberado para 42 usuários.', date(-21), null, null],
      ['prog-01-03', 'comp-01', 'mod-03', 'Em_execucao', 'Agenda de chão de fábrica em revisão.', null, 3, null],
      ['prog-01-04', 'comp-01', 'mod-04', 'Planejado', 'Portal precisa sair antes da próxima visita.', null, null, null],
      ['prog-02-01', 'comp-02', 'mod-01', 'Concluido', 'Mapa de unidades fechado.', date(-16), null, null],
      ['prog-02-02', 'comp-02', 'mod-02', 'Em_execucao', 'Configuração por filial em andamento.', null, null, null],
      ['prog-02-03', 'comp-02', 'mod-03', 'Planejado', 'Distribuir agenda por gerente regional.', null, null, null],
      ['prog-03-01', 'comp-03', 'mod-01', 'Concluido', 'Diagnóstico das filiais Manaus e Belém concluído.', date(-12), null, null],
      ['prog-03-02', 'comp-03', 'mod-02', 'Em_execucao', 'Pendência de acesso para unidade Belém.', null, null, null],
      ['prog-03-05', 'comp-03', 'mod-05', 'Planejado', 'Suporte precisa de SLA por filial.', null, null, null],
      ['prog-04-01', 'comp-04', 'mod-01', 'Concluido', 'Jornada hospitalar mapeada.', date(-18), null, null],
      ['prog-04-04', 'comp-04', 'mod-04', 'Em_execucao', 'Portal em homologação com três hospitais.', null, null, null],
      ['prog-04-08', 'comp-04', 'mod-08', 'Planejado', 'Relatório para diretoria na próxima semana.', null, null, null],
      ['prog-05-01', 'comp-05', 'mod-01', 'Concluido', 'Turmas corporativas priorizadas.', date(-10), null, null],
      ['prog-05-03', 'comp-05', 'mod-03', 'Em_execucao', 'Agenda de instrutores sendo conciliada.', null, null, null],
      ['prog-06-01', 'comp-06', 'mod-01', 'Concluido', 'Conta madura, fase de expansão.', date(-45), null, null],
      ['prog-06-06', 'comp-06', 'mod-06', 'Em_execucao', 'Licenças em revisão de renovação.', null, null, null],
      ['prog-07-01', 'comp-07', 'mod-01', 'Concluido', 'Implantação rápida validada.', date(-6), null, null],
      ['prog-07-02', 'comp-07', 'mod-02', 'Planejado', 'Configuração começará amanhã.', null, null, null],
      ['prog-08-01', 'comp-08', 'mod-01', 'Concluido', 'Fluxo comercial distribuidores mapeado.', date(-9), null, null],
      ['prog-08-03', 'comp-08', 'mod-03', 'Planejado', 'Agenda híbrida para equipe comercial.', null, null, null],
      ['prog-10-01', 'comp-10', 'mod-01', 'Concluido', 'RevOps e CS mapeados.', date(-14), null, null],
      ['prog-10-07', 'comp-10', 'mod-07', 'Em_execucao', 'Automação de rotinas críticas em teste.', null, null, null],
      ['prog-10-09', 'comp-10', 'mod-09', 'Planejado', 'Expansão para CS aguardando sponsor.', null, null, null]
    ];
    progressRows.forEach((row) => progress.run(...row));

    const activation = db.prepare(
      'insert or ignore into company_module_activation (company_id, module_id, is_enabled) values (?, ?, ?)'
    );
    companies.forEach((company) => modules.forEach((module) => activation.run(company[0], module[0], company[0] === 'comp-09' && module[0] === 'mod-09' ? 0 : 1)));

    const insertProgram = db.prepare(`
      insert or replace into license_program (id, name, topsolid_kind, topsolid_code, notes, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['lpr-velio-core', 'Velio Core', 'suite', 'VEL-CORE', 'Agenda, clientes, turmas e implantação.'],
      ['lpr-velio-portal', 'Velio Portal', 'addon', 'VEL-PORTAL', 'Portal do cliente, chamados e certificados.'],
      ['lpr-velio-field', 'Velio Field Ops', 'addon', 'VEL-FIELD', 'Rotina de campo e visitas presenciais.'],
      ['lpr-topsolid-cad', 'TopSolid CAD', 'cad', 'TOP-CAD', 'Licença técnica controlada pelo Velio.'],
      ['lpr-topsolid-cam', 'TopSolid CAM', 'cam', 'TOP-CAM', 'Licença CAM com renovação operacional.']
    ].forEach((row) => insertProgram.run(...row, createdAt, createdAt));

    const insertLicense = db.prepare(`
      insert into company_license (
        id, company_id, name, program_id, user_name, module_list, license_identifier,
        renewal_cycle, expires_at, notes, last_renewed_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['lic-01', 'comp-01', 'Velio Core Enterprise', 'lpr-velio-core', 'Roberta Campos', 'Agenda; Implantação; Suporte', 'VEL-CORE-MF-042', 'Anual', date(42), 'Renovação com risco comercial se portal atrasar.', date(-323)],
      ['lic-02', 'comp-01', 'TopSolid CAM - Usinagem', 'lpr-topsolid-cam', 'André Vasconcelos', 'CAM; Pós-processador', 'TOP-CAM-MF-009', 'Mensal', date(8), 'Renovar antes da visita presencial.', date(-22)],
      ['lic-03', 'comp-02', 'Velio Portal Rede Aurora', 'lpr-velio-portal', 'Helena Mourão', 'Portal; Certificados; Chamados', 'VEL-PORT-AUR-008', 'Anual', date(74), 'Liberar oito unidades após piloto.', date(-291)],
      ['lic-04', 'comp-03', 'Velio Field Ops NorteLog', 'lpr-velio-field', 'Vanessa Farias', 'Campo; Filiais; SLA', 'VEL-FIELD-NLG-002', 'Trimestral', date(16), 'Inclui agenda de visita Manaus e Belém.', date(-72)],
      ['lic-05', 'comp-06', 'Velio Core Atlas', 'lpr-velio-core', 'Sofia Mendes', 'Agenda; Suporte', 'VEL-CORE-ATL-014', 'Mensal', date(5), 'Atenção: decisão de expansão depende dessa renovação.', date(-25)],
      ['lic-06', 'comp-10', 'Velio Automação Omnix', 'lpr-velio-core', 'Tatiane Freitas', 'Automação; Expansão; CS', 'VEL-AUTO-OMX-001', 'Anual', date(118), 'Conta estratégica para case executivo.', date(-247)]
    ].forEach((row) => insertLicense.run(...row, createdAt, createdAt));

    const cohorts = db.prepare(
      'insert into cohort (id, code, name, start_date, technician_id, status, capacity_companies, period, start_time, end_time, delivery_mode, notes) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const cohortRows: Array<[string, string, string, string, string, string, number, string, string, string, string, string]> = [
      ['coh-01', 'VEL-241', 'Metal Forte - agenda e chão de fábrica', date(-2), 'tech-03', 'Confirmada', 4, 'Integral', '09:00', '17:00', 'Presencial', 'Semana crítica com diretoria acompanhando adoção.'],
      ['coh-02', 'VEL-242', 'Aurora - rollout de unidades', date(1), 'tech-02', 'Confirmada', 6, 'Meio_periodo', '09:00', '12:30', 'Hibrida', 'Piloto com unidade matriz e duas filiais.'],
      ['coh-03', 'VEL-243', 'NorteLog - implantação em filiais', date(3), 'tech-07', 'Planejada', 5, 'Integral', '10:00', '16:00', 'Presencial', 'Confirmar deslocamento e acesso da unidade Belém.'],
      ['coh-04', 'VEL-244', 'Conecta Saúde - portal hospitalar', date(5), 'tech-04', 'Confirmada', 8, 'Meio_periodo', '14:00', '17:00', 'Online', 'Homologação com usuários finais e evidências.'],
      ['coh-05', 'VEL-245', 'Zenith - certificados e turmas', date(8), 'tech-06', 'Planejada', 10, 'Meio_periodo', '09:30', '12:30', 'Online', 'Turma grande para demonstrar participantes e certificados.'],
      ['coh-06', 'VEL-246', 'Atlas - governança de licenças', date(10), 'tech-05', 'Planejada', 3, 'Meio_periodo', '15:00', '18:00', 'Online', 'Renovação próxima com sponsor financeiro.'],
      ['coh-07', 'VEL-247', 'Omnix - automações RevOps', date(12), 'tech-03', 'Planejada', 4, 'Integral', '09:00', '17:00', 'Hibrida', 'Conta estratégica para expansão.'],
      ['coh-08', 'VEL-238', 'Estúdio Maralto - implantação expressa', date(-7), 'tech-04', 'Concluida', 2, 'Meio_periodo', '10:00', '12:00', 'Online', 'Entrega rápida já concluída, bom exemplo de certificado.']
    ];
    cohortRows.forEach((row) => cohorts.run(...row));

    const blocks = db.prepare(
      'insert into cohort_module_block (id, cohort_id, module_id, order_in_cohort, start_day_offset, duration_days) values (?, ?, ?, ?, ?, ?)'
    );
    [
      ['blk-01', 'coh-01', 'mod-03', 1, 0, 2],
      ['blk-02', 'coh-01', 'mod-05', 2, 2, 1],
      ['blk-03', 'coh-02', 'mod-02', 1, 0, 2],
      ['blk-04', 'coh-02', 'mod-03', 2, 2, 2],
      ['blk-05', 'coh-03', 'mod-02', 1, 0, 2],
      ['blk-06', 'coh-03', 'mod-09', 2, 2, 3],
      ['blk-07', 'coh-04', 'mod-04', 1, 0, 1],
      ['blk-08', 'coh-04', 'mod-08', 2, 1, 1],
      ['blk-09', 'coh-05', 'mod-03', 1, 0, 2],
      ['blk-10', 'coh-05', 'mod-04', 2, 2, 1],
      ['blk-11', 'coh-06', 'mod-06', 1, 0, 1],
      ['blk-12', 'coh-07', 'mod-07', 1, 0, 2],
      ['blk-13', 'coh-07', 'mod-09', 2, 2, 3],
      ['blk-14', 'coh-08', 'mod-02', 1, 0, 1],
      ['blk-15', 'coh-08', 'mod-08', 2, 1, 1]
    ].forEach((row) => blocks.run(...row));

    const scheduleDay = db.prepare('insert into cohort_schedule_day (id, cohort_id, day_index, day_date, start_time, end_time) values (?, ?, ?, ?, ?, ?)');
    cohortRows.forEach((cohort) => {
      const blockCount = cohort[0] === 'coh-07' ? 5 : cohort[0] === 'coh-03' ? 5 : cohort[0] === 'coh-08' ? 2 : 3;
      for (let index = 0; index < blockCount; index += 1) {
        scheduleDay.run(`sch-${cohort[0]}-${index + 1}`, cohort[0], index + 1, getDateOffsetIso(cohort[3], index), cohort[8], cohort[9]);
      }
    });

    const allocations = db.prepare(
      'insert into cohort_allocation (id, cohort_id, company_id, module_id, entry_day, status, notes, override_installation_prereq, override_reason, executed_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    [
      ['all-01', 'coh-01', 'comp-01', 'mod-03', 1, 'Confirmado', 'Diretoria estará presente no primeiro bloco.', 0, null, null],
      ['all-02', 'coh-01', 'comp-01', 'mod-05', 3, 'Previsto', 'SLA de suporte entra depois da agenda.', 0, null, null],
      ['all-03', 'coh-02', 'comp-02', 'mod-02', 1, 'Confirmado', 'Unidade matriz participa como piloto.', 0, null, null],
      ['all-04', 'coh-02', 'comp-02', 'mod-03', 3, 'Previsto', 'Aguardando grade de gerentes regionais.', 0, null, null],
      ['all-05', 'coh-03', 'comp-03', 'mod-02', 1, 'Previsto', 'Acesso Belém ainda pendente.', 1, 'Sponsor liberou exceção para não travar campo.', null],
      ['all-06', 'coh-03', 'comp-03', 'mod-09', 3, 'Previsto', 'Expansão multiunidade após implantação.', 0, null, null],
      ['all-07', 'coh-04', 'comp-04', 'mod-04', 1, 'Confirmado', 'Portal será homologado com três hospitais.', 0, null, null],
      ['all-08', 'coh-04', 'comp-04', 'mod-08', 2, 'Previsto', 'Relatório executivo para diretoria.', 0, null, null],
      ['all-09', 'coh-05', 'comp-05', 'mod-03', 1, 'Previsto', 'Conciliar agenda de instrutores.', 0, null, null],
      ['all-10', 'coh-05', 'comp-05', 'mod-04', 3, 'Previsto', 'Certificados por turma corporativa.', 0, null, null],
      ['all-11', 'coh-06', 'comp-06', 'mod-06', 1, 'Confirmado', 'Renovação vence em poucos dias.', 0, null, null],
      ['all-12', 'coh-07', 'comp-10', 'mod-07', 1, 'Previsto', 'Automação em teste com RevOps.', 0, null, null],
      ['all-13', 'coh-07', 'comp-10', 'mod-09', 3, 'Previsto', 'CS entra no segundo bloco.', 0, null, null],
      ['all-14', 'coh-08', 'comp-07', 'mod-02', 1, 'Executado', 'Ambiente configurado em um dia.', 0, null, date(-6)],
      ['all-15', 'coh-08', 'comp-07', 'mod-08', 2, 'Executado', 'Relatório entregue no portal.', 0, null, date(-5)]
    ].forEach((row) => allocations.run(...row));

    const insertParticipant = db.prepare('insert into cohort_participant (id, cohort_id, company_id, participant_name, created_at) values (?, ?, ?, ?, ?)');
    const insertParticipantModule = db.prepare('insert into cohort_participant_module (participant_id, module_id) values (?, ?)');
    const participantRows = [
      ['part-01', 'coh-01', 'comp-01', 'Roberta Campos', ['mod-03', 'mod-05']],
      ['part-02', 'coh-01', 'comp-01', 'André Vasconcelos', ['mod-03', 'mod-05']],
      ['part-03', 'coh-02', 'comp-02', 'Helena Mourão', ['mod-02', 'mod-03']],
      ['part-04', 'coh-02', 'comp-02', 'Caio Braga', ['mod-02', 'mod-03']],
      ['part-05', 'coh-03', 'comp-03', 'Vanessa Farias', ['mod-02', 'mod-09']],
      ['part-06', 'coh-03', 'comp-03', 'Otávio Leal', ['mod-02', 'mod-09']],
      ['part-07', 'coh-04', 'comp-04', 'Mônica Barcelos', ['mod-04', 'mod-08']],
      ['part-08', 'coh-05', 'comp-05', 'Mariana Seabra', ['mod-03', 'mod-04']],
      ['part-09', 'coh-07', 'comp-10', 'Tatiane Freitas', ['mod-07', 'mod-09']],
      ['part-10', 'coh-07', 'comp-10', 'Leandro Cunha', ['mod-07', 'mod-09']]
    ] as const;
    participantRows.forEach(([id, cohortId, companyId, name, moduleIds]) => {
      insertParticipant.run(id, cohortId, companyId, name, createdAt);
      moduleIds.forEach((moduleId) => insertParticipantModule.run(id, moduleId));
    });

    const insertOptional = db.prepare('insert into optional_module (id, code, category, name, duration_days, profile, notes) values (?, ?, ?, ?, ?, ?, ?)');
    [
      ['opt-01', 'OPT-SLA', 'Suporte', 'Auditoria de SLA', 1, 'Executivo', 'Revisão semanal de tickets críticos.'],
      ['opt-02', 'OPT-DADOS', 'Dados', 'Higienização de base', 2, 'Operacional', 'Padronização de clientes, contatos e licenças.'],
      ['opt-03', 'OPT-CAMPO', 'Campo', 'Checklist de visita presencial', 1, 'Campo', 'Roteiro para técnicos externos.']
    ].forEach((row) => insertOptional.run(...row));

    const optionalProgress = db.prepare('insert into company_optional_progress (id, company_id, optional_module_id, status, notes) values (?, ?, ?, ?, ?)');
    [
      ['oprog-01', 'comp-01', 'opt-01', 'Em_execucao', 'SLA crítico na implantação da Metal Forte.'],
      ['oprog-02', 'comp-03', 'opt-03', 'Planejado', 'Visita de campo NorteLog precisa de checklist.'],
      ['oprog-03', 'comp-10', 'opt-02', 'Planejado', 'Omnix quer sanear dados antes da expansão.']
    ].forEach((row) => optionalProgress.run(...row));

    const prereq = db.prepare(
      'insert or ignore into module_prerequisite (module_id, prerequisite_module_id) values (?, ?)'
    );
    [
      ['mod-02', 'mod-01'],
      ['mod-03', 'mod-02'],
      ['mod-04', 'mod-02'],
      ['mod-05', 'mod-04'],
      ['mod-06', 'mod-02'],
      ['mod-07', 'mod-03'],
      ['mod-08', 'mod-04'],
      ['mod-09', 'mod-07']
    ].forEach((row) => prereq.run(...row));

    const insertActivity = db.prepare(`
      insert into calendar_activity (
        id, title, activity_type, start_date, end_date, selected_dates, linked_module_id, hours_scope,
        all_day, start_time, end_time, technician_id, company_id, status, notes, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertActivityTech = db.prepare('insert into calendar_activity_technician (activity_id, technician_id) values (?, ?)');
    const insertActivityDay = db.prepare('insert into calendar_activity_day (activity_id, day_date, all_day, start_time, end_time) values (?, ?, ?, ?, ?)');
    const activities = [
      ['act-01', 'War room Metal Forte - agenda chão de fábrica', 'Implementacao', date(0), date(0), 'mod-03', 'cohort', 0, '09:00', '12:00', 'tech-03', 'comp-01', 'Em_andamento', 'Revisar conflitos de turno e aprovar agenda da semana.', ['tech-03', 'tech-07']],
      ['act-02', 'Visita NorteLog Manaus - liberação de acessos', 'Visita_cliente', date(1), date(1), 'mod-02', 'cohort', 0, '10:00', '16:00', 'tech-07', 'comp-03', 'Planejada', 'Levar checklist de campo e confirmar acesso Belém.', ['tech-07']],
      ['act-03', 'Homologação portal Conecta Saúde', 'Implementacao', date(2), date(2), 'mod-04', 'cohort', 0, '14:00', '17:00', 'tech-04', 'comp-04', 'Planejada', 'Validar agenda externa e chamados com três hospitais.', ['tech-04']],
      ['act-04', 'Comitê executivo Grupo Aurora', 'Reuniao', date(3), date(3), 'mod-08', 'none', 0, '09:00', '10:30', 'tech-02', 'comp-02', 'Planejada', 'Apresentar plano de rollout para oito unidades.', ['tech-02', 'tech-03']],
      ['act-05', 'Plantão de suporte Atlas', 'Suporte', date(0), date(0), 'mod-06', 'none', 0, '15:00', '18:00', 'tech-05', 'comp-06', 'Planejada', 'Renovação próxima e dúvidas de licenças.', ['tech-05']],
      ['act-06', 'Treinamento Zenith - certificados', 'Implementacao', date(5), date(5), 'mod-04', 'cohort', 0, '09:30', '12:30', 'tech-06', 'comp-05', 'Planejada', 'Turma grande com participantes e emissão de certificados.', ['tech-06']],
      ['act-07', 'Pré-vendas Omnix - expansão CS', 'Pre_vendas', date(6), date(6), 'mod-09', 'none', 0, '11:00', '12:00', 'tech-03', 'comp-10', 'Planejada', 'Mapear expansão para time de customer success.', ['tech-03']],
      ['act-08', 'Fechamento Maralto - entrega executiva', 'Pos_vendas', date(-1), date(-1), 'mod-08', 'none', 0, '16:00', '17:00', 'tech-04', 'comp-07', 'Concluida', 'Entrega final e próximos passos enviados ao portal.', ['tech-04']]
    ] as const;
    activities.forEach((row) => {
      const [id, title, type, startDate, endDate, moduleId, hoursScope, allDay, startTime, endTime, techId, companyId, status, notes, techIds] = row;
      insertActivity.run(id, title, type, startDate, endDate, JSON.stringify([startDate]), moduleId, hoursScope, allDay, startTime, endTime, techId, companyId, status, notes, createdAt, createdAt);
      insertActivityDay.run(id, startDate, allDay, startTime, endTime);
      techIds.forEach((technicianId) => insertActivityTech.run(id, technicianId));
    });

    const insertWorkspace = db.prepare('insert into planning_workspace (id, name, status, mode, horizon_days, notes, created_at, updated_at, published_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertWorkspace.run('plan-01', 'Plano executivo junho - clientes críticos', 'Rascunho', 'Assistido', 45, 'Reorganizar capacidade da equipe para Metal Forte, NorteLog, Aurora e Omnix.', createdAt, createdAt, null);
    insertWorkspace.run('plan-02', 'Agenda publicada Q3 - expansão', 'Publicado', 'Manual', 60, 'Planejamento publicado para contas em expansão e pós-venda.', createdAt, createdAt, date(-2));

    const insertWorkspaceClient = db.prepare('insert into planning_workspace_client (workspace_id, company_id, priority, created_at) values (?, ?, ?, ?)');
    [
      ['plan-01', 'comp-01', 100],
      ['plan-01', 'comp-03', 90],
      ['plan-01', 'comp-02', 85],
      ['plan-01', 'comp-10', 80],
      ['plan-02', 'comp-04', 70],
      ['plan-02', 'comp-05', 65],
      ['plan-02', 'comp-06', 60]
    ].forEach((row) => insertWorkspaceClient.run(...row, createdAt));

    const insertPlanningCohort = db.prepare(`
      insert into planning_cohort (
        id, workspace_id, company_id, module_id, technician_id, published_cohort_id,
        name, status, delivery_mode, period, notes, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['pcoh-01', 'plan-01', 'comp-01', 'mod-03', 'tech-03', null, 'Metal Forte - capacidade crítica', 'Rascunho', 'Presencial', 'Integral', 'Precisa evitar conflito com suporte Atlas.'],
      ['pcoh-02', 'plan-01', 'comp-03', 'mod-09', 'tech-07', null, 'NorteLog - filiais e campo', 'Rascunho', 'Presencial', 'Integral', 'Deslocamento em Manaus e Belém.'],
      ['pcoh-03', 'plan-01', 'comp-10', 'mod-07', 'tech-03', null, 'Omnix - automação RevOps', 'Rascunho', 'Hibrida', 'Integral', 'Conta estratégica com sponsor executivo.'],
      ['pcoh-04', 'plan-02', 'comp-04', 'mod-04', 'tech-04', 'coh-04', 'Conecta Saúde - portal', 'Publicado', 'Online', 'Meio_periodo', 'Já refletido na agenda.']
    ].forEach((row) => insertPlanningCohort.run(...row, createdAt, createdAt));

    const insertEncounter = db.prepare(`
      insert into planning_encounter (
        id, workspace_id, planning_cohort_id, company_id, module_id, technician_id,
        encounter_index, day_date, start_time, end_time, status, notes, published_cohort_id, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['penc-01', 'plan-01', 'pcoh-01', 'comp-01', 'mod-03', 'tech-03', 1, date(2), '09:00', '12:00', 'Rascunho', 'Bloco de agenda com diretoria.', null],
      ['penc-02', 'plan-01', 'pcoh-01', 'comp-01', 'mod-03', 'tech-03', 2, date(3), '09:00', '12:00', 'Rascunho', 'Ajustar turnos da fábrica.', null],
      ['penc-03', 'plan-01', 'pcoh-02', 'comp-03', 'mod-09', 'tech-07', 1, date(4), '10:00', '16:00', 'Rascunho', 'Visita Manaus.', null],
      ['penc-04', 'plan-01', 'pcoh-02', 'comp-03', 'mod-09', 'tech-07', 2, date(5), '10:00', '16:00', 'Rascunho', 'Checklist Belém.', null],
      ['penc-05', 'plan-01', 'pcoh-03', 'comp-10', 'mod-07', 'tech-03', 1, date(6), '09:00', '17:00', 'Rascunho', 'Rotinas de automação.', null],
      ['penc-06', 'plan-02', 'pcoh-04', 'comp-04', 'mod-04', 'tech-04', 1, date(2), '14:00', '17:00', 'Publicado', 'Portal em homologação.', 'coh-04']
    ].forEach((row) => insertEncounter.run(...row, createdAt, createdAt));

    const insertVersion = db.prepare('insert into planning_version (id, workspace_id, version_number, action, summary_json, created_at) values (?, ?, ?, ?, ?, ?)');
    insertVersion.run('pver-01', 'plan-01', 1, 'created', JSON.stringify({ summary: 'Plano criado com quatro clientes críticos e seis encontros sugeridos.' }), createdAt);
    insertVersion.run('pver-02', 'plan-02', 1, 'published', JSON.stringify({ summary: 'Agenda Q3 publicada para portal e calendário.' }), createdAt);

    const insertColumn = db.prepare('insert or replace into implementation_kanban_column (id, title, color, position, created_at, updated_at) values (?, ?, ?, ?, ?, ?)');
    [
      ['kcol-triage', 'Triagem', '#64748b', 0],
      ['kcol-risk', 'Risco / bloqueio', '#dc2626', 1],
      ['kcol-doing', 'Em execução', '#b17613', 2],
      ['kcol-waiting', 'Aguardando cliente', '#2563eb', 3],
      ['kcol-done', 'Concluído', '#1c8b61', 4]
    ].forEach((row) => insertColumn.run(...row, createdAt, createdAt));

    const insertCard = db.prepare(`
      insert into implementation_kanban_card (
        id, title, description, status, column_id, client_name, license_name, module_name, technician_id,
        subcategory, support_resolution, support_third_party_notes, support_handoff_target, support_handoff_date,
        priority, due_date, position, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['card-01', 'Metal Forte: conflito de agenda no turno B', 'Há sobreposição entre treinamento de agenda e parada programada da produção.', 'Doing', 'kcol-risk', 'Metal Forte', 'Velio Core Enterprise', 'Planejamento de capacidade', 'tech-03', 'Agenda', 'Replanejar com Renan como apoio e enviar nova grade.', 'Dependência: aprovação do gerente de produção.', 'Roberta Campos', date(1), 'Critica', date(1), 10],
      ['card-02', 'NorteLog: acesso pendente unidade Belém', 'Usuários da filial Belém ainda não receberam liberação para o ambiente.', 'Todo', 'kcol-risk', 'NorteLog', 'Velio Field Ops NorteLog', 'Configuração do ambiente', 'tech-07', 'Acesso', 'Cobrar TI local e manter exceção documentada.', 'Pode exigir VPN do cliente.', 'Vanessa Farias', date(2), 'Alta', date(2), 20],
      ['card-03', 'Conecta Saúde: homologar portal com hospitais', 'Três hospitais precisam validar agenda, certificados e chamados.', 'Doing', 'kcol-doing', 'Conecta Saúde', 'Velio Portal', 'Portal do cliente', 'tech-04', 'Portal', 'Enviar roteiro de homologação e coletar aceite.', null, 'Mônica Barcelos', date(4), 'Alta', date(4), 30],
      ['card-04', 'Atlas: renovação vence em 5 dias', 'Licença mensal precisa de aceite antes da expansão da conta.', 'Todo', 'kcol-triage', 'Atlas Contabilidade', 'Velio Core Atlas', 'Governança de licenças', 'tech-05', 'Licenças', 'Enviar resumo de uso e proposta de renovação.', null, 'Sofia Mendes', date(5), 'Alta', date(5), 40],
      ['card-05', 'Aurora: preparar rollout de 8 unidades', 'Cliente quer plano executivo para matriz e filiais.', 'Doing', 'kcol-doing', 'Grupo Aurora', 'Velio Portal Rede Aurora', 'Relatório executivo', 'tech-02', 'Rollout', 'Consolidar riscos, agenda e responsáveis.', null, 'Helena Mourão', date(3), 'Normal', date(3), 50],
      ['card-06', 'Omnix: automações RevOps em validação', 'Regras de rotina semanal passam por teste com dados reais.', 'Doing', 'kcol-doing', 'Omnix Tech', 'Velio Automação Omnix', 'Rotinas e automações', 'tech-03', 'Automação', 'Validar gatilhos e preparar demo executiva.', null, 'Leandro Cunha', date(6), 'Critica', date(6), 60],
      ['card-07', 'Zenith: certificados por participante', 'Turma corporativa precisa emitir certificados por módulo.', 'Todo', 'kcol-waiting', 'Zenith Educação', null, 'Portal e certificados', 'tech-06', 'Certificados', 'Aguardar lista final de participantes.', null, 'Mariana Seabra', date(8), 'Normal', date(8), 70],
      ['card-08', 'Maralto: entrega executiva concluída', 'Relatório e próximos passos publicados no portal do cliente.', 'Done', 'kcol-done', 'Estúdio Maralto', null, 'Relatório executivo', 'tech-04', 'Entrega', 'Sem pendências.', null, 'Lívia Ramos', date(-1), 'Baixa', date(-1), 80],
      ['card-09', 'Metal Forte: supervisor sem acesso no turno B', 'Acesso bloqueado antes do war room de produção. Cliente pediu retorno em até 2 horas.', 'Todo', 'kcol-risk', 'Metal Forte', 'Velio Core Enterprise', 'Portal do cliente', 'tech-01', 'Suporte', 'Resetar credenciais, validar SSO e registrar evidência no portal.', 'Possível bloqueio por política de AD do cliente.', 'Conosco', null, 'Critica', date(0), 90],
      ['card-10', 'NorteLog: WhatsApp da filial Belém sem webhook', 'Mensagens do time de campo não estão abrindo chamado automaticamente.', 'Doing', 'kcol-doing', 'NorteLog', 'Velio Field Ops NorteLog', 'Suporte técnico e operação assistida', 'tech-07', 'Suporte', 'Reprocessar webhook, testar número da filial e orientar líder local.', 'Dependência de liberação do provedor de telefonia.', 'Sao_Paulo', date(1), 'Alta', date(1), 100],
      ['card-11', 'Conecta Saúde: certificados não aparecem para hospital parceiro', 'Hospital Santa Clara validou agenda, mas não consegue baixar certificados individuais.', 'Todo', 'kcol-waiting', 'Conecta Saúde', 'Velio Portal', 'Portal do cliente', 'tech-04', 'Suporte', 'Aguardar lista final de participantes e republicar certificados.', null, 'Conosco', null, 'Alta', date(2), 110],
      ['card-12', 'Aurora: dúvida executiva sobre rollout Campinas', 'Diretoria quer antecipar Campinas e pediu impacto em agenda, custo e equipe.', 'Todo', 'kcol-triage', 'Grupo Aurora', 'Velio Portal Rede Aurora', 'Expansão multiunidade', 'tech-02', 'Suporte', 'Responder com impacto executivo e sugestão de janela.', null, 'Conosco', null, 'Normal', date(3), 120],
      ['card-13', 'Maralto: pós-entrega com ajuste visual no relatório', 'Cliente aprovou a entrega e solicitou apenas ajuste de capa no PDF executivo.', 'Done', 'kcol-done', 'Estúdio Maralto', null, 'Relatório executivo', 'tech-04', 'Suporte', 'Ajuste aplicado e confirmação enviada.', null, 'Conosco', null, 'Baixa', date(-1), 130]
    ].forEach((row) => insertCard.run(...row, createdAt, createdAt));

    const insertPortalClient = db.prepare(`
      insert into portal_client (
        id, company_id, slug, is_active, support_intro_text,
        hidden_module_ids_json, module_date_overrides_json, module_status_overrides_json,
        module_delivery_mode_overrides_json, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['portal-01', 'comp-01', 'metal-forte', 1, 'Canal executivo da implantação Metal Forte. Priorize chamados críticos de agenda e produção.'],
      ['portal-02', 'comp-02', 'grupo-aurora', 1, 'Portal do rollout Aurora: acompanhe unidades, agenda e próximos passos.'],
      ['portal-03', 'comp-04', 'conecta-saude', 1, 'Homologação do portal hospitalar, certificados e chamados.'],
      ['portal-04', 'comp-07', 'estudio-maralto', 1, 'Entrega concluída com relatório executivo e documentação.'],
      ['portal-05', 'comp-03', 'nortelog', 1, 'Suporte de campo NorteLog: registre acessos, WhatsApp e ocorrências por filial.']
    ].forEach((row) => insertPortalClient.run(...row, '[]', '{}', '{}', '{}', createdAt, createdAt));

    const insertPortalUser = db.prepare(`
      insert into portal_user (id, portal_client_id, username, password_hash, is_active, last_login_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['puser-01', 'portal-01', 'roberta.campos', date(-1)],
      ['puser-02', 'portal-02', 'helena.mourao', date(-2)],
      ['puser-03', 'portal-03', 'monica.barcelos', null],
      ['puser-04', 'portal-04', 'livia.ramos', date(-1)],
      ['puser-05', 'portal-05', 'vanessa.farias', date(-1)]
    ].forEach((row) => insertPortalUser.run(row[0], row[1], row[2], hashInternalPasswordSeed('demo123'), 1, row[3], createdAt, createdAt));

    const insertPortalTicket = db.prepare(`
      insert into portal_ticket (
        id, company_id, portal_user_id, title, description, priority, status, origin,
        whatsapp_number, last_read_cliente_at, last_read_holand_at, kanban_card_id, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['ticket-01', 'comp-01', 'puser-01', 'Supervisor do turno B não consegue acessar', 'O supervisor está sem acesso antes do war room de produção.', 'Critica', 'Aberto', 'portal_cliente', '+55 19 99123-7700', date(-1), null, 'card-09'],
      ['ticket-02', 'comp-02', 'puser-02', 'Incluir filial Campinas no rollout', 'A diretoria pediu para antecipar Campinas no plano de unidades.', 'Alta', 'Em_atendimento', 'portal_cliente', '+55 11 98841-1200', date(-2), date(-1), 'card-12'],
      ['ticket-03', 'comp-04', 'puser-03', 'Validar certificado de homologação', 'Hospital parceiro quer visualizar certificado por participante.', 'Normal', 'Aberto', 'portal_cliente', '+55 51 99144-5550', null, null, 'card-11'],
      ['ticket-04', 'comp-07', 'puser-04', 'Entrega executiva aprovada', 'Relatório recebido e aprovado pela equipe Maralto.', 'Baixa', 'Resolvido', 'portal_cliente', '+55 48 99111-1910', date(-1), date(-1), 'card-13'],
      ['ticket-05', 'comp-03', 'puser-05', 'WhatsApp da filial Belém não abre chamado', 'Mensagens do time de campo não estão entrando no Velio.', 'Alta', 'Em_atendimento', 'portal_cliente', '+55 91 99123-4410', date(-1), null, 'card-10']
    ].forEach((row) => insertPortalTicket.run(...row, createdAt, createdAt));

    const insertPortalMessage = db.prepare('insert into portal_ticket_message (id, ticket_id, author_type, author_label, body, created_at) values (?, ?, ?, ?, ?, ?)');
    [
      ['msg-01', 'ticket-01', 'Cliente', 'Roberta Campos', 'O turno B terá manutenção extraordinária. Precisamos ajustar a agenda até amanhã.', date(-1)],
      ['msg-02', 'ticket-01', 'Holand', 'Paulo Reis', 'Recebido. Vou replanejar com apoio do Renan e enviar alternativa ainda hoje.', date(0)],
      ['msg-03', 'ticket-02', 'Cliente', 'Helena Mourão', 'Podemos incluir Campinas já no primeiro lote do rollout?', date(-2)],
      ['msg-04', 'ticket-03', 'Cliente', 'Mônica Barcelos', 'O hospital Santa Clara pediu certificado individual de homologação.', date(-1)],
      ['msg-05', 'ticket-04', 'Cliente', 'Lívia Ramos', 'Relatório ficou ótimo. Pode marcar como aprovado.', date(-1)],
      ['msg-06', 'ticket-05', 'Cliente', 'Vanessa Farias', 'O número de Belém recebe mensagem, mas nada aparece no painel de suporte.', date(-1)],
      ['msg-07', 'ticket-05', 'Holand', 'Renan Oliveira', 'Estou reprocessando o webhook e vou validar com um chamado de teste ainda nesta janela.', date(0)]
    ].forEach((row) => insertPortalMessage.run(...row));

    const insertPortalAgenda = db.prepare(`
      insert into portal_agenda_item (
        id, portal_client_id, title, activity_type, start_date, end_date, all_day,
        start_time, end_time, status, notes, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['pag-01', 'portal-01', 'War room de agenda - Metal Forte', 'Implementacao', date(0), date(0), 0, '09:00', '12:00', 'Confirmada', 'Revisão com diretoria e produção.'],
      ['pag-02', 'portal-01', 'Plantão de suporte crítico', 'Suporte', date(1), date(1), 0, '14:00', '17:00', 'Planejada', 'Canal aberto para ajustes pós-war room.'],
      ['pag-03', 'portal-02', 'Comitê executivo de rollout', 'Reuniao', date(3), date(3), 0, '09:00', '10:30', 'Planejada', 'Apresentar plano de 8 unidades.'],
      ['pag-04', 'portal-03', 'Homologação do portal hospitalar', 'Implementacao', date(2), date(2), 0, '14:00', '17:00', 'Planejada', 'Validação de agenda e certificados.'],
      ['pag-05', 'portal-04', 'Entrega executiva publicada', 'Outro', date(-1), date(-1), 1, null, null, 'Concluida', 'Relatório aprovado pelo cliente.'],
      ['pag-06', 'portal-05', 'Validação webhook Belém', 'Suporte', date(1), date(1), 0, '10:00', '11:00', 'Planejada', 'Teste assistido com líder local e equipe São Paulo.']
    ].forEach((row) => insertPortalAgenda.run(...row, createdAt, createdAt));

    const insertCandidate = db.prepare(`
      insert into recruitment_candidate (
        id, name, process_status, stage, strengths, concerns, specialties,
        equipment_notes, career_plan, notes, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['cand-01', 'Fernanda Prado', 'Em_processo', 'Teste técnico', 'Ótima comunicação com cliente e experiência em implantação B2B.', 'Precisa aprofundar rotinas de licença.', 'Portal, suporte, sucesso do cliente', 'Notebook próprio, disponibilidade remota.', 'Trilha para consultora de implantação.', 'Boa candidata para reforçar suporte e portal.', createdAt, createdAt],
      ['cand-02', 'Rafael Diniz', 'Em_processo', 'Entrevista final', 'Forte em campo, redes e atendimento presencial.', 'Agenda limitada em sextas-feiras.', 'Campo, hardware, visitas técnicas', 'Carro próprio e equipamentos de rede.', 'Trilha para técnico de campo sênior.', 'Pode cobrir NorteLog e Metal Forte.', createdAt, createdAt],
      ['cand-03', 'Camila Furtado', 'Aprovado', 'Oferta enviada', 'Perfil analítico, dados e automações.', 'Precisa onboarding do produto.', 'Automação, dados, RevOps', 'Setup remoto completo.', 'Trilha para especialista em automação.', 'Ideal para Omnix e clientes enterprise.', createdAt, createdAt],
      ['cand-04', 'João Becker', 'Pausado', 'Triagem', 'Experiência em CAD/CAM e indústria.', 'Disponibilidade só noturna.', 'Indústria, TopSolid, treinamento', 'Aguardando teste de equipamento.', 'Banco de talentos técnico.', 'Manter para demandas futuras.', createdAt, createdAt]
    ].forEach((row) => insertCandidate.run(...row));
  }

  if (shouldSeedFinanceDemoData()) {
    seedFinanceDemoData();
  }
}

export function clearAllData() {
  db.exec(`
    delete from financial_reconciliation_match;
    delete from financial_bank_statement_entry;
    delete from financial_import_job;
    delete from financial_debt;
    delete from financial_receivable;
    delete from financial_payable;
    delete from financial_transaction;
    delete from financial_entity_default_profile;
    delete from financial_entity_tag_map;
    delete from financial_entity_tag;
    delete from financial_payment_method;
    delete from financial_cost_center;
    delete from financial_category;
    delete from financial_account;
    delete from financial_entity;
    delete from portal_ticket_webhook_queue;
    delete from portal_ticket;
    delete from portal_ticket_attachment;
    delete from portal_ticket_message;
    delete from portal_agenda_item;
    delete from portal_session;
    delete from portal_user;
    delete from portal_client;
    delete from calendar_activity_day;
    delete from calendar_activity_technician;
    delete from internal_document;
    delete from calendar_activity;
    delete from implementation_kanban_card;
    delete from implementation_kanban_column;
    delete from recruitment_candidate;
    delete from company_license_module;
    delete from company_license;
    delete from license_program;
    delete from company_optional_progress;
    delete from optional_module;
    delete from company_module_activation;
    delete from cohort_participant_module;
    delete from cohort_participant;
    delete from cohort_allocation;
    delete from cohort_schedule_day;
    delete from cohort_module_block;
    delete from cohort;
    delete from technician_skill;
    delete from technician;
    delete from company_module_progress;
    delete from company;
    delete from module_prerequisite;
    delete from module_template;
  `);
}

export function nowDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uuid(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 10);
}
