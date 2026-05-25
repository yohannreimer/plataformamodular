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

test('parseFinanceOfx rejeita datas OFX inválidas', () => {
  for (const dtposted of ['abcdefgh', '20261399', '20260231']) {
    assert.throws(
      () => parseFinanceOfx({
        organization_id: 'org-holand',
        financial_account_id: 'acc-1',
        source_file_name: 'data-invalida.ofx',
        ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>${dtposted}
<TRNAMT>10.00
<FITID>bad-date
<MEMO>Movimento inválido
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
      }),
      /Linha OFX sem data válida/
    );
  }
});

test('parseFinanceOfx rejeita valores OFX inválidos', () => {
  for (const trnamt of ['123abc', '12.34.56', '--98.50']) {
    assert.throws(
      () => parseFinanceOfx({
        organization_id: 'org-holand',
        financial_account_id: 'acc-1',
        source_file_name: 'valor-invalido.ofx',
        ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>${trnamt}
<FITID>bad-amount
<MEMO>Movimento inválido
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
      }),
      /Linha OFX sem valor válido/
    );
  }
});
