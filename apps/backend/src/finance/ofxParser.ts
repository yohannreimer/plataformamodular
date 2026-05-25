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
