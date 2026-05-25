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
