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

type DraftBuildState = {
  consumedPayableIds: Set<string>;
  consumedReceivableIds: Set<string>;
  consumedTransactionIds: Set<string>;
};

type CandidateScore = {
  score: number;
  reasons: FinanceReconciliationSuggestionReasonDto[];
  isPartial: boolean;
  hasTextEvidence: boolean;
};

type ScoredCandidate<T> = CandidateScore & {
  candidate: T;
};

const DUPLICATE_BLOCKING_REASON = 'Linha OFX já importada para esta conta.';
const REVIEW_BLOCKING_REASON = 'Revise os campos financeiros antes de aprovar.';
const AMBIGUOUS_TITLE_BLOCKING_REASON = 'Mais de um título possível para esta linha.';
const AMBIGUOUS_LEDGER_BLOCKING_REASON = 'Mais de um lançamento possível para esta linha.';
const WEAK_MEMORY_BLOCKING_REASON = 'Memória financeira com confiança insuficiente.';
const SETTLEMENT_STATUSES = new Set(['open', 'partial', 'overdue']);
const MIN_MATCH_SCORE = 0.6;
const AMBIGUOUS_SCORE_GAP = 0.04;
const GENERIC_RECONCILIATION_TOKENS = new Set([
  'pix',
  'pagto',
  'pagamento',
  'pago',
  'boleto',
  'tarifa',
  'ted',
  'doc',
  'transf',
  'transferencia',
  'recebimento',
  'recebido',
  'compra',
  'cartao',
  'debito',
  'credito',
  'servico',
  'mensalidade',
  'banco',
  'bancaria',
  'bancario'
]);

export function confidenceBand(score: number): FinanceReconciliationDraftItemDto['confidence_band'] {
  if (score >= 0.95) return 'auto';
  if (score >= 0.8) return 'ready';
  if (score >= 0.6) return 'review';
  return 'blocked';
}

export function buildFinanceReconciliationDraftItems(
  input: BuildFinanceReconciliationDraftItemsInput
): FinanceReconciliationDraftItemDto[] {
  const state: DraftBuildState = {
    consumedPayableIds: new Set(),
    consumedReceivableIds: new Set(),
    consumedTransactionIds: new Set()
  };
  return input.lines.map((line) => buildDraftItem(input, line, state));
}

function buildDraftItem(
  input: BuildFinanceReconciliationDraftItemsInput,
  line: FinanceOfxLineDto,
  state: DraftBuildState
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

  const direction = lineDirection(line);

  if (direction === 'outflow') {
    const payableResult = selectCandidate(input.payables
      .filter((candidate) => !state.consumedPayableIds.has(candidate.id))
      .map((candidate) => scorePayableCandidate(input.financial_account_id, line, candidate))
      .filter((candidate): candidate is ScoredCandidate<FinancePayableDto> => candidate !== null));
    if (payableResult.ambiguous) {
      return needsReview(input.financial_account_id, line, AMBIGUOUS_TITLE_BLOCKING_REASON);
    }
    const payable = payableResult.selected;
    if (payable) {
      state.consumedPayableIds.add(payable.candidate.id);
      return draftItem({
        financialAccountId: input.financial_account_id,
        line,
        decisionType: 'payable_match',
        score: payable.score,
        target: { payable_id: payable.candidate.id },
        proposed: proposedFromPayable(input.financial_account_id, line, payable.candidate),
        reasons: payable.reasons
      });
    }
  }

  if (direction === 'inflow') {
    const receivableResult = selectCandidate(input.receivables
      .filter((candidate) => !state.consumedReceivableIds.has(candidate.id))
      .map((candidate) => scoreReceivableCandidate(input.financial_account_id, line, candidate))
      .filter((candidate): candidate is ScoredCandidate<FinanceReceivableDto> => candidate !== null));
    if (receivableResult.ambiguous) {
      return needsReview(input.financial_account_id, line, AMBIGUOUS_TITLE_BLOCKING_REASON);
    }
    const receivable = receivableResult.selected;
    if (receivable) {
      state.consumedReceivableIds.add(receivable.candidate.id);
      return draftItem({
        financialAccountId: input.financial_account_id,
        line,
        decisionType: 'receivable_match',
        score: receivable.score,
        target: { receivable_id: receivable.candidate.id },
        proposed: proposedFromReceivable(input.financial_account_id, line, receivable.candidate),
        reasons: receivable.reasons
      });
    }
  }

  const transactionResult = selectCandidate(input.transactions
    .filter((candidate) => !state.consumedTransactionIds.has(candidate.id))
    .map((candidate) => scoreTransactionCandidate(input.financial_account_id, line, candidate))
    .filter((candidate): candidate is ScoredCandidate<FinanceTransactionDto> => candidate !== null));
  if (transactionResult.ambiguous) {
    return needsReview(input.financial_account_id, line, AMBIGUOUS_LEDGER_BLOCKING_REASON);
  }
  const transaction = transactionResult.selected;
  if (transaction) {
    state.consumedTransactionIds.add(transaction.candidate.id);
    return draftItem({
      financialAccountId: input.financial_account_id,
      line,
      decisionType: 'ledger_match',
      score: transaction.score,
      target: { financial_transaction_id: transaction.candidate.id },
      proposed: proposedFromTransaction(input.financial_account_id, line, transaction.candidate),
      reasons: transaction.reasons
    });
  }

  const memory = selectMemory(line, direction, input.memories);
  if (memory) {
    const score = Number(Math.min(memory.confidence_score, 0.94).toFixed(2));
    const proposed = proposedFromMemory(input.financial_account_id, line, memory);
    const reasons: FinanceReconciliationSuggestionReasonDto[] = [{
      label: 'Memória financeira',
      detail: `${memory.usage_count} conciliações anteriores parecidas.`,
      tone: 'positive'
    }];
    if (score < MIN_MATCH_SCORE) {
      return draftItem({
        financialAccountId: input.financial_account_id,
        line,
        decisionType: 'needs_review',
        score,
        proposed,
        reasons,
        blockingReason: WEAK_MEMORY_BLOCKING_REASON
      });
    }
    return draftItem({
      financialAccountId: input.financial_account_id,
      line,
      decisionType: 'new_transaction',
      score,
      proposed,
      reasons
    });
  }

  return needsReview(input.financial_account_id, line, REVIEW_BLOCKING_REASON);
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

function selectCandidate<T>(candidates: Array<ScoredCandidate<T>>): {
  selected: ScoredCandidate<T> | null;
  ambiguous: boolean;
} {
  const plausible = candidates
    .filter((candidate) => candidate.score >= MIN_MATCH_SCORE && candidate.hasTextEvidence)
    .sort((left, right) => right.score - left.score);
  const [best, second] = plausible;
  if (!best) {
    return { selected: null, ambiguous: false };
  }
  if (second && best.score - second.score <= AMBIGUOUS_SCORE_GAP) {
    return { selected: null, ambiguous: true };
  }
  return { selected: best, ambiguous: false };
}

function scorePayableCandidate(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  payable: FinancePayableDto
): ScoredCandidate<FinancePayableDto> | null {
  if (!SETTLEMENT_STATUSES.has(payable.status)) return null;
  const amount = Math.abs(line.amount_cents);
  const outstanding = outstandingPayableAmount(payable);
  if (amount > outstanding) return null;
  return {
    candidate: payable,
    ...scoreFinancialCandidate({
      financialAccountId,
      line,
      isPartial: amount < outstanding,
      partialLabel: 'Pagamento parcial',
      anchorDate: payable.due_date,
      description: payable.description,
      entityName: payable.financial_entity_name ?? payable.supplier_name,
      categoryName: payable.financial_category_name,
      costCenterName: payable.financial_cost_center_name,
      accountId: payable.financial_account_id
    })
  };
}

function scoreReceivableCandidate(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  receivable: FinanceReceivableDto
): ScoredCandidate<FinanceReceivableDto> | null {
  if (!SETTLEMENT_STATUSES.has(receivable.status)) return null;
  const amount = Math.abs(line.amount_cents);
  const outstanding = outstandingReceivableAmount(receivable);
  if (amount > outstanding) return null;
  return {
    candidate: receivable,
    ...scoreFinancialCandidate({
      financialAccountId,
      line,
      isPartial: amount < outstanding,
      partialLabel: 'Recebimento parcial',
      anchorDate: receivable.due_date,
      description: receivable.description,
      entityName: receivable.financial_entity_name ?? receivable.customer_name,
      categoryName: receivable.financial_category_name,
      costCenterName: receivable.financial_cost_center_name,
      accountId: receivable.financial_account_id
    })
  };
}

function scoreTransactionCandidate(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  transaction: FinanceTransactionDto
): ScoredCandidate<FinanceTransactionDto> | null {
  if (transaction.is_deleted || transaction.status === 'canceled') return null;
  if (transactionDirection(transaction) !== lineDirection(line)) return null;
  if (Math.abs(transaction.amount_cents) !== Math.abs(line.amount_cents)) return null;
  return {
    candidate: transaction,
    ...scoreFinancialCandidate({
      financialAccountId,
      line,
      isPartial: false,
      partialLabel: null,
      anchorDate: transaction.settlement_date ?? transaction.due_date ?? transaction.competence_date ?? transaction.issue_date,
      description: transaction.note,
      entityName: transaction.financial_entity_name,
      categoryName: transaction.financial_category_name,
      costCenterName: transaction.financial_cost_center_name,
      accountId: transaction.financial_account_id
    })
  };
}

function scoreFinancialCandidate(input: {
  financialAccountId: string;
  line: FinanceOfxLineDto;
  isPartial: boolean;
  partialLabel: string | null;
  anchorDate: string | null | undefined;
  description: string | null | undefined;
  entityName: string | null | undefined;
  categoryName: string | null | undefined;
  costCenterName: string | null | undefined;
  accountId: string | null | undefined;
}): CandidateScore {
  const reasons: FinanceReconciliationSuggestionReasonDto[] = [
    input.isPartial && input.partialLabel ? partialAmountReason(input.partialLabel) : exactAmountReason()
  ];
  let score = input.isPartial ? 0.28 : 0.42;

  const dateGap = dateGapDays(input.line.posted_at ?? input.line.statement_date, input.anchorDate);
  if (dateGap !== null) {
    if (dateGap <= 1) {
      score += 0.2;
      reasons.push({ label: 'Data muito próxima', detail: `${dateGap} dia de diferença.`, tone: 'positive' });
    } else if (dateGap <= 3) {
      score += 0.14;
      reasons.push({ label: 'Data próxima', detail: `${dateGap} dias de diferença.`, tone: 'positive' });
    } else if (dateGap <= 7) {
      score += 0.08;
      reasons.push({ label: 'Data aceitável', detail: `${dateGap} dias de diferença.`, tone: 'neutral' });
    }
  }

  const textScore = descriptionScore(input.line.normalized_description, [
    input.description,
    input.entityName,
    input.categoryName,
    input.costCenterName
  ]);
  let hasTextEvidence = textScore > 0;
  if (textScore > 0) {
    score += Math.min(0.22, textScore * 0.22);
    reasons.push({ label: 'Descrição parecida', detail: `${Math.round(textScore * 100)}% de sinal textual.`, tone: 'positive' });
  }

  if (input.entityName && normalizedTextIncludes(input.line.normalized_description, input.entityName)) {
    hasTextEvidence = true;
    score += 0.12;
    reasons.push({ label: 'Entidade encontrada', detail: input.entityName, tone: 'positive' });
  }

  if (input.accountId && input.accountId === input.financialAccountId) {
    score += 0.08;
    reasons.push({ label: 'Conta compatível', detail: 'A conta financeira já está vinculada ao lançamento.', tone: 'positive' });
  }

  const cappedScore = input.isPartial ? Math.min(score, 0.79) : Math.min(score, 0.98);
  return {
    score: Number(cappedScore.toFixed(2)),
    reasons,
    isPartial: input.isPartial,
    hasTextEvidence
  };
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

function partialAmountReason(label: string): FinanceReconciliationSuggestionReasonDto {
  return {
    label,
    detail: 'O valor do extrato cobre parte do saldo em aberto.',
    tone: 'warning'
  };
}

function needsReview(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  blockingReason: string
): FinanceReconciliationDraftItemDto {
  return draftItem({
    financialAccountId,
    line,
    decisionType: 'needs_review',
    score: 0.4,
    blockingReason
  });
}

function selectMemory(
  line: FinanceOfxLineDto,
  direction: ReconciliationDirection,
  memories: FinanceReconciliationMemoryCandidate[]
) {
  const lineTokens = reconciliationTokens(line.normalized_description);
  return memories
    .filter((candidate) => (
      candidate.direction === direction
      && isMeaningfulMemoryPattern(candidate)
      && tokenSequenceIncludes(lineTokens, reconciliationTokens(candidate.normalized_pattern))
    ))
    .sort((left, right) => {
      const specificity = usefulMemoryTokens(right).length - usefulMemoryTokens(left).length;
      if (specificity !== 0) return specificity;
      const patternLength = reconciliationTokens(right.normalized_pattern).length - reconciliationTokens(left.normalized_pattern).length;
      if (patternLength !== 0) return patternLength;
      const confidence = right.confidence_score - left.confidence_score;
      if (confidence !== 0) return confidence;
      return right.usage_count - left.usage_count;
    })[0] ?? null;
}

function isMeaningfulMemoryPattern(memory: FinanceReconciliationMemoryCandidate) {
  const usefulTokens = usefulMemoryTokens(memory);
  if (usefulTokens.length >= 2) return true;
  return false;
}

function usefulMemoryTokens(memory: Pick<FinanceReconciliationMemoryCandidate, 'normalized_pattern'>) {
  return reconciliationTokens(memory.normalized_pattern)
    .filter((token) => !GENERIC_RECONCILIATION_TOKENS.has(token));
}

function tokenSequenceIncludes(lineTokens: string[], patternTokens: string[]) {
  if (patternTokens.length === 0 || patternTokens.length > lineTokens.length) return false;
  for (let start = 0; start <= lineTokens.length - patternTokens.length; start += 1) {
    if (patternTokens.every((token, index) => lineTokens[start + index] === token)) {
      return true;
    }
  }
  return false;
}

function proposedFromMemory(
  financialAccountId: string,
  line: FinanceOfxLineDto,
  memory: FinanceReconciliationMemoryCandidate
): FinanceReconciliationDraftItemDto['proposed'] {
  return {
    financial_entity_id: memory.financial_entity_id,
    financial_entity_name: memory.financial_entity_name,
    financial_category_id: memory.financial_category_id,
    financial_category_name: memory.financial_category_name,
    financial_cost_center_id: memory.financial_cost_center_id,
    financial_cost_center_name: memory.financial_cost_center_name,
    financial_payment_method_id: memory.financial_payment_method_id,
    financial_payment_method_name: memory.financial_payment_method_name,
    financial_account_id: financialAccountId,
    note: line.description,
    save_memory: true
  };
}

function dateGapDays(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return null;
  const leftValue = new Date(`${left}T00:00:00.000Z`).getTime();
  const rightValue = new Date(`${right}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;
  return Math.abs(Math.round((leftValue - rightValue) / 86_400_000));
}

function descriptionScore(lineDescription: string, candidateParts: Array<string | null | undefined>) {
  const lineTokens = reconciliationTokens(lineDescription);
  if (lineTokens.length === 0) return 0;
  const candidateTokens = new Set(reconciliationTokens(candidateParts.filter(Boolean).join(' ')));
  if (candidateTokens.size === 0) return 0;
  const overlap = lineTokens.filter((token) => candidateTokens.has(token)).length;
  return overlap / Math.max(1, Math.min(lineTokens.length, 5));
}

function normalizedTextIncludes(haystack: string, needle: string) {
  return reconciliationTokens(needle)
    .some((token) => ` ${haystack} `.includes(` ${token} `));
}

function reconciliationTokens(value: string | null | undefined) {
  return normalizeReconciliationText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !GENERIC_RECONCILIATION_TOKENS.has(token));
}

function normalizeReconciliationText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
