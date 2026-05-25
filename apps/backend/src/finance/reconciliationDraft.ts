import type {
  FinanceOfxLineDto,
  FinancePayableDto,
  FinanceReceivableDto,
  FinanceReconciliationDraftItemDto,
  FinanceReconciliationSuggestionReasonDto,
  FinanceTransactionDto
} from './types.js';

type ReconciliationDirection = 'inflow' | 'outflow';

export type FinanceReconciliationMemoryCandidate = {
  id: string;
  normalized_pattern: string;
  direction: ReconciliationDirection;
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

type BuildFinanceReconciliationDraftItemsInput = {
  financial_account_id: string;
  lines: FinanceOfxLineDto[];
  payables: FinancePayableDto[];
  receivables: FinanceReceivableDto[];
  transactions: FinanceTransactionDto[];
  memories: FinanceReconciliationMemoryCandidate[];
  duplicateHashes: Set<string>;
};

const DUPLICATE_BLOCKING_REASON = 'Linha OFX já importada para esta conta.';
const REVIEW_BLOCKING_REASON = 'Revise os campos financeiros antes de aprovar.';
const SETTLEMENT_STATUSES = new Set(['open', 'partial', 'overdue']);

export function confidenceBand(score: number): FinanceReconciliationDraftItemDto['confidence_band'] {
  if (score >= 0.95) return 'auto';
  if (score >= 0.8) return 'ready';
  if (score >= 0.6) return 'review';
  return 'blocked';
}

export function buildFinanceReconciliationDraftItems(
  input: BuildFinanceReconciliationDraftItemsInput
): FinanceReconciliationDraftItemDto[] {
  return input.lines.map((line) => buildDraftItem(input, line));
}

function buildDraftItem(
  input: BuildFinanceReconciliationDraftItemsInput,
  line: FinanceOfxLineDto
): FinanceReconciliationDraftItemDto {
  if (input.duplicateHashes.has(line.dedupe_hash)) {
    return draftItem({
      financialAccountId: input.financial_account_id,
      line,
      decisionType: 'duplicate',
      score: 0,
      blockingReason: DUPLICATE_BLOCKING_REASON
    });
  }

  const amountCents = Math.abs(line.amount_cents);
  const direction = lineDirection(line);

  if (direction === 'outflow') {
    const payable = input.payables.find((candidate) => (
      SETTLEMENT_STATUSES.has(candidate.status)
      && outstandingPayableAmount(candidate) === amountCents
    ));
    if (payable) {
      return draftItem({
        financialAccountId: input.financial_account_id,
        line,
        decisionType: 'payable_match',
        score: 0.95,
        target: { payable_id: payable.id },
        proposed: proposedFromPayable(input.financial_account_id, line, payable),
        reasons: [exactAmountReason()]
      });
    }
  }

  if (direction === 'inflow') {
    const receivable = input.receivables.find((candidate) => (
      SETTLEMENT_STATUSES.has(candidate.status)
      && outstandingReceivableAmount(candidate) === amountCents
    ));
    if (receivable) {
      return draftItem({
        financialAccountId: input.financial_account_id,
        line,
        decisionType: 'receivable_match',
        score: 0.95,
        target: { receivable_id: receivable.id },
        proposed: proposedFromReceivable(input.financial_account_id, line, receivable),
        reasons: [exactAmountReason()]
      });
    }
  }

  const transaction = input.transactions.find((candidate) => (
    !candidate.is_deleted
    && candidate.status !== 'canceled'
    && transactionDirection(candidate) === direction
    && Math.abs(candidate.amount_cents) === amountCents
  ));
  if (transaction) {
    return draftItem({
      financialAccountId: input.financial_account_id,
      line,
      decisionType: 'ledger_match',
      score: 0.9,
      target: { financial_transaction_id: transaction.id },
      proposed: proposedFromTransaction(input.financial_account_id, line, transaction),
      reasons: [exactAmountReason()]
    });
  }

  const memory = input.memories.find((candidate) => (
    candidate.direction === direction
    && candidate.normalized_pattern.length > 0
    && line.normalized_description.includes(candidate.normalized_pattern)
  ));
  if (memory) {
    const score = Number(Math.min(memory.confidence_score, 0.94).toFixed(2));
    return draftItem({
      financialAccountId: input.financial_account_id,
      line,
      decisionType: 'new_transaction',
      score,
      proposed: {
        financial_entity_id: memory.financial_entity_id,
        financial_entity_name: memory.financial_entity_name,
        financial_category_id: memory.financial_category_id,
        financial_category_name: memory.financial_category_name,
        financial_cost_center_id: memory.financial_cost_center_id,
        financial_cost_center_name: memory.financial_cost_center_name,
        financial_payment_method_id: memory.financial_payment_method_id,
        financial_payment_method_name: memory.financial_payment_method_name,
        financial_account_id: input.financial_account_id,
        note: line.description,
        save_memory: true
      },
      reasons: [{
        label: 'Memória financeira',
        detail: `${memory.usage_count} conciliações anteriores parecidas.`,
        tone: 'positive'
      }]
    });
  }

  return draftItem({
    financialAccountId: input.financial_account_id,
    line,
    decisionType: 'needs_review',
    score: 0.4,
    blockingReason: REVIEW_BLOCKING_REASON
  });
}

function draftItem(params: {
  financialAccountId: string;
  line: FinanceOfxLineDto;
  decisionType: FinanceReconciliationDraftItemDto['decision_type'];
  score: number;
  reasons?: FinanceReconciliationSuggestionReasonDto[];
  target?: FinanceReconciliationDraftItemDto['target'];
  proposed?: FinanceReconciliationDraftItemDto['proposed'];
  blockingReason?: string | null;
}): FinanceReconciliationDraftItemDto {
  return {
    id: `draft-${params.line.id}`,
    line: params.line,
    decision_type: params.decisionType,
    confidence_score: params.score,
    confidence_band: confidenceBand(params.score),
    reasons: params.reasons ?? [],
    target: params.target ?? {},
    proposed: params.proposed ?? emptyProposed(params.financialAccountId, params.line),
    blocking_reason: params.blockingReason ?? null
  };
}

function lineDirection(line: Pick<FinanceOfxLineDto, 'amount_cents'>): ReconciliationDirection {
  return line.amount_cents >= 0 ? 'inflow' : 'outflow';
}

function transactionDirection(transaction: Pick<FinanceTransactionDto, 'kind'>): ReconciliationDirection | null {
  if (transaction.kind === 'income') return 'inflow';
  if (transaction.kind === 'expense') return 'outflow';
  return null;
}

function outstandingPayableAmount(payable: Pick<FinancePayableDto, 'amount_cents' | 'paid_amount_cents'>) {
  return Math.max(0, payable.amount_cents - payable.paid_amount_cents);
}

function outstandingReceivableAmount(receivable: Pick<FinanceReceivableDto, 'amount_cents' | 'received_amount_cents'>) {
  return Math.max(0, receivable.amount_cents - receivable.received_amount_cents);
}

function exactAmountReason(): FinanceReconciliationSuggestionReasonDto {
  return {
    label: 'Valor exato',
    detail: 'O valor do extrato bate com o lançamento.',
    tone: 'positive'
  };
}

function emptyProposed(
  financialAccountId: string,
  line: Pick<FinanceOfxLineDto, 'description'>
): FinanceReconciliationDraftItemDto['proposed'] {
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

function proposedFromPayable(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  payable: FinancePayableDto
): FinanceReconciliationDraftItemDto['proposed'] {
  return {
    ...emptyProposed(financialAccountId, line),
    financial_entity_id: payable.financial_entity_id,
    financial_entity_name: payable.financial_entity_name,
    financial_category_id: payable.financial_category_id,
    financial_category_name: payable.financial_category_name,
    financial_cost_center_id: payable.financial_cost_center_id,
    financial_cost_center_name: payable.financial_cost_center_name,
    financial_payment_method_id: payable.financial_payment_method_id,
    financial_payment_method_name: payable.financial_payment_method_name
  };
}

function proposedFromReceivable(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  receivable: FinanceReceivableDto
): FinanceReconciliationDraftItemDto['proposed'] {
  return {
    ...emptyProposed(financialAccountId, line),
    financial_entity_id: receivable.financial_entity_id,
    financial_entity_name: receivable.financial_entity_name,
    financial_category_id: receivable.financial_category_id,
    financial_category_name: receivable.financial_category_name,
    financial_cost_center_id: receivable.financial_cost_center_id,
    financial_cost_center_name: receivable.financial_cost_center_name,
    financial_payment_method_id: receivable.financial_payment_method_id,
    financial_payment_method_name: receivable.financial_payment_method_name
  };
}

function proposedFromTransaction(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  transaction: FinanceTransactionDto
): FinanceReconciliationDraftItemDto['proposed'] {
  return {
    ...emptyProposed(financialAccountId, line),
    financial_entity_id: transaction.financial_entity_id,
    financial_entity_name: transaction.financial_entity_name,
    financial_category_id: transaction.financial_category_id,
    financial_category_name: transaction.financial_category_name,
    financial_cost_center_id: transaction.financial_cost_center_id,
    financial_cost_center_name: transaction.financial_cost_center_name,
    financial_payment_method_id: transaction.financial_payment_method_id,
    financial_payment_method_name: transaction.financial_payment_method_name
  };
}
