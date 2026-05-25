# Financeiro Conciliação OFX Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an OFX import assistant that previews intelligent reconciliation decisions, lets the user approve a batch, creates settled transactions when needed, and learns approved patterns for future OFX files.

**Architecture:** Add focused backend modules beside the existing finance service: OFX parsing, draft building, memory lookup, and transactional batch approval. Preserve the current reconciliation inbox and tables, while adding draft/approval endpoints that ultimately write to `financial_import_job`, `financial_bank_statement_entry`, `financial_reconciliation_match`, `financial_transaction`, payables/receivables, memory, and audit tables. Add a frontend modal on `FinanceReconciliationPage` for upload, grouped review, and batch approval.

**Tech Stack:** TypeScript, Node `tsx --test`, Express, Zod, better-sqlite3, React 18, Vite, Vitest, Testing Library.

---

## File Structure

Create:

- `apps/backend/src/finance/ofxParser.ts` - Parse OFX text into normalized statement lines.
- `apps/backend/src/finance/ofxParser.test.ts` - Parser unit tests.
- `apps/backend/src/finance/reconciliationDraft.ts` - Build draft decisions and confidence explanations.
- `apps/backend/src/finance/reconciliationDraft.test.ts` - Engine unit tests for priority and memory.
- `apps/frontend/src/finance/components/FinanceOfxImportModal.tsx` - Upload/review/approve modal.
- `apps/frontend/src/finance/__tests__/FinanceOfxImportModal.test.tsx` - Modal tests.

Modify:

- `apps/backend/src/db.ts` - Add import hashes, statement dedupe hash, reconciliation memory table, and batch audit table.
- `apps/backend/src/finance/types.ts` - Add OFX preview, draft item, approval, memory, and response DTOs.
- `apps/backend/src/finance/service.ts` - Add draft preview, batch approval, memory persistence, and dedupe helpers.
- `apps/backend/src/finance/routes.ts` - Add `POST /finance/reconciliation/ofx/preview` and `POST /finance/reconciliation/ofx/approve`.
- `apps/backend/src/finance/finance.test.ts` - Add route/integration tests for preview, approval, dedupe, and memory.
- `apps/frontend/src/finance/api.ts` - Add DTOs and API methods for OFX preview/approval.
- `apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx` - Add import button, modal state, and refresh after approval.
- `apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx` - Cover modal opening and successful approval refresh.

Do not modify the existing unrelated dirty files listed by `git status` unless the implementation task explicitly needs them.

---

### Task 1: Database Schema and DTO Contracts

**Files:**
- Modify: `apps/backend/src/db.ts`
- Modify: `apps/backend/src/finance/types.ts`
- Test: `apps/backend/src/finance/finance.test.ts`

- [ ] **Step 1: Write the failing schema test**

Append this test near the existing database schema tests in `apps/backend/src/finance/finance.test.ts`:

```ts
test('initDb cria estruturas para conciliacao OFX em lote e memoria', async () => {
  const dbPath = assignTestDbPath('finance-ofx-reconciliation-schema');
  cleanupDbFiles(dbPath);
  resetDbConnection();

  try {
    initDb();

    const importJobColumns = db.prepare('pragma table_info(financial_import_job)').all() as Array<{ name: string }>;
    assert.ok(importJobColumns.some((column) => column.name === 'source_file_hash'), 'financial_import_job.source_file_hash ausente');

    const statementColumns = db.prepare('pragma table_info(financial_bank_statement_entry)').all() as Array<{ name: string }>;
    assert.ok(statementColumns.some((column) => column.name === 'dedupe_hash'), 'financial_bank_statement_entry.dedupe_hash ausente');

    const memoryTable = db.prepare(
      "select name from sqlite_master where type = 'table' and name = ?"
    ).get('financial_reconciliation_memory') as { name: string } | undefined;
    assert.ok(memoryTable, 'financial_reconciliation_memory ausente');

    const batchTable = db.prepare(
      "select name from sqlite_master where type = 'table' and name = ?"
    ).get('financial_reconciliation_batch') as { name: string } | undefined;
    assert.ok(batchTable, 'financial_reconciliation_batch ausente');

    assertCompositeUniqueIndex('financial_reconciliation_memory', [
      'organization_id',
      'financial_account_id',
      'normalized_pattern',
      'direction'
    ]);
  } finally {
    db.close();
    cleanupDbFiles(dbPath);
  }
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
npm --workspace apps/backend test -- --test-name-pattern "conciliacao OFX em lote"
```

Expected: FAIL because the new columns/tables do not exist.

- [ ] **Step 3: Add database structures**

In `apps/backend/src/db.ts`, extend the `financial_import_job` table definition with:

```sql
source_file_hash text,
```

Extend `financial_bank_statement_entry` with:

```sql
dedupe_hash text,
```

Add these tables after `financial_reconciliation_match`:

```sql
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
```

In the migration/ensure-column section of `initDb`, add:

```ts
ensureColumn('financial_import_job', 'source_file_hash', 'source_file_hash text');
ensureColumn('financial_bank_statement_entry', 'dedupe_hash', 'dedupe_hash text');
```

After creating tables, add indexes:

```ts
db.exec(`
  create index if not exists idx_financial_statement_dedupe
    on financial_bank_statement_entry(organization_id, financial_account_id, dedupe_hash);
  create index if not exists idx_financial_reconciliation_batch_job
    on financial_reconciliation_batch(organization_id, financial_import_job_id);
`);
```

- [ ] **Step 4: Add backend DTOs**

In `apps/backend/src/finance/types.ts`, after `FinanceStatementTransactionResultDto`, add:

```ts
export type FinanceOfxLineDto = {
  id: string;
  statement_date: string;
  posted_at: string | null;
  amount_cents: number;
  description: string;
  normalized_description: string;
  reference_code: string | null;
  balance_cents: number | null;
  dedupe_hash: string;
};

export type FinanceReconciliationDraftDecisionType =
  | 'payable_match'
  | 'receivable_match'
  | 'ledger_match'
  | 'new_transaction'
  | 'needs_review'
  | 'duplicate'
  | 'invalid';

export type FinanceReconciliationDraftItemDto = {
  id: string;
  line: FinanceOfxLineDto;
  decision_type: FinanceReconciliationDraftDecisionType;
  confidence_score: number;
  confidence_band: 'auto' | 'ready' | 'review' | 'blocked';
  reasons: FinanceReconciliationSuggestionReasonDto[];
  target: {
    payable_id?: string | null;
    receivable_id?: string | null;
    financial_transaction_id?: string | null;
  };
  proposed: {
    financial_entity_id: string | null;
    financial_entity_name: string | null;
    financial_category_id: string | null;
    financial_category_name: string | null;
    financial_cost_center_id: string | null;
    financial_cost_center_name: string | null;
    financial_payment_method_id: string | null;
    financial_payment_method_name: string | null;
    financial_account_id: string;
    note: string;
    save_memory: boolean;
  };
  blocking_reason: string | null;
};

export type FinanceOfxPreviewRequest = {
  organization_id: string;
  company_id?: string | null;
  financial_account_id: string;
  source_file_name: string;
  source_file_size_bytes: number;
  ofx_text: string;
};

export type FinanceOfxPreviewDto = {
  organization_id: string;
  company_id: string | null;
  financial_account_id: string;
  source_file_name: string;
  source_file_hash: string;
  generated_at: string;
  summary: {
    total_rows: number;
    ready_count: number;
    review_count: number;
    blocked_count: number;
    duplicate_count: number;
    inflow_cents: number;
    outflow_cents: number;
  };
  items: FinanceReconciliationDraftItemDto[];
};

export type FinanceOfxApprovalItemInput = {
  draft_item_id: string;
  decision_type: FinanceReconciliationDraftDecisionType;
  approved: boolean;
  save_memory?: boolean;
  payable_id?: string | null;
  receivable_id?: string | null;
  financial_transaction_id?: string | null;
  financial_entity_id?: string | null;
  financial_category_id?: string | null;
  financial_cost_center_id?: string | null;
  financial_payment_method_id?: string | null;
  note?: string | null;
};

export type FinanceOfxApproveInput = FinanceOfxPreviewRequest & {
  source_file_hash: string;
  approved_items: FinanceOfxApprovalItemInput[];
  approved_by?: string | null;
};

export type FinanceOfxApproveResultDto = {
  batch_id: string;
  import_job: FinanceImportJobDto;
  approved_count: number;
  skipped_count: number;
  matches: FinanceReconciliationMatchDto[];
  transactions: FinanceTransactionDto[];
};
```

- [ ] **Step 5: Run the schema test again**

Run:

```bash
npm --workspace apps/backend test -- --test-name-pattern "conciliacao OFX em lote"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/db.ts apps/backend/src/finance/types.ts apps/backend/src/finance/finance.test.ts
git commit -m "feat(finance): add ofx reconciliation schema"
```

---

### Task 2: OFX Parser

**Files:**
- Create: `apps/backend/src/finance/ofxParser.ts`
- Create: `apps/backend/src/finance/ofxParser.test.ts`

- [ ] **Step 1: Write parser tests**

Create `apps/backend/src/finance/ofxParser.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseFinanceOfx, normalizeReconciliationDescription, buildStatementDedupeHash } from './ofxParser.js';

const sampleOfx = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260524120000[-3:BRT]
<TRNAMT>-98.50
<FITID>abc-123
<MEMO>Pagto Atlas Cloud Ltda
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260525
<TRNAMT>4500.00
<FITID>pix-789
<NAME>Cliente Alfa
<MEMO>PIX recebido Cliente Alfa
</STMTTRN>
</BANKTRANLIST>
</OFX>
`;

test('parseFinanceOfx normaliza linhas OFX de débito e crédito', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'maio.ofx',
    ofx_text: sampleOfx
  });

  assert.equal(parsed.source_file_hash, createHash('sha256').update(sampleOfx).digest('hex'));
  assert.equal(parsed.lines.length, 2);
  assert.deepEqual(parsed.lines[0], {
    id: 'ofx-line-1',
    statement_date: '2026-05-24',
    posted_at: '2026-05-24',
    amount_cents: -9850,
    description: 'Pagto Atlas Cloud Ltda',
    normalized_description: 'pagto atlas cloud ltda',
    reference_code: 'abc-123',
    balance_cents: null,
    dedupe_hash: buildStatementDedupeHash({
      financial_account_id: 'acc-1',
      statement_date: '2026-05-24',
      amount_cents: -9850,
      reference_code: 'abc-123',
      normalized_description: 'pagto atlas cloud ltda'
    })
  });
  assert.equal(parsed.lines[1].amount_cents, 450000);
  assert.equal(parsed.lines[1].description, 'PIX recebido Cliente Alfa');
});

test('normalizeReconciliationDescription remove acentos, pontuação e caixa', () => {
  assert.equal(normalizeReconciliationDescription('TARIFA BANCÁRIA - Cesta 01'), 'tarifa bancaria cesta 01');
});

test('parseFinanceOfx rejeita arquivo sem STMTTRN', () => {
  assert.throws(
    () => parseFinanceOfx({
      organization_id: 'org-holand',
      financial_account_id: 'acc-1',
      source_file_name: 'vazio.ofx',
      ofx_text: '<OFX></OFX>'
    }),
    /Nenhuma movimentação OFX encontrada/
  );
});
```

- [ ] **Step 2: Run parser tests to verify failure**

Run:

```bash
npm --workspace apps/backend test -- src/finance/ofxParser.test.ts
```

Expected: FAIL because `ofxParser.ts` does not exist.

- [ ] **Step 3: Implement parser**

Create `apps/backend/src/finance/ofxParser.ts`:

```ts
import { createHash } from 'node:crypto';
import type { FinanceOfxLineDto } from './types.js';

export type ParseFinanceOfxInput = {
  organization_id: string;
  financial_account_id: string;
  source_file_name: string;
  ofx_text: string;
};

export type ParseFinanceOfxResult = {
  source_file_hash: string;
  lines: FinanceOfxLineDto[];
};

export function normalizeReconciliationDescription(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function readTag(block: string, tag: string) {
  const match = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i').exec(block);
  return match?.[1]?.trim() ?? null;
}

function parseOfxDate(value: string | null) {
  if (!value || value.length < 8) {
    throw new Error('Linha OFX sem data válida.');
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseOfxAmountToCents(value: string | null) {
  if (!value) {
    throw new Error('Linha OFX sem valor válido.');
  }
  const amount = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(amount)) {
    throw new Error('Linha OFX sem valor válido.');
  }
  return Math.round(amount * 100);
}

export function buildStatementDedupeHash(input: {
  financial_account_id: string;
  statement_date: string;
  amount_cents: number;
  reference_code: string | null;
  normalized_description: string;
}) {
  return createHash('sha256')
    .update([
      input.financial_account_id,
      input.statement_date,
      String(input.amount_cents),
      input.reference_code ?? '',
      input.normalized_description
    ].join('|'))
    .digest('hex');
}

export function parseFinanceOfx(input: ParseFinanceOfxInput): ParseFinanceOfxResult {
  const blocks = input.ofx_text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
  if (blocks.length === 0) {
    throw new Error('Nenhuma movimentação OFX encontrada.');
  }

  const lines = blocks.map((block, index): FinanceOfxLineDto => {
    const statementDate = parseOfxDate(readTag(block, 'DTPOSTED'));
    const amountCents = parseOfxAmountToCents(readTag(block, 'TRNAMT'));
    const memo = readTag(block, 'MEMO');
    const name = readTag(block, 'NAME');
    const description = (memo ?? name ?? '').trim();
    if (!description) {
      throw new Error('Linha OFX sem descrição válida.');
    }
    const normalizedDescription = normalizeReconciliationDescription(description);
    const referenceCode = readTag(block, 'FITID');

    return {
      id: `ofx-line-${index + 1}`,
      statement_date: statementDate,
      posted_at: statementDate,
      amount_cents: amountCents,
      description,
      normalized_description: normalizedDescription,
      reference_code: referenceCode,
      balance_cents: null,
      dedupe_hash: buildStatementDedupeHash({
        financial_account_id: input.financial_account_id,
        statement_date: statementDate,
        amount_cents: amountCents,
        reference_code: referenceCode,
        normalized_description: normalizedDescription
      })
    };
  });

  return {
    source_file_hash: createHash('sha256').update(input.ofx_text).digest('hex'),
    lines
  };
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm --workspace apps/backend test -- src/finance/ofxParser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/finance/ofxParser.ts apps/backend/src/finance/ofxParser.test.ts
git commit -m "feat(finance): parse ofx statements"
```

---

### Task 3: Draft Engine and Memory Lookup

**Files:**
- Create: `apps/backend/src/finance/reconciliationDraft.ts`
- Create: `apps/backend/src/finance/reconciliationDraft.test.ts`
- Modify: `apps/backend/src/finance/service.ts`

- [ ] **Step 1: Write draft engine tests**

Create `apps/backend/src/finance/reconciliationDraft.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { FinanceOfxLineDto, FinancePayableDto, FinanceReceivableDto, FinanceTransactionDto } from './types.js';
import { buildFinanceReconciliationDraftItems, confidenceBand } from './reconciliationDraft.js';

const lineOut: FinanceOfxLineDto = {
  id: 'ofx-line-1',
  statement_date: '2026-05-24',
  posted_at: '2026-05-24',
  amount_cents: -9850,
  description: 'Pagto Atlas Cloud',
  normalized_description: 'pagto atlas cloud',
  reference_code: 'fit-1',
  balance_cents: null,
  dedupe_hash: 'hash-1'
};

const lineIn: FinanceOfxLineDto = {
  ...lineOut,
  id: 'ofx-line-2',
  amount_cents: 450000,
  description: 'PIX Cliente Alfa',
  normalized_description: 'pix cliente alfa',
  dedupe_hash: 'hash-2'
};

const payable = {
  id: 'pay-1',
  description: 'Atlas Cloud maio',
  amount_cents: 9850,
  paid_amount_cents: 0,
  status: 'open',
  due_date: '2026-05-24',
  financial_entity_id: 'entity-atlas',
  financial_entity_name: 'Atlas Cloud',
  financial_category_id: 'cat-software',
  financial_category_name: 'Software',
  financial_cost_center_id: 'cc-ops',
  financial_cost_center_name: 'Operações',
  financial_payment_method_id: 'pm-pix',
  financial_payment_method_name: 'PIX',
  financial_account_id: null,
  financial_account_name: null
} as FinancePayableDto;

const receivable = {
  id: 'rec-1',
  description: 'Cliente Alfa maio',
  amount_cents: 450000,
  received_amount_cents: 0,
  status: 'open',
  due_date: '2026-05-25',
  financial_entity_id: 'entity-alfa',
  financial_entity_name: 'Cliente Alfa',
  financial_category_id: 'cat-revenue',
  financial_category_name: 'Receita',
  financial_cost_center_id: 'cc-sales',
  financial_cost_center_name: 'Comercial',
  financial_payment_method_id: 'pm-pix',
  financial_payment_method_name: 'PIX',
  financial_account_id: null,
  financial_account_name: null
} as FinanceReceivableDto;

const ledgerTransaction = {
  id: 'txn-1',
  kind: 'expense',
  status: 'open',
  amount_cents: 9850,
  due_date: '2026-05-24',
  settlement_date: null,
  competence_date: '2026-05-01',
  note: 'Atlas Cloud maio',
  financial_entity_id: 'entity-atlas',
  financial_entity_name: 'Atlas Cloud',
  financial_category_id: 'cat-software',
  financial_category_name: 'Software',
  financial_cost_center_id: 'cc-ops',
  financial_cost_center_name: 'Operações',
  financial_payment_method_id: 'pm-pix',
  financial_payment_method_name: 'PIX',
  is_deleted: false
} as FinanceTransactionDto;

test('confidenceBand classifica score nos limites aprovados', () => {
  assert.equal(confidenceBand(0.95), 'auto');
  assert.equal(confidenceBand(0.8), 'ready');
  assert.equal(confidenceBand(0.6), 'review');
  assert.equal(confidenceBand(0.59), 'blocked');
});

test('draft prioriza payable/receivable antes do ledger', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut, lineIn],
    payables: [payable],
    receivables: [receivable],
    transactions: [ledgerTransaction],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'payable_match');
  assert.equal(items[0].target.payable_id, 'pay-1');
  assert.equal(items[1].decision_type, 'receivable_match');
  assert.equal(items[1].target.receivable_id, 'rec-1');
});

test('draft usa memoria para novo lançamento liquidado quando não há match existente', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [{
      id: 'mem-1',
      normalized_pattern: 'pagto atlas',
      direction: 'outflow',
      financial_entity_id: 'entity-atlas',
      financial_entity_name: 'Atlas Cloud',
      financial_category_id: 'cat-software',
      financial_category_name: 'Software',
      financial_cost_center_id: 'cc-ops',
      financial_cost_center_name: 'Operações',
      financial_payment_method_id: 'pm-pix',
      financial_payment_method_name: 'PIX',
      usage_count: 3,
      confidence_score: 0.86
    }]
  });

  assert.equal(items[0].decision_type, 'new_transaction');
  assert.equal(items[0].confidence_band, 'ready');
  assert.equal(items[0].proposed.financial_entity_id, 'entity-atlas');
  assert.equal(items[0].proposed.save_memory, true);
});

test('draft bloqueia hashes duplicados', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set(['hash-1'])
  });

  assert.equal(items[0].decision_type, 'duplicate');
  assert.equal(items[0].confidence_band, 'blocked');
  assert.equal(items[0].blocking_reason, 'Linha OFX já importada para esta conta.');
});
```

- [ ] **Step 2: Run draft tests to verify failure**

Run:

```bash
npm --workspace apps/backend test -- src/finance/reconciliationDraft.test.ts
```

Expected: FAIL because `reconciliationDraft.ts` does not exist.

- [ ] **Step 3: Implement draft engine**

Create `apps/backend/src/finance/reconciliationDraft.ts` with these exports:

```ts
import type {
  FinanceOfxLineDto,
  FinancePayableDto,
  FinanceReceivableDto,
  FinanceReconciliationDraftItemDto,
  FinanceReconciliationSuggestionReasonDto,
  FinanceTransactionDto
} from './types.js';

export type FinanceReconciliationMemoryCandidate = {
  id: string;
  normalized_pattern: string;
  direction: 'inflow' | 'outflow';
  financial_entity_id: string | null;
  financial_entity_name: string | null;
  financial_category_id: string | null;
  financial_category_name: string | null;
  financial_cost_center_id: string | null;
  financial_cost_center_name: string | null;
  financial_payment_method_id: string | null;
  financial_payment_method_name: string | null;
  usage_count: number;
  confidence_score: number;
};

export function confidenceBand(score: number): FinanceReconciliationDraftItemDto['confidence_band'] {
  if (score >= 0.95) return 'auto';
  if (score >= 0.8) return 'ready';
  if (score >= 0.6) return 'review';
  return 'blocked';
}

function directionFromAmount(amountCents: number) {
  return amountCents >= 0 ? 'inflow' : 'outflow';
}

function textIncludes(normalizedText: string, candidate: string | null | undefined) {
  if (!candidate) return false;
  return candidate
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .some((token) => normalizedText.includes(token));
}

function dateGapDays(left: string, right: string | null | undefined) {
  if (!right) return 30;
  const leftDate = new Date(`${left}T00:00:00.000Z`);
  const rightDate = new Date(`${right}T00:00:00.000Z`);
  return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / 86_400_000));
}

function scoreReasons(input: {
  line: FinanceOfxLineDto;
  amountCents: number;
  date: string | null | undefined;
  label: string | null | undefined;
}) {
  const reasons: FinanceReconciliationSuggestionReasonDto[] = [];
  let score = 0.2;

  if (Math.abs(input.line.amount_cents) === Math.abs(input.amountCents)) {
    score += 0.35;
    reasons.push({ label: 'Valor exato', detail: 'O valor do OFX bate com o registro.', tone: 'positive' });
  }

  const gap = dateGapDays(input.line.statement_date, input.date);
  if (gap <= 1) {
    score += 0.2;
    reasons.push({ label: 'Data muito próxima', detail: `${gap} dia(s) de diferença.`, tone: 'positive' });
  } else if (gap <= 5) {
    score += 0.12;
    reasons.push({ label: 'Data próxima', detail: `${gap} dias de diferença.`, tone: 'positive' });
  }

  if (textIncludes(input.line.normalized_description, input.label)) {
    score += 0.2;
    reasons.push({ label: 'Descrição parecida', detail: 'A descrição do OFX contém o nome esperado.', tone: 'positive' });
  }

  return { score: Number(Math.min(score, 0.99).toFixed(2)), reasons };
}

function baseProposed(line: FinanceOfxLineDto, financialAccountId: string) {
  return {
    financial_entity_id: null,
    financial_entity_name: null,
    financial_category_id: null,
    financial_category_name: null,
    financial_cost_center_id: null,
    financial_cost_center_name: null,
    financial_payment_method_id: null,
    financial_payment_method_name: null,
    financial_account_id: financialAccountId,
    note: line.description,
    save_memory: false
  };
}

export function buildFinanceReconciliationDraftItems(input: {
  financial_account_id: string;
  lines: FinanceOfxLineDto[];
  payables: FinancePayableDto[];
  receivables: FinanceReceivableDto[];
  transactions: FinanceTransactionDto[];
  memories: FinanceReconciliationMemoryCandidate[];
  duplicateHashes: Set<string>;
}): FinanceReconciliationDraftItemDto[] {
  return input.lines.map((line) => {
    if (input.duplicateHashes.has(line.dedupe_hash)) {
      return {
        id: line.id,
        line,
        decision_type: 'duplicate',
        confidence_score: 0,
        confidence_band: 'blocked',
        reasons: [{ label: 'Duplicada', detail: 'Linha OFX já importada para esta conta.', tone: 'warning' }],
        target: {},
        proposed: baseProposed(line, input.financial_account_id),
        blocking_reason: 'Linha OFX já importada para esta conta.'
      };
    }

    const direction = directionFromAmount(line.amount_cents);
    const payable = direction === 'outflow'
      ? input.payables.find((item) => ['open', 'partial', 'overdue'].includes(item.status) && Math.abs(item.amount_cents - item.paid_amount_cents) === Math.abs(line.amount_cents))
      : undefined;
    if (payable) {
      const scored = scoreReasons({ line, amountCents: payable.amount_cents, date: payable.due_date, label: payable.financial_entity_name ?? payable.supplier_name ?? payable.description });
      const score = Math.max(scored.score, 0.82);
      return {
        id: line.id,
        line,
        decision_type: 'payable_match',
        confidence_score: score,
        confidence_band: confidenceBand(score),
        reasons: scored.reasons,
        target: { payable_id: payable.id },
        proposed: {
          ...baseProposed(line, input.financial_account_id),
          financial_entity_id: payable.financial_entity_id,
          financial_entity_name: payable.financial_entity_name,
          financial_category_id: payable.financial_category_id,
          financial_category_name: payable.financial_category_name,
          financial_cost_center_id: payable.financial_cost_center_id,
          financial_cost_center_name: payable.financial_cost_center_name,
          financial_payment_method_id: payable.financial_payment_method_id,
          financial_payment_method_name: payable.financial_payment_method_name,
          save_memory: true
        },
        blocking_reason: null
      };
    }

    const receivable = direction === 'inflow'
      ? input.receivables.find((item) => ['open', 'partial', 'overdue'].includes(item.status) && Math.abs(item.amount_cents - item.received_amount_cents) === Math.abs(line.amount_cents))
      : undefined;
    if (receivable) {
      const scored = scoreReasons({ line, amountCents: receivable.amount_cents, date: receivable.due_date, label: receivable.financial_entity_name ?? receivable.customer_name ?? receivable.description });
      const score = Math.max(scored.score, 0.82);
      return {
        id: line.id,
        line,
        decision_type: 'receivable_match',
        confidence_score: score,
        confidence_band: confidenceBand(score),
        reasons: scored.reasons,
        target: { receivable_id: receivable.id },
        proposed: {
          ...baseProposed(line, input.financial_account_id),
          financial_entity_id: receivable.financial_entity_id,
          financial_entity_name: receivable.financial_entity_name,
          financial_category_id: receivable.financial_category_id,
          financial_category_name: receivable.financial_category_name,
          financial_cost_center_id: receivable.financial_cost_center_id,
          financial_cost_center_name: receivable.financial_cost_center_name,
          financial_payment_method_id: receivable.financial_payment_method_id,
          financial_payment_method_name: receivable.financial_payment_method_name,
          save_memory: true
        },
        blocking_reason: null
      };
    }

    const transaction = input.transactions.find((item) => {
      if (item.is_deleted || item.status === 'canceled') return false;
      if (direction === 'inflow' && item.kind !== 'income') return false;
      if (direction === 'outflow' && item.kind !== 'expense') return false;
      return Math.abs(item.amount_cents) === Math.abs(line.amount_cents);
    });
    if (transaction) {
      const scored = scoreReasons({ line, amountCents: transaction.amount_cents, date: transaction.settlement_date ?? transaction.due_date, label: transaction.financial_entity_name ?? transaction.note });
      const score = Math.max(scored.score, 0.8);
      return {
        id: line.id,
        line,
        decision_type: 'ledger_match',
        confidence_score: score,
        confidence_band: confidenceBand(score),
        reasons: scored.reasons,
        target: { financial_transaction_id: transaction.id },
        proposed: {
          ...baseProposed(line, input.financial_account_id),
          financial_entity_id: transaction.financial_entity_id,
          financial_entity_name: transaction.financial_entity_name,
          financial_category_id: transaction.financial_category_id,
          financial_category_name: transaction.financial_category_name,
          financial_cost_center_id: transaction.financial_cost_center_id,
          financial_cost_center_name: transaction.financial_cost_center_name,
          financial_payment_method_id: transaction.financial_payment_method_id,
          financial_payment_method_name: transaction.financial_payment_method_name,
          save_memory: true
        },
        blocking_reason: null
      };
    }

    const memory = input.memories.find((item) => item.direction === direction && line.normalized_description.includes(item.normalized_pattern));
    if (memory) {
      const score = Number(Math.min(0.94, memory.confidence_score + Math.min(0.08, memory.usage_count * 0.01)).toFixed(2));
      return {
        id: line.id,
        line,
        decision_type: 'new_transaction',
        confidence_score: score,
        confidence_band: confidenceBand(score),
        reasons: [{ label: 'Memória aprendida', detail: `${memory.usage_count} aprovação(ões) anteriores parecidas.`, tone: 'positive' }],
        target: {},
        proposed: {
          ...baseProposed(line, input.financial_account_id),
          financial_entity_id: memory.financial_entity_id,
          financial_entity_name: memory.financial_entity_name,
          financial_category_id: memory.financial_category_id,
          financial_category_name: memory.financial_category_name,
          financial_cost_center_id: memory.financial_cost_center_id,
          financial_cost_center_name: memory.financial_cost_center_name,
          financial_payment_method_id: memory.financial_payment_method_id,
          financial_payment_method_name: memory.financial_payment_method_name,
          save_memory: true
        },
        blocking_reason: null
      };
    }

    return {
      id: line.id,
      line,
      decision_type: 'needs_review',
      confidence_score: 0.4,
      confidence_band: 'blocked',
      reasons: [{ label: 'Sem padrão forte', detail: 'Nenhum match ou memória confiável foi encontrado.', tone: 'warning' }],
      target: {},
      proposed: baseProposed(line, input.financial_account_id),
      blocking_reason: 'Revise os campos financeiros antes de aprovar.'
    };
  });
}
```

- [ ] **Step 4: Add service readers for duplicates and memory**

In `apps/backend/src/finance/service.ts`, import:

```ts
import { parseFinanceOfx } from './ofxParser.js';
import { buildFinanceReconciliationDraftItems, type FinanceReconciliationMemoryCandidate } from './reconciliationDraft.js';
```

Add helper functions near the reconciliation helpers:

```ts
function listExistingStatementDedupeHashes(organizationId: string, financialAccountId: string, hashes: string[]) {
  if (hashes.length === 0) return new Set<string>();
  const placeholders = hashes.map(() => '?').join(', ');
  const rows = db.prepare(`
    select dedupe_hash
    from financial_bank_statement_entry
    where organization_id = ?
      and financial_account_id = ?
      and dedupe_hash in (${placeholders})
  `).all(organizationId, financialAccountId, ...hashes) as Array<{ dedupe_hash: string | null }>;
  return new Set(rows.map((row) => row.dedupe_hash).filter((hash): hash is string => Boolean(hash)));
}

function listFinanceReconciliationMemory(organizationId: string, financialAccountId: string): FinanceReconciliationMemoryCandidate[] {
  return db.prepare(`
    select
      frm.id,
      frm.normalized_pattern,
      frm.direction,
      frm.financial_entity_id,
      coalesce(fe.trade_name, fe.legal_name) as financial_entity_name,
      frm.financial_category_id,
      fc.name as financial_category_name,
      frm.financial_cost_center_id,
      fcc.name as financial_cost_center_name,
      frm.financial_payment_method_id,
      fpm.name as financial_payment_method_name,
      frm.usage_count,
      frm.confidence_score
    from financial_reconciliation_memory frm
    left join financial_entity fe on fe.organization_id = frm.organization_id and fe.id = frm.financial_entity_id
    left join financial_category fc on fc.organization_id = frm.organization_id and fc.id = frm.financial_category_id
    left join financial_cost_center fcc on fcc.organization_id = frm.organization_id and fcc.id = frm.financial_cost_center_id
    left join financial_payment_method fpm on fpm.organization_id = frm.organization_id and fpm.id = frm.financial_payment_method_id
    where frm.organization_id = ?
      and frm.financial_account_id = ?
    order by frm.usage_count desc, frm.updated_at desc
  `).all(organizationId, financialAccountId) as FinanceReconciliationMemoryCandidate[];
}
```

- [ ] **Step 5: Run draft tests**

Run:

```bash
npm --workspace apps/backend test -- src/finance/reconciliationDraft.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/finance/reconciliationDraft.ts apps/backend/src/finance/reconciliationDraft.test.ts apps/backend/src/finance/service.ts
git commit -m "feat(finance): build ofx reconciliation drafts"
```

---

### Task 4: Preview and Approval Backend

**Files:**
- Modify: `apps/backend/src/finance/service.ts`
- Modify: `apps/backend/src/finance/routes.ts`
- Modify: `apps/backend/src/finance/finance.test.ts`

- [ ] **Step 1: Write route tests**

Append this integration test to `apps/backend/src/finance/finance.test.ts`:

```ts
test('OFX preview and approval creates settled transaction, match, memory and blocks duplicates', async () => {
  const dbPath = assignTestDbPath('finance-ofx-preview-approval');
  cleanupDbFiles(dbPath);

  const app = createApp({ forceDbRefresh: true, seedDb: false });

  try {
    seedFinanceCompanies();
    createInternalUser({
      username: 'finance.ofx',
      display_name: 'Finance OFX',
      password: 'Senha#123',
      role: 'supremo',
      permissions: ['finance.read', 'finance.write', 'finance.reconcile']
    });

    const loginRes = await request(app).post('/auth/login').send({ username: 'finance.ofx', password: 'Senha#123' });
    assert.equal(loginRes.status, 200);
    const token = loginRes.body.token as string;

    const accountRes = await request(app)
      .post('/finance/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_id: 'company-a', name: 'Banco OFX', kind: 'bank' });
    assert.equal(accountRes.status, 201);

    const categoryRes = await request(app)
      .post('/finance/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_id: 'company-a', name: 'Tarifas Bancárias', kind: 'expense' });
    assert.equal(categoryRes.status, 201);

    const ofxText = `<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260524<TRNAMT>-19.90<FITID>fee-1<MEMO>TARIFA BANCARIA</STMTTRN></BANKTRANLIST></OFX>`;

    const previewRes = await request(app)
      .post('/finance/reconciliation/ofx/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company_id: 'company-a',
        financial_account_id: accountRes.body.id,
        source_file_name: 'maio.ofx',
        source_file_size_bytes: 512,
        ofx_text: ofxText
      });
    assert.equal(previewRes.status, 200, JSON.stringify(previewRes.body));
    assert.equal(previewRes.body.summary.total_rows, 1);
    assert.equal(previewRes.body.items[0].decision_type, 'needs_review');

    const approveRes = await request(app)
      .post('/finance/reconciliation/ofx/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company_id: 'company-a',
        financial_account_id: accountRes.body.id,
        source_file_name: 'maio.ofx',
        source_file_size_bytes: 512,
        source_file_hash: previewRes.body.source_file_hash,
        ofx_text: ofxText,
        approved_items: [{
          draft_item_id: previewRes.body.items[0].id,
          decision_type: 'new_transaction',
          approved: true,
          save_memory: true,
          financial_category_id: categoryRes.body.id,
          note: 'Tarifa bancaria'
        }]
      });
    assert.equal(approveRes.status, 201, JSON.stringify(approveRes.body));
    assert.equal(approveRes.body.approved_count, 1);
    assert.equal(approveRes.body.transactions[0].status, 'settled');
    assert.equal(approveRes.body.transactions[0].amount_cents, 1990);
    assert.equal(approveRes.body.matches[0].match_status, 'matched');

    const memoryRows = db.prepare('select normalized_pattern, usage_count from financial_reconciliation_memory').all() as Array<{ normalized_pattern: string; usage_count: number }>;
    assert.equal(memoryRows.length, 1);
    assert.equal(memoryRows[0].normalized_pattern, 'tarifa bancaria');
    assert.equal(memoryRows[0].usage_count, 1);

    const duplicatePreviewRes = await request(app)
      .post('/finance/reconciliation/ofx/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company_id: 'company-a',
        financial_account_id: accountRes.body.id,
        source_file_name: 'maio.ofx',
        source_file_size_bytes: 512,
        ofx_text: ofxText
      });
    assert.equal(duplicatePreviewRes.status, 200);
    assert.equal(duplicatePreviewRes.body.items[0].decision_type, 'duplicate');
  } finally {
    db.close();
    cleanupDbFiles(dbPath);
  }
});
```

- [ ] **Step 2: Run route test to verify failure**

Run:

```bash
npm --workspace apps/backend test -- --test-name-pattern "OFX preview and approval"
```

Expected: FAIL with 404 for the new endpoints.

- [ ] **Step 3: Add service methods**

In `apps/backend/src/finance/service.ts`, import the new types:

```ts
  FinanceOfxApproveInput,
  FinanceOfxApproveResultDto,
  FinanceOfxPreviewDto,
  FinanceOfxPreviewRequest
```

Add:

```ts
function summarizeOfxDraft(items: FinanceReconciliationInboxDto['inbox'] | Array<{ confidence_band: string; decision_type: string; line: { amount_cents: number } }>) {
  return {
    total_rows: items.length,
    ready_count: items.filter((item) => item.confidence_band === 'auto' || item.confidence_band === 'ready').length,
    review_count: items.filter((item) => item.confidence_band === 'review').length,
    blocked_count: items.filter((item) => item.confidence_band === 'blocked').length,
    duplicate_count: items.filter((item) => item.decision_type === 'duplicate').length,
    inflow_cents: items.filter((item) => item.line.amount_cents > 0).reduce((sum, item) => sum + item.line.amount_cents, 0),
    outflow_cents: Math.abs(items.filter((item) => item.line.amount_cents < 0).reduce((sum, item) => sum + item.line.amount_cents, 0))
  };
}

export function previewFinanceOfxReconciliation(input: FinanceOfxPreviewRequest): FinanceOfxPreviewDto {
  const normalizedOrganizationId = resolveOrganizationId(input.organization_id);
  readOrganizationRow(normalizedOrganizationId);
  const company = resolveCompanyRow(input.company_id);
  const account = db.prepare(`
    select id
    from financial_account
    where organization_id = ?
      and id = ?
    limit 1
  `).get(normalizedOrganizationId, input.financial_account_id) as { id: string } | undefined;
  if (!account) throw new Error('Conta financeira não encontrada.');

  const parsed = parseFinanceOfx(input);
  const duplicateHashes = listExistingStatementDedupeHashes(
    normalizedOrganizationId,
    input.financial_account_id,
    parsed.lines.map((line) => line.dedupe_hash)
  );
  const payables = listFinancePayables(normalizedOrganizationId, company?.id).payables;
  const receivables = listFinanceReceivables(normalizedOrganizationId, company?.id).receivables;
  const transactions = listFinanceTransactions(normalizedOrganizationId, {}).transactions;
  const memories = listFinanceReconciliationMemory(normalizedOrganizationId, input.financial_account_id);
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: input.financial_account_id,
    lines: parsed.lines,
    payables,
    receivables,
    transactions,
    memories,
    duplicateHashes
  });

  return {
    organization_id: normalizedOrganizationId,
    company_id: company?.id ?? null,
    financial_account_id: input.financial_account_id,
    source_file_name: input.source_file_name,
    source_file_hash: parsed.source_file_hash,
    generated_at: new Date().toISOString(),
    summary: summarizeOfxDraft(items),
    items
  };
}
```

Then add approval helpers:

```ts
function upsertReconciliationMemory(input: {
  organization_id: string;
  company_id: string | null;
  financial_account_id: string;
  normalized_pattern: string;
  direction: 'inflow' | 'outflow';
  financial_entity_id: string | null;
  financial_category_id: string | null;
  financial_cost_center_id: string | null;
  financial_payment_method_id: string | null;
}) {
  const nowIso = new Date().toISOString();
  const existing = db.prepare(`
    select id, usage_count
    from financial_reconciliation_memory
    where organization_id = ?
      and financial_account_id = ?
      and normalized_pattern = ?
      and direction = ?
    limit 1
  `).get(input.organization_id, input.financial_account_id, input.normalized_pattern, input.direction) as { id: string; usage_count: number } | undefined;

  if (existing) {
    db.prepare(`
      update financial_reconciliation_memory
      set usage_count = ?,
          confidence_score = ?,
          financial_entity_id = ?,
          financial_category_id = ?,
          financial_cost_center_id = ?,
          financial_payment_method_id = ?,
          last_approved_at = ?,
          updated_at = ?
      where id = ?
    `).run(
      existing.usage_count + 1,
      Math.min(0.94, 0.7 + ((existing.usage_count + 1) * 0.04)),
      input.financial_entity_id,
      input.financial_category_id,
      input.financial_cost_center_id,
      input.financial_payment_method_id,
      nowIso,
      nowIso,
      existing.id
    );
    return;
  }

  db.prepare(`
    insert into financial_reconciliation_memory (
      id, organization_id, company_id, financial_account_id, normalized_pattern, direction,
      financial_entity_id, financial_category_id, financial_cost_center_id, financial_payment_method_id,
      usage_count, confidence_score, last_approved_at, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid('fmem'),
    input.organization_id,
    input.company_id,
    input.financial_account_id,
    input.normalized_pattern,
    input.direction,
    input.financial_entity_id,
    input.financial_category_id,
    input.financial_cost_center_id,
    input.financial_payment_method_id,
    1,
    0.7,
    nowIso,
    nowIso,
    nowIso
  );
}
```

Add `approveFinanceOfxReconciliation(input: FinanceOfxApproveInput): FinanceOfxApproveResultDto` using a transaction:

```ts
export function approveFinanceOfxReconciliation(input: FinanceOfxApproveInput): FinanceOfxApproveResultDto {
  const normalizedOrganizationId = resolveOrganizationId(input.organization_id);
  const preview = previewFinanceOfxReconciliation(input);
  if (preview.source_file_hash !== input.source_file_hash) {
    throw new Error('O conteúdo OFX mudou desde a prévia.');
  }

  return db.transaction(() => {
    const nowIso = new Date().toISOString();
    const companyId = preview.company_id;
    const importJob = createFinanceImportJob({
      organization_id: normalizedOrganizationId,
      company_id: companyId,
      import_type: 'ofx',
      source_file_name: input.source_file_name,
      source_file_size_bytes: input.source_file_size_bytes,
      status: 'completed',
      total_rows: preview.summary.total_rows,
      processed_rows: input.approved_items.filter((item) => item.approved).length,
      error_rows: preview.summary.blocked_count,
      created_by: input.approved_by ?? null,
      finished_at: nowIso
    });
    db.prepare('update financial_import_job set source_file_hash = ? where id = ?').run(input.source_file_hash, importJob.id);

    const matches: FinanceReconciliationMatchDto[] = [];
    const transactions: FinanceTransactionDto[] = [];
    const approvedById = new Map(input.approved_items.map((item) => [item.draft_item_id, item]));

    for (const draftItem of preview.items) {
      const approval = approvedById.get(draftItem.id);
      if (!approval?.approved || draftItem.decision_type === 'duplicate' || draftItem.decision_type === 'invalid') {
        continue;
      }

      const statement = createFinanceStatementEntry({
        organization_id: normalizedOrganizationId,
        company_id: companyId,
        financial_account_id: input.financial_account_id,
        financial_import_job_id: importJob.id,
        statement_date: draftItem.line.statement_date,
        posted_at: draftItem.line.posted_at,
        amount_cents: draftItem.line.amount_cents,
        description: draftItem.line.description,
        reference_code: draftItem.line.reference_code,
        balance_cents: draftItem.line.balance_cents,
        source: 'ofx',
        source_ref: draftItem.line.reference_code
      });
      db.prepare('update financial_bank_statement_entry set dedupe_hash = ? where id = ?').run(draftItem.line.dedupe_hash, statement.id);

      let transactionId = approval.financial_transaction_id ?? draftItem.target.financial_transaction_id ?? null;
      if (!transactionId && approval.decision_type === 'new_transaction') {
        const transaction = createFinanceTransaction({
          organization_id: normalizedOrganizationId,
          company_id: companyId,
          financial_entity_id: approval.financial_entity_id ?? draftItem.proposed.financial_entity_id,
          financial_account_id: input.financial_account_id,
          financial_category_id: approval.financial_category_id ?? draftItem.proposed.financial_category_id,
          financial_cost_center_id: approval.financial_cost_center_id ?? draftItem.proposed.financial_cost_center_id,
          financial_payment_method_id: approval.financial_payment_method_id ?? draftItem.proposed.financial_payment_method_id,
          kind: draftItem.line.amount_cents >= 0 ? 'income' : 'expense',
          status: 'settled',
          amount_cents: Math.abs(draftItem.line.amount_cents),
          issue_date: draftItem.line.statement_date,
          due_date: draftItem.line.statement_date,
          settlement_date: draftItem.line.posted_at ?? draftItem.line.statement_date,
          competence_date: draftItem.line.statement_date,
          source: 'ofx',
          source_ref: statement.id,
          note: approval.note?.trim() || draftItem.proposed.note,
          created_by: input.approved_by ?? null
        });
        transactions.push(transaction);
        transactionId = transaction.id;
      }

      if (!transactionId) {
        throw new Error('Item aprovado sem transação de destino.');
      }

      const match = createFinanceReconciliationMatch({
        organization_id: normalizedOrganizationId,
        company_id: companyId,
        financial_bank_statement_entry_id: statement.id,
        financial_transaction_id: transactionId,
        confidence_score: draftItem.confidence_score,
        match_status: 'matched',
        source: approval.decision_type,
        reviewed_by: input.approved_by ?? null,
        reviewed_at: nowIso
      });
      matches.push(match);

      if (approval.save_memory ?? draftItem.proposed.save_memory) {
        upsertReconciliationMemory({
          organization_id: normalizedOrganizationId,
          company_id: companyId,
          financial_account_id: input.financial_account_id,
          normalized_pattern: draftItem.line.normalized_description,
          direction: draftItem.line.amount_cents >= 0 ? 'inflow' : 'outflow',
          financial_entity_id: approval.financial_entity_id ?? draftItem.proposed.financial_entity_id,
          financial_category_id: approval.financial_category_id ?? draftItem.proposed.financial_category_id,
          financial_cost_center_id: approval.financial_cost_center_id ?? draftItem.proposed.financial_cost_center_id,
          financial_payment_method_id: approval.financial_payment_method_id ?? draftItem.proposed.financial_payment_method_id
        });
      }
    }

    const batchId = uuid('frecb');
    const approvedCount = matches.length;
    db.prepare(`
      insert into financial_reconciliation_batch (
        id, organization_id, company_id, financial_import_job_id, financial_account_id,
        source_file_name, source_file_hash, approved_by, approved_at, total_rows,
        approved_rows, skipped_rows, inflow_cents, outflow_cents, decision_summary_json, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batchId,
      normalizedOrganizationId,
      companyId,
      importJob.id,
      input.financial_account_id,
      input.source_file_name,
      input.source_file_hash,
      input.approved_by ?? null,
      nowIso,
      preview.summary.total_rows,
      approvedCount,
      preview.summary.total_rows - approvedCount,
      preview.summary.inflow_cents,
      preview.summary.outflow_cents,
      JSON.stringify(preview.summary),
      nowIso
    );

    return {
      batch_id: batchId,
      import_job: { ...importJob, status: 'completed', finished_at: nowIso },
      approved_count: approvedCount,
      skipped_count: preview.summary.total_rows - approvedCount,
      matches,
      transactions
    };
  })();
}
```

- [ ] **Step 4: Add route schemas and endpoints**

In `apps/backend/src/finance/routes.ts`, import:

```ts
  approveFinanceOfxReconciliation,
  previewFinanceOfxReconciliation,
```

Add schemas near the reconciliation schemas:

```ts
const ofxPreviewSchema = z.object({
  company_id: z.string().trim().min(1).nullable().optional(),
  financial_account_id: z.string().trim().min(1),
  source_file_name: z.string().trim().min(2).max(255),
  source_file_size_bytes: z.number().int().min(0),
  ofx_text: z.string().min(20)
});

const ofxApprovalItemSchema = z.object({
  draft_item_id: z.string().trim().min(1),
  decision_type: z.enum(['payable_match', 'receivable_match', 'ledger_match', 'new_transaction', 'needs_review', 'duplicate', 'invalid']),
  approved: z.boolean(),
  save_memory: z.boolean().optional(),
  payable_id: z.string().trim().min(1).nullable().optional(),
  receivable_id: z.string().trim().min(1).nullable().optional(),
  financial_transaction_id: z.string().trim().min(1).nullable().optional(),
  financial_entity_id: z.string().trim().min(1).nullable().optional(),
  financial_category_id: z.string().trim().min(1).nullable().optional(),
  financial_cost_center_id: z.string().trim().min(1).nullable().optional(),
  financial_payment_method_id: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().max(2_000).nullable().optional()
});

const ofxApproveSchema = ofxPreviewSchema.extend({
  source_file_hash: z.string().trim().min(32).max(128),
  approved_items: z.array(ofxApprovalItemSchema).min(1)
});
```

Add endpoints before `/finance/reconciliation/inbox`:

```ts
router.post('/reconciliation/ofx/preview', requireFinancePermission(['finance.read']), (req, res) => {
  const parsed = ofxPreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  try {
    return res.json(previewFinanceOfxReconciliation({
      ...parsed.data,
      organization_id: readFinanceOrganizationId(res)
    }));
  } catch (error) {
    return respondFinanceError(res, error);
  }
});

router.post('/reconciliation/ofx/approve', requireFinancePermission(['finance.reconcile', 'finance.write']), (req, res) => {
  const parsed = ofxApproveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  try {
    const context = readInternalAuthContext(res);
    return res.status(201).json(approveFinanceOfxReconciliation({
      ...parsed.data,
      organization_id: readFinanceOrganizationId(res),
      approved_by: context?.username ?? null
    }));
  } catch (error) {
    return respondFinanceError(res, error);
  }
});
```

- [ ] **Step 5: Run backend OFX integration test**

Run:

```bash
npm --workspace apps/backend test -- --test-name-pattern "OFX preview and approval"
```

Expected: PASS.

- [ ] **Step 6: Run full finance backend tests**

Run:

```bash
npm --workspace apps/backend test -- src/finance/finance.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/finance/service.ts apps/backend/src/finance/routes.ts apps/backend/src/finance/finance.test.ts
git commit -m "feat(finance): approve ofx reconciliation batches"
```

---

### Task 5: Frontend API Types

**Files:**
- Modify: `apps/frontend/src/finance/api.ts`
- Test: `apps/frontend/src/finance/__tests__/financeApi.test.ts`

- [ ] **Step 1: Write API tests**

Append to `apps/frontend/src/finance/__tests__/financeApi.test.ts`:

```ts
test('financeApi previews and approves OFX reconciliation batches', async () => {
  const { financeApi } = await import('../api');

  const previewPayload = {
    company_id: 'company-a',
    financial_account_id: 'acc-1',
    source_file_name: 'maio.ofx',
    source_file_size_bytes: 512,
    ofx_text: '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-19.90<MEMO>TARIFA</STMTTRN></BANKTRANLIST></OFX>'
  };

  await financeApi.previewOfxReconciliation(previewPayload);
  expect(fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('/finance/reconciliation/ofx/preview'),
    expect.objectContaining({ method: 'POST', body: JSON.stringify(previewPayload) })
  );

  const approvePayload = {
    ...previewPayload,
    source_file_hash: 'abc123abc123abc123abc123abc123abc123',
    approved_items: [{
      draft_item_id: 'ofx-line-1',
      decision_type: 'new_transaction' as const,
      approved: true,
      save_memory: true,
      note: 'Tarifa'
    }]
  };

  await financeApi.approveOfxReconciliation(approvePayload);
  expect(fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('/finance/reconciliation/ofx/approve'),
    expect.objectContaining({ method: 'POST', body: JSON.stringify(approvePayload) })
  );
});
```

- [ ] **Step 2: Run API test to verify failure**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/financeApi.test.ts
```

Expected: FAIL because API methods are missing.

- [ ] **Step 3: Add frontend types and methods**

In `apps/frontend/src/finance/api.ts`, add the DTO types matching the backend names:

```ts
export type FinanceReconciliationDraftDecisionType =
  | 'payable_match'
  | 'receivable_match'
  | 'ledger_match'
  | 'new_transaction'
  | 'needs_review'
  | 'duplicate'
  | 'invalid';

export type FinanceOfxLine = {
  id: string;
  statement_date: string;
  posted_at: string | null;
  amount_cents: number;
  description: string;
  normalized_description: string;
  reference_code: string | null;
  balance_cents: number | null;
  dedupe_hash: string;
};

export type FinanceReconciliationDraftItem = {
  id: string;
  line: FinanceOfxLine;
  decision_type: FinanceReconciliationDraftDecisionType;
  confidence_score: number;
  confidence_band: 'auto' | 'ready' | 'review' | 'blocked';
  reasons: FinanceReconciliationSuggestionReason[];
  target: {
    payable_id?: string | null;
    receivable_id?: string | null;
    financial_transaction_id?: string | null;
  };
  proposed: {
    financial_entity_id: string | null;
    financial_entity_name: string | null;
    financial_category_id: string | null;
    financial_category_name: string | null;
    financial_cost_center_id: string | null;
    financial_cost_center_name: string | null;
    financial_payment_method_id: string | null;
    financial_payment_method_name: string | null;
    financial_account_id: string;
    note: string;
    save_memory: boolean;
  };
  blocking_reason: string | null;
};

export type FinanceOfxPreviewPayload = {
  company_id?: string | null;
  financial_account_id: string;
  source_file_name: string;
  source_file_size_bytes: number;
  ofx_text: string;
};

export type FinanceOfxPreview = {
  organization_id: string;
  company_id: string | null;
  financial_account_id: string;
  source_file_name: string;
  source_file_hash: string;
  generated_at: string;
  summary: {
    total_rows: number;
    ready_count: number;
    review_count: number;
    blocked_count: number;
    duplicate_count: number;
    inflow_cents: number;
    outflow_cents: number;
  };
  items: FinanceReconciliationDraftItem[];
};

export type FinanceOfxApprovalItemPayload = {
  draft_item_id: string;
  decision_type: FinanceReconciliationDraftDecisionType;
  approved: boolean;
  save_memory?: boolean;
  payable_id?: string | null;
  receivable_id?: string | null;
  financial_transaction_id?: string | null;
  financial_entity_id?: string | null;
  financial_category_id?: string | null;
  financial_cost_center_id?: string | null;
  financial_payment_method_id?: string | null;
  note?: string | null;
};

export type FinanceOfxApprovePayload = FinanceOfxPreviewPayload & {
  source_file_hash: string;
  approved_items: FinanceOfxApprovalItemPayload[];
};

export type FinanceOfxApproveResult = {
  batch_id: string;
  import_job: FinanceImportJob;
  approved_count: number;
  skipped_count: number;
  matches: FinanceReconciliationMatch[];
  transactions: FinanceTransaction[];
};
```

Add to `financeApi`:

```ts
previewOfxReconciliation: (payload: FinanceOfxPreviewPayload) =>
  req<FinanceOfxPreview>('/finance/reconciliation/ofx/preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
approveOfxReconciliation: (payload: FinanceOfxApprovePayload) =>
  req<FinanceOfxApproveResult>('/finance/reconciliation/ofx/approve', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
```

- [ ] **Step 4: Run API test**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/financeApi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/finance/api.ts apps/frontend/src/finance/__tests__/financeApi.test.ts
git commit -m "feat(finance): add ofx reconciliation client api"
```

---

### Task 6: OFX Import Modal

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceOfxImportModal.tsx`
- Create: `apps/frontend/src/finance/__tests__/FinanceOfxImportModal.test.tsx`

- [ ] **Step 1: Write modal tests**

Create `apps/frontend/src/finance/__tests__/FinanceOfxImportModal.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FinanceOfxImportModal } from '../components/FinanceOfxImportModal';
import type { FinanceAccount, FinanceOfxPreview } from '../api';

const account: FinanceAccount = {
  id: 'acc-1',
  organization_id: 'org-holand',
  company_id: 'company-a',
  name: 'Banco Principal',
  kind: 'bank',
  currency: 'BRL',
  account_number: null,
  branch_number: null,
  is_active: true,
  created_at: '2026-05-25T00:00:00.000Z',
  updated_at: '2026-05-25T00:00:00.000Z'
};

const preview: FinanceOfxPreview = {
  organization_id: 'org-holand',
  company_id: 'company-a',
  financial_account_id: 'acc-1',
  source_file_name: 'maio.ofx',
  source_file_hash: 'hash-1',
  generated_at: '2026-05-25T00:00:00.000Z',
  summary: {
    total_rows: 1,
    ready_count: 1,
    review_count: 0,
    blocked_count: 0,
    duplicate_count: 0,
    inflow_cents: 0,
    outflow_cents: 1990
  },
  items: [{
    id: 'ofx-line-1',
    line: {
      id: 'ofx-line-1',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -1990,
      description: 'TARIFA BANCARIA',
      normalized_description: 'tarifa bancaria',
      reference_code: 'fee-1',
      balance_cents: null,
      dedupe_hash: 'dedupe-1'
    },
    decision_type: 'new_transaction',
    confidence_score: 0.86,
    confidence_band: 'ready',
    reasons: [{ label: 'Memória aprendida', detail: '1 aprovação anterior.', tone: 'positive' }],
    target: {},
    proposed: {
      financial_entity_id: null,
      financial_entity_name: null,
      financial_category_id: 'cat-1',
      financial_category_name: 'Tarifas',
      financial_cost_center_id: null,
      financial_cost_center_name: null,
      financial_payment_method_id: null,
      financial_payment_method_name: null,
      financial_account_id: 'acc-1',
      note: 'TARIFA BANCARIA',
      save_memory: true
    },
    blocking_reason: null
  }]
};

test('FinanceOfxImportModal previews file and approves checked items', async () => {
  const user = userEvent.setup();
  const onPreview = vi.fn().mockResolvedValue(preview);
  const onApprove = vi.fn().mockResolvedValue({ approved_count: 1, skipped_count: 0 });
  const onClose = vi.fn();
  const onApproved = vi.fn();

  render(
    <FinanceOfxImportModal
      open
      accounts={[account]}
      onPreview={onPreview}
      onApprove={onApprove}
      onClose={onClose}
      onApproved={onApproved}
    />
  );

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(
    screen.getByLabelText('Arquivo OFX'),
    new File(['<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-19.90<MEMO>TARIFA</STMTTRN></BANKTRANLIST></OFX>'], 'maio.ofx', { type: 'application/x-ofx' })
  );
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  expect(await screen.findByText('TARIFA BANCARIA')).toBeInTheDocument();
  expect(screen.getByText('86%')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));

  await waitFor(() => {
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({
      financial_account_id: 'acc-1',
      source_file_name: 'maio.ofx',
      source_file_hash: 'hash-1',
      approved_items: [expect.objectContaining({
        draft_item_id: 'ofx-line-1',
        approved: true,
        decision_type: 'new_transaction'
      })]
    }));
  });
  expect(onApproved).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run modal test to verify failure**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/FinanceOfxImportModal.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement modal**

Create `apps/frontend/src/finance/components/FinanceOfxImportModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type {
  FinanceAccount,
  FinanceOfxApprovePayload,
  FinanceOfxApproveResult,
  FinanceOfxPreview,
  FinanceOfxPreviewPayload,
  FinanceReconciliationDraftItem
} from '../api';
import { FinanceEmptyState, FinanceMono } from './FinancePrimitives';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function decisionLabel(item: FinanceReconciliationDraftItem) {
  if (item.decision_type === 'payable_match') return 'Conta a pagar';
  if (item.decision_type === 'receivable_match') return 'Conta a receber';
  if (item.decision_type === 'ledger_match') return 'Ledger';
  if (item.decision_type === 'new_transaction') return 'Novo liquidado';
  if (item.decision_type === 'duplicate') return 'Duplicada';
  if (item.decision_type === 'invalid') return 'Inválida';
  return 'Revisar';
}

export function FinanceOfxImportModal(props: {
  open: boolean;
  accounts: FinanceAccount[];
  onPreview: (payload: FinanceOfxPreviewPayload) => Promise<FinanceOfxPreview>;
  onApprove: (payload: FinanceOfxApprovePayload) => Promise<FinanceOfxApproveResult>;
  onClose: () => void;
  onApproved: (result: FinanceOfxApproveResult) => void;
}) {
  const [financialAccountId, setFinancialAccountId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [ofxText, setOfxText] = useState('');
  const [preview, setPreview] = useState<FinanceOfxPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const approvableItems = useMemo(
    () => (preview?.items ?? []).filter((item) => item.confidence_band !== 'blocked' && item.decision_type !== 'duplicate' && item.decision_type !== 'invalid'),
    [preview]
  );

  if (!props.open) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setOfxText(await file.text());
    setPreview(null);
    setSelectedIds(new Set());
  }

  async function handlePreview() {
    setLoading(true);
    setError('');
    try {
      const nextPreview = await props.onPreview({
        financial_account_id: financialAccountId,
        source_file_name: fileName,
        source_file_size_bytes: fileSize,
        ofx_text: ofxText
      });
      setPreview(nextPreview);
      setSelectedIds(new Set(nextPreview.items.filter((item) => item.confidence_band === 'auto' || item.confidence_band === 'ready').map((item) => item.id)));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Falha ao gerar prévia OFX.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      const result = await props.onApprove({
        financial_account_id: preview.financial_account_id,
        source_file_name: preview.source_file_name,
        source_file_size_bytes: fileSize,
        source_file_hash: preview.source_file_hash,
        ofx_text: ofxText,
        approved_items: approvableItems.map((item) => ({
          draft_item_id: item.id,
          decision_type: item.decision_type,
          approved: selectedIds.has(item.id),
          save_memory: item.proposed.save_memory,
          payable_id: item.target.payable_id ?? null,
          receivable_id: item.target.receivable_id ?? null,
          financial_transaction_id: item.target.financial_transaction_id ?? null,
          financial_entity_id: item.proposed.financial_entity_id,
          financial_category_id: item.proposed.financial_category_id,
          financial_cost_center_id: item.proposed.financial_cost_center_id,
          financial_payment_method_id: item.proposed.financial_payment_method_id,
          note: item.proposed.note
        }))
      });
      props.onApproved(result);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Falha ao aprovar lote OFX.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside role="dialog" aria-label="Importar OFX" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.32)', zIndex: 120, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: 'min(1040px, 100%)', maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 24px 70px rgba(15,23,42,0.22)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: 20, borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <small style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Conciliação OFX</small>
            <h2 style={{ margin: '6px 0 0', fontSize: 20, color: '#0f172a' }}>Importar e aprovar lote</h2>
          </div>
          <button type="button" aria-label="Fechar importação OFX" onClick={props.onClose} style={{ width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer' }}>×</button>
        </header>

        <div style={{ display: 'grid', gap: 16, padding: 20 }}>
          {error ? <div style={{ border: '1px solid #fecdd3', background: '#fff1f2', color: '#9f1239', borderRadius: 8, padding: 10, fontSize: 12 }}>{error}</div> : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(220px, 1fr) auto', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>
              Conta bancária
              <select aria-label="Conta bancária" value={financialAccountId} onChange={(event) => setFinancialAccountId(event.target.value)} style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px' }}>
                <option value="">Selecione</option>
                {props.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#475569' }}>
              Arquivo OFX
              <input aria-label="Arquivo OFX" type="file" accept=".ofx,.OFX" onChange={(event) => void handleFile(event.target.files?.[0])} style={{ height: 36 }} />
            </label>
            <button type="button" onClick={handlePreview} disabled={loading || !financialAccountId || !ofxText} style={{ height: 36, border: 'none', borderRadius: 8, background: 'var(--accent)', color: 'white', fontWeight: 800, padding: '0 14px', opacity: loading || !financialAccountId || !ofxText ? 0.6 : 1 }}>
              {loading ? 'Processando...' : 'Gerar prévia'}
            </button>
          </div>

          {preview ? (
            <>
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}><span>Total</span><strong style={{ display: 'block' }}><FinanceMono>{preview.summary.total_rows}</FinanceMono></strong></article>
                <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}><span>Prontos</span><strong style={{ display: 'block' }}><FinanceMono>{preview.summary.ready_count}</FinanceMono></strong></article>
                <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}><span>Revisão</span><strong style={{ display: 'block' }}><FinanceMono>{preview.summary.review_count}</FinanceMono></strong></article>
                <article style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}><span>Saídas</span><strong style={{ display: 'block' }}><FinanceMono>{formatCurrency(preview.summary.outflow_cents)}</FinanceMono></strong></article>
              </section>

              <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                {preview.items.length === 0 ? <FinanceEmptyState title="Nenhuma linha OFX encontrada." /> : preview.items.map((item) => (
                  <label key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto auto', gap: 12, alignItems: 'center', padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      disabled={item.confidence_band === 'blocked'}
                      onChange={(event) => setSelectedIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })}
                    />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>{item.line.description}</strong>
                      <small style={{ color: '#64748b' }}>{decisionLabel(item)} · {item.proposed.financial_category_name ?? 'sem categoria'}</small>
                    </span>
                    <strong><FinanceMono>{formatCurrency(item.line.amount_cents)}</FinanceMono></strong>
                    <strong style={{ color: item.confidence_band === 'blocked' ? '#92400e' : '#047857' }}>{Math.round(item.confidence_score * 100)}%</strong>
                  </label>
                ))}
              </section>

              <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={props.onClose} style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 8, background: 'white', padding: '0 14px' }}>Cancelar</button>
                <button type="button" onClick={handleApprove} disabled={loading || selectedIds.size === 0} style={{ height: 36, border: 'none', borderRadius: 8, background: '#059669', color: 'white', fontWeight: 800, padding: '0 14px', opacity: loading || selectedIds.size === 0 ? 0.6 : 1 }}>
                  Aprovar lote
                </button>
              </footer>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run modal test**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/FinanceOfxImportModal.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceOfxImportModal.tsx apps/frontend/src/finance/__tests__/FinanceOfxImportModal.test.tsx
git commit -m "feat(finance): add ofx import modal"
```

---

### Task 7: Integrate Modal into Reconciliation Page

**Files:**
- Modify: `apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx`
- Modify: `apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx`

- [ ] **Step 1: Extend page test**

In `apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx`, add mocked methods to the `financeApi` mock:

```ts
previewOfxReconciliation: vi.fn().mockResolvedValue({
  organization_id: 'org-prymeira',
  company_id: 'company-prymeira',
  financial_account_id: 'acc-1',
  source_file_name: 'maio.ofx',
  source_file_hash: 'hash-1',
  generated_at: '2026-05-25T00:00:00.000Z',
  summary: { total_rows: 1, ready_count: 1, review_count: 0, blocked_count: 0, duplicate_count: 0, inflow_cents: 0, outflow_cents: 1990 },
  items: []
}),
approveOfxReconciliation: vi.fn().mockResolvedValue({
  batch_id: 'batch-1',
  import_job: {
    id: 'job-ofx',
    organization_id: 'org-prymeira',
    company_id: 'company-prymeira',
    import_type: 'ofx',
    source_file_name: 'maio.ofx',
    source_file_mime_type: null,
    source_file_size_bytes: 512,
    status: 'completed',
    total_rows: 1,
    processed_rows: 1,
    error_rows: 0,
    error_summary: null,
    created_by: 'financeiro',
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
    finished_at: '2026-05-25T00:00:00.000Z'
  },
  approved_count: 1,
  skipped_count: 0,
  matches: [],
  transactions: []
}),
```

Add this test:

```ts
test('FinanceReconciliationPage opens OFX import modal', async () => {
  const user = userEvent.setup();
  render(<FinanceReconciliationPage />);

  expect(await screen.findByText('Pendências de conciliação')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Importar OFX' }));

  expect(screen.getByRole('dialog', { name: 'Importar OFX' })).toBeInTheDocument();
  expect(screen.getByLabelText('Conta bancária')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run page test to verify failure**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/FinanceReconciliationPage.test.tsx
```

Expected: FAIL because the `Importar OFX` button/modal are missing.

- [ ] **Step 3: Import component and add state**

In `apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx`, add imports:

```ts
import { FinanceOfxImportModal } from '../components/FinanceOfxImportModal';
import type { FinanceAccount } from '../api';
```

Add state:

```ts
const [ofxModalOpen, setOfxModalOpen] = useState(false);
const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
```

Update the existing initial `Promise.allSettled` load to include `financeApi.listAccounts()` and store `accounts`.

- [ ] **Step 4: Add import action and modal**

In the `FinancePageHeader`, add an action button through the existing `meta` node:

```tsx
meta={
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <button
      type="button"
      onClick={() => setOfxModalOpen(true)}
      style={{ height: 32, border: 'none', borderRadius: 8, background: 'var(--accent)', color: 'white', padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      Importar OFX
    </button>
    <FinancePeriodFilter value={period} onChange={setPeriod} />
  </div>
}
```

Before the closing `</section>`, render:

```tsx
<FinanceOfxImportModal
  open={ofxModalOpen}
  accounts={accounts}
  onPreview={financeApi.previewOfxReconciliation}
  onApprove={financeApi.approveOfxReconciliation}
  onClose={() => setOfxModalOpen(false)}
  onApproved={() => {
    setOfxModalOpen(false);
    setMessage('Lote OFX aprovado com sucesso.');
    setLoading(true);
    Promise.allSettled([financeApi.getReconciliationInbox(), financeApi.getQualityInbox()])
      .then(([reconciliationResult, qualityResult]) => {
        if (reconciliationResult.status === 'fulfilled') {
          setInbox(reconciliationResult.value);
        }
        if (qualityResult.status === 'fulfilled') {
          setQualityInbox(qualityResult.value);
        }
      })
      .finally(() => setLoading(false));
  }}
/>
```

- [ ] **Step 5: Run page test**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/FinanceReconciliationPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx
git commit -m "feat(finance): integrate ofx reconciliation modal"
```

---

### Task 8: Final Verification

**Files:**
- No code changes expected unless verification finds a defect.

- [ ] **Step 1: Run backend finance tests**

Run:

```bash
npm --workspace apps/backend test -- src/finance/ofxParser.test.ts src/finance/reconciliationDraft.test.ts src/finance/finance.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run frontend finance tests**

Run:

```bash
npm --workspace apps/frontend test -- src/finance/__tests__/financeApi.test.ts src/finance/__tests__/FinanceOfxImportModal.test.tsx src/finance/__tests__/FinanceReconciliationPage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run builds**

Run:

```bash
npm run build
```

Expected: PASS for backend TypeScript and frontend Vite build.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: only unrelated pre-existing user changes remain, or a clean tree if those were resolved outside this task.

- [ ] **Step 5: Commit any verification fixes**

If Step 1-3 required fixes, commit only the files changed for those fixes:

```bash
git add <files changed for verification fixes>
git commit -m "fix(finance): stabilize ofx reconciliation flow"
```

---

## Self-Review

Spec coverage:

- OFX upload/manual import: Task 2 parser, Task 4 endpoints, Task 6 modal, Task 7 page integration.
- Preview modal before changes: Task 4 preview, Task 6 modal.
- Priority order payable/receivable, ledger, new transaction: Task 3 engine tests and implementation.
- Settled new transactions: Task 4 approval test and implementation.
- Memory with description, entity, category, cost center, payment method, account: Task 1 schema, Task 3 lookup, Task 4 upsert.
- Deduplication: Task 1 schema, Task 2 hash, Task 3 duplicate decisions, Task 4 duplicate route test.
- Human approval gate: Task 4 approval endpoint only writes on approve; Task 6 selected approvals.
- Tests: Tasks 1-8 cover parser, engine, routes, API, modal, page, and build.

Placeholder scan:

- No unresolved placeholders or intentionally vague implementation steps are present.

Type consistency:

- Backend DTO names use `FinanceOfx*` and `FinanceReconciliationDraft*`.
- Frontend DTO names mirror backend names without `Dto` suffix.
- API methods are `previewOfxReconciliation` and `approveOfxReconciliation` in both tests and page integration.
