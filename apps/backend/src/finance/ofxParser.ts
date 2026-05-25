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
  const value = match?.[1]?.trim();
  return value ? decodeOfxEntities(value) : null;
}

function decodeOfxEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, body: string) => {
    const normalizedBody = body.toLowerCase();
    if (normalizedBody === 'amp') {
      return '&';
    }
    if (normalizedBody === 'quot') {
      return '"';
    }
    if (normalizedBody === 'apos') {
      return "'";
    }
    if (normalizedBody === 'lt') {
      return '<';
    }
    if (normalizedBody === 'gt') {
      return '>';
    }

    const codePoint = normalizedBody.startsWith('#x')
      ? Number.parseInt(normalizedBody.slice(2), 16)
      : Number.parseInt(normalizedBody.slice(1), 10);
    if (!isXmlScalarCodePoint(codePoint)) {
      return entity;
    }

    return String.fromCodePoint(codePoint);
  });
}

function isXmlScalarCodePoint(codePoint: number) {
  if (!Number.isInteger(codePoint) || codePoint > 0x10ffff) {
    return false;
  }
  if (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d) {
    return false;
  }
  return codePoint < 0xd800 || codePoint > 0xdfff;
}

function parseOfxDate(value: string | null) {
  if (!value || value.length < 8) {
    throw new Error('Linha OFX sem data válida.');
  }
  const dateText = value.slice(0, 8);
  if (!/^\d{8}$/.test(dateText)) {
    throw new Error('Linha OFX sem data válida.');
  }

  const year = Number.parseInt(dateText.slice(0, 4), 10);
  const month = Number.parseInt(dateText.slice(4, 6), 10);
  const day = Number.parseInt(dateText.slice(6, 8), 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Linha OFX sem data válida.');
  }

  return `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`;
}

function parseOfxAmountToCents(value: string | null) {
  if (!value) {
    throw new Error('Linha OFX sem valor válido.');
  }
  const normalizedValue = value.replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalizedValue)) {
    throw new Error('Linha OFX sem valor válido.');
  }

  const sign = normalizedValue.startsWith('-') ? -1 : 1;
  const unsignedValue = normalizedValue.replace(/^[+-]/, '');
  const [wholePart, decimalPart = ''] = unsignedValue.split('.');
  const centDigits = (decimalPart + '00').slice(0, 2);
  let absoluteCents = BigInt(wholePart) * 100n + BigInt(centDigits);
  if (shouldRoundHalfAwayFromZeroToCents(decimalPart)) {
    absoluteCents += 1n;
  }

  const cents = absoluteCents * BigInt(sign);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('Linha OFX sem valor válido.');
  }
  return Number(cents);
}

function shouldRoundHalfAwayFromZeroToCents(decimalPart: string) {
  return decimalPart.length > 2 && Number.parseInt(decimalPart[2], 10) >= 5;
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
    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Linha OFX ${index + 1}: ${message}`);
    }
  });

  return {
    source_file_hash: createHash('sha256').update(input.ofx_text).digest('hex'),
    lines
  };
}
