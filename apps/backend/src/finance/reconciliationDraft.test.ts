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
  invalid_reason: null,
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

function payableFixture(overrides: Partial<FinancePayableDto> = {}): FinancePayableDto {
  return {
    ...payable,
    ...overrides
  } as FinancePayableDto;
}

function receivableFixture(overrides: Partial<FinanceReceivableDto> = {}): FinanceReceivableDto {
  return {
    ...receivable,
    ...overrides
  } as FinanceReceivableDto;
}

function transactionFixture(overrides: Partial<FinanceTransactionDto> = {}): FinanceTransactionDto {
  return {
    ...ledgerTransaction,
    ...overrides
  } as FinanceTransactionDto;
}

function ofxLineFixture(overrides: Partial<FinanceOfxLineDto> = {}): FinanceOfxLineDto {
  return {
    ...lineOut,
    ...overrides
  };
}

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
      normalized_pattern: 'pagto atlas cloud',
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

test('draft separa linha OFX inválida como exceção bloqueada', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      amount_cents: 0,
      description: 'Linha inválida',
      normalized_description: 'linha invalida',
      invalid_reason: 'Linha OFX sem valor válido.'
    })],
    payables: [],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'invalid');
  assert.equal(items[0].confidence_band, 'blocked');
  assert.equal(items[0].blocking_reason, 'Linha OFX sem valor válido.');
});

test('draft não promove match por valor exato sem evidência útil', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Tarifa avulsa banco',
      normalized_description: 'tarifa avulsa banco',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -9850
    })],
    payables: [payableFixture({
      id: 'pay-unrelated',
      description: 'Despesa sem relação',
      due_date: '2026-06-30',
      financial_entity_name: 'Fornecedor Distante',
      financial_account_id: null,
      amount_cents: 9850,
      paid_amount_cents: 0
    })],
    receivables: [],
    transactions: [transactionFixture({
      id: 'txn-unrelated',
      note: 'Lançamento sem relação',
      due_date: '2026-06-30',
      financial_entity_name: 'Fornecedor Distante'
    })],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].confidence_band, 'blocked');
});

test('draft não seleciona payable por valor e data sem texto ou entidade', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Tarifa avulsa banco',
      normalized_description: 'tarifa avulsa banco',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -9850
    })],
    payables: [payableFixture({
      id: 'pay-same-day-unrelated',
      description: 'Despesa sem relação',
      due_date: '2026-05-24',
      financial_entity_name: 'Fornecedor Distante',
      financial_account_id: null,
      amount_cents: 9850,
      paid_amount_cents: 0
    })],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].target.payable_id, undefined);
});

test('draft não seleciona ledger por valor e data sem texto ou entidade', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Tarifa avulsa banco',
      normalized_description: 'tarifa avulsa banco',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -9850
    })],
    payables: [],
    receivables: [],
    transactions: [transactionFixture({
      id: 'txn-same-day-unrelated',
      note: 'Lançamento sem relação',
      due_date: '2026-05-24',
      settlement_date: null,
      competence_date: null,
      financial_entity_name: 'Fornecedor Distante',
      financial_account_id: null,
      amount_cents: 9850
    })],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].target.financial_transaction_id, undefined);
});

test('draft ignora sobreposição genérica para payable com valor e data iguais', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Pagamento boleto banco',
      normalized_description: 'pagamento boleto banco',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -9850
    })],
    payables: [payableFixture({
      id: 'pay-generic-overlap',
      description: 'Pagamento boleto bancario',
      due_date: '2026-05-24',
      financial_entity_name: null,
      financial_account_id: null,
      amount_cents: 9850,
      paid_amount_cents: 0
    })],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].target.payable_id, undefined);
});

test('draft ignora sobreposição genérica para ledger com valor e data iguais', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Tarifa servico banco',
      normalized_description: 'tarifa servico banco',
      statement_date: '2026-05-24',
      posted_at: '2026-05-24',
      amount_cents: -9850
    })],
    payables: [],
    receivables: [],
    transactions: [transactionFixture({
      id: 'txn-generic-overlap',
      note: 'Tarifa bancaria servico',
      due_date: '2026-05-24',
      settlement_date: null,
      competence_date: null,
      financial_entity_name: null,
      financial_account_id: null,
      amount_cents: 9850
    })],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].target.financial_transaction_id, undefined);
});

test('draft bloqueia ambiguidade entre títulos do mesmo tipo', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [
      payableFixture({ id: 'pay-1' }),
      payableFixture({ id: 'pay-2' })
    ],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].blocking_reason, 'Mais de um título possível para esta linha.');
});

test('draft não reutiliza o mesmo alvo em duas linhas OFX', () => {
  const secondLine = ofxLineFixture({
    id: 'ofx-line-second',
    dedupe_hash: 'hash-second'
  });
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut, secondLine],
    payables: [payable],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'payable_match');
  assert.equal(items[0].target.payable_id, 'pay-1');
  assert.notEqual(items[1].target.payable_id, 'pay-1');
  assert.equal(items[1].decision_type, 'needs_review');
});

test('draft sugere pagamento parcial sem autoaprovar', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      amount_cents: -5000,
      description: 'Pagto parcial Atlas Cloud',
      normalized_description: 'pagto parcial atlas cloud'
    })],
    payables: [payableFixture({
      amount_cents: 9850,
      paid_amount_cents: 0
    })],
    receivables: [],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'payable_match');
  assert.equal(items[0].confidence_band, 'review');
  assert.equal(items[0].reasons.some((reason) => reason.label === 'Pagamento parcial'), true);
});

test('draft sugere recebimento parcial sem autoaprovar', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      ...lineIn,
      amount_cents: 150000,
      description: 'PIX parcial Cliente Alfa',
      normalized_description: 'pix parcial cliente alfa'
    })],
    payables: [],
    receivables: [receivableFixture({
      amount_cents: 450000,
      received_amount_cents: 0
    })],
    transactions: [],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'receivable_match');
  assert.equal(items[0].confidence_band, 'review');
  assert.equal(items[0].reasons.some((reason) => reason.label === 'Recebimento parcial'), true);
});

test('draft bloqueia ambiguidade entre lançamentos ledger', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [
      transactionFixture({ id: 'txn-1' }),
      transactionFixture({ id: 'txn-2' })
    ],
    memories: [],
    duplicateHashes: new Set()
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].blocking_reason, 'Mais de um lançamento possível para esta linha.');
});

test('draft prefere memória mais específica e mais confiante', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [
      {
        id: 'mem-generic',
        normalized_pattern: 'pagto',
        direction: 'outflow',
        financial_entity_id: 'entity-generic',
        financial_entity_name: 'Fornecedor Genérico',
        financial_category_id: 'cat-generic',
        financial_category_name: 'Geral',
        financial_cost_center_id: null,
        financial_cost_center_name: null,
        financial_payment_method_id: null,
        financial_payment_method_name: null,
        usage_count: 20,
        confidence_score: 0.84
      },
      {
        id: 'mem-specific',
        normalized_pattern: 'pagto atlas cloud',
        direction: 'outflow',
        financial_entity_id: 'entity-atlas',
        financial_entity_name: 'Atlas Cloud',
        financial_category_id: 'cat-software',
        financial_category_name: 'Software',
        financial_cost_center_id: 'cc-ops',
        financial_cost_center_name: 'Operações',
        financial_payment_method_id: 'pm-pix',
        financial_payment_method_name: 'PIX',
        usage_count: 2,
        confidence_score: 0.9
      }
    ]
  });

  assert.equal(items[0].decision_type, 'new_transaction');
  assert.equal(items[0].proposed.financial_entity_id, 'entity-atlas');
});

test('draft mantém memória fraca em revisão com campos propostos', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [{
      id: 'mem-weak',
      normalized_pattern: 'atlas cloud',
      direction: 'outflow',
      financial_entity_id: 'entity-atlas',
      financial_entity_name: 'Atlas Cloud',
      financial_category_id: 'cat-software',
      financial_category_name: 'Software',
      financial_cost_center_id: 'cc-ops',
      financial_cost_center_name: 'Operações',
      financial_payment_method_id: 'pm-pix',
      financial_payment_method_name: 'PIX',
      usage_count: 1,
      confidence_score: 0.55
    }]
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].confidence_band, 'blocked');
  assert.equal(items[0].proposed.financial_entity_id, 'entity-atlas');
  assert.equal(items[0].blocking_reason, 'Memória financeira com confiança insuficiente.');
});

test('draft ignora memória genérica pix mesmo com alta confiança', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineIn],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [{
      id: 'mem-pix',
      normalized_pattern: 'pix',
      direction: 'inflow',
      financial_entity_id: 'entity-generic',
      financial_entity_name: 'Entrada PIX',
      financial_category_id: 'cat-generic',
      financial_category_name: 'Receita genérica',
      financial_cost_center_id: null,
      financial_cost_center_name: null,
      financial_payment_method_id: 'pm-pix',
      financial_payment_method_name: 'PIX',
      usage_count: 100,
      confidence_score: 0.94
    }]
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].proposed.financial_entity_id, null);
});

test('draft ignora memória genérica boleto ou tarifa mesmo com alta confiança', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [ofxLineFixture({
      description: 'Boleto tarifa banco',
      normalized_description: 'boleto tarifa banco'
    })],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [
      {
        id: 'mem-boleto',
        normalized_pattern: 'boleto',
        direction: 'outflow',
        financial_entity_id: 'entity-boleto',
        financial_entity_name: 'Boleto',
        financial_category_id: 'cat-fees',
        financial_category_name: 'Taxas',
        financial_cost_center_id: null,
        financial_cost_center_name: null,
        financial_payment_method_id: null,
        financial_payment_method_name: null,
        usage_count: 100,
        confidence_score: 0.94
      },
      {
        id: 'mem-tarifa',
        normalized_pattern: 'tarifa',
        direction: 'outflow',
        financial_entity_id: 'entity-tarifa',
        financial_entity_name: 'Tarifa',
        financial_category_id: 'cat-fees',
        financial_category_name: 'Taxas',
        financial_cost_center_id: null,
        financial_cost_center_name: null,
        financial_payment_method_id: null,
        financial_payment_method_name: null,
        usage_count: 100,
        confidence_score: 0.94
      }
    ]
  });

  assert.equal(items[0].decision_type, 'needs_review');
  assert.equal(items[0].proposed.financial_entity_id, null);
});

test('draft aceita memória específica atlas cloud sem token genérico', () => {
  const items = buildFinanceReconciliationDraftItems({
    financial_account_id: 'acc-1',
    lines: [lineOut],
    payables: [],
    receivables: [],
    transactions: [],
    duplicateHashes: new Set(),
    memories: [{
      id: 'mem-atlas-cloud',
      normalized_pattern: 'atlas cloud',
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
  assert.equal(items[0].proposed.financial_entity_id, 'entity-atlas');
});
