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
    invalid_reason: null,
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

test('parseFinanceOfx inclui contexto da linha OFX em erros de bloco', () => {
  assert.throws(
    () => parseFinanceOfx({
      organization_id: 'org-holand',
      financial_account_id: 'acc-1',
      source_file_name: 'linha-invalida.ofx',
      ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>10.00
<FITID>ok
<MEMO>Movimento válido
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>123abc
<FITID>bad-amount
<MEMO>Movimento inválido
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
    }),
    /Linha OFX 2: Linha OFX sem valor válido/
  );
});

test('parseFinanceOfx preserva linhas inválidas como exceções quando solicitado', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'linhas-invalidas.ofx',
    preserve_invalid_lines: true,
    ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>10.00
<FITID>ok
<MEMO>Movimento válido
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>123abc
<FITID>bad-amount
<MEMO>Movimento inválido
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
  });

  assert.equal(parsed.lines.length, 2);
  assert.equal(parsed.lines[0].invalid_reason, null);
  assert.equal(parsed.lines[1].id, 'ofx-line-2');
  assert.equal(parsed.lines[1].description, 'Movimento inválido');
  assert.equal(parsed.lines[1].amount_cents, 0);
  assert.match(parsed.lines[1].invalid_reason ?? '', /Linha OFX sem valor válido/);
});

test('parseFinanceOfx lê saldo quando a linha OFX trouxer BALAMT', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'saldo.ofx',
    ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>10.00
<BALAMT>1234.56
<FITID>balance
<MEMO>Movimento com saldo
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
  });

  assert.equal(parsed.lines[0].balance_cents, 123456);
});

test('parseFinanceOfx lê período e saldo final do extrato OFX', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'saldo-final.ofx',
    ofx_text: `
<OFX>
<BANKTRANLIST>
<DTSTART>20260401000000[-3:BRT]
<DTEND>20260430000000[-3:BRT]
<STMTTRN>
<DTPOSTED>20260430
<TRNAMT>196.60
<FITID>movement
<MEMO>PIX recebido Cliente Alfa
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>301.71
<DTASOF>20260430000000[-3:BRT]
</LEDGERBAL>
</OFX>
`
  });

  assert.equal(parsed.period_start, '2026-04-01');
  assert.equal(parsed.period_end, '2026-04-30');
  assert.deepEqual(parsed.statement_balance, {
    balance_cents: 30171,
    as_of: '2026-04-30',
    source: 'ledger'
  });
});

test('parseFinanceOfx preserva entidades numéricas XML inválidas em descrições OFX', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'entidades-invalidas.ofx',
    ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>10.00
<FITID>invalid-entities
<MEMO>Controle &#1; e &#xD800;
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
  });

  assert.equal(parsed.lines[0].description, 'Controle &#1; e &#xD800;');
});

test('parseFinanceOfx converte valores OFX para centavos com arredondamento decimal explícito', () => {
  const cases: Array<[string, number]> = [
    ['-98.50', -9850],
    ['4500.00', 450000],
    ['19', 1900],
    ['19.9', 1990],
    ['19,90', 1990],
    ['1.005', 101],
    ['10.075', 1008],
    ['-1.005', -101]
  ];

  for (const [trnamt, expectedAmountCents] of cases) {
    const parsed = parseFinanceOfx({
      organization_id: 'org-holand',
      financial_account_id: 'acc-1',
      source_file_name: 'valores.ofx',
      ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>${trnamt}
<FITID>${trnamt}
<MEMO>Movimento ${trnamt}
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
    });

    assert.equal(parsed.lines[0].amount_cents, expectedAmountCents);
  }
});

test('parseFinanceOfx decodifica entidades XML em descrições OFX', () => {
  const parsed = parseFinanceOfx({
    organization_id: 'org-holand',
    financial_account_id: 'acc-1',
    source_file_name: 'entidades.ofx',
    ofx_text: `
<OFX>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20260524
<TRNAMT>10.00
<FITID>entities
<MEMO>Atlas &amp; Filhos &quot;Cloud&quot; &apos;PIX&apos; &#193; &#xC1; &lt;tag&gt;
</STMTTRN>
</BANKTRANLIST>
</OFX>
`
  });

  assert.equal(parsed.lines[0].description, 'Atlas & Filhos "Cloud" \'PIX\' Á Á <tag>');
  assert.equal(parsed.lines[0].normalized_description, 'atlas filhos cloud pix a a tag');
});
