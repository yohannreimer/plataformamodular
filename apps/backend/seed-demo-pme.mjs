/**
 * seed-demo-pme.mjs
 * Apaga os dados demo antigos (Metal Forte) e insere dados realistas
 * de uma pequena consultoria empresarial brasileira.
 *
 * Uso: node apps/backend/seed-demo-pme.mjs
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, 'data/app.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF'); // desliga FK para limpeza sem ordem

const ORG = 'org-holand';
const COMPANY_ID = 'comp-01'; // mesmo ID usado pelo seed original

// ─── Limpa dados antigos do comp-01 ──────────────────────────────────────────
const tables = [
  'financial_reconciliation_match',
  'financial_bank_statement_entry',
  'financial_import_job',
  'financial_payable',
  'financial_receivable',
  'financial_transaction',
  'financial_payment_method',
  'financial_cost_center',
  'financial_entity',
  'financial_category',
  'financial_account',
  'company',
];
for (const t of tables) {
  try {
    db.prepare(`delete from ${t} where company_id = ? or id = ?`).run(COMPANY_ID, COMPANY_ID);
  } catch {}
}
// limpa tabelas sem company_id
for (const t of ['financial_payment_method', 'financial_cost_center']) {
  try {
    db.prepare(`delete from ${t} where organization_id = ? and id like 'f%'`).run(ORG);
  } catch {}
}

db.pragma('foreign_keys = ON');

// ─── Datas ────────────────────────────────────────────────────────────────────
function iso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const today = iso(0);
const yesterday = iso(-1);
const d3 = iso(-3);
const d5 = iso(-5);
const d7 = iso(-7);
const d10 = iso(-10);
const d15 = iso(-15);
const d20 = iso(-20);
const p3 = iso(3);
const p5 = iso(5);
const p7 = iso(7);
const p10 = iso(10);
const p15 = iso(15);
const p30 = iso(30);
const now = new Date().toISOString();

// ─── Empresa ──────────────────────────────────────────────────────────────────
db.prepare(`insert or replace into company (id, name, status, notes, priority)
  values (?, ?, ?, ?, ?)`)
  .run(COMPANY_ID, 'Vértice Consultoria', 'Ativo', 'Empresa demo para landing page Fluvia', 0);

// ─── Contas bancárias ─────────────────────────────────────────────────────────
const insertAccount = db.prepare(`
  insert or replace into financial_account
    (id, organization_id, company_id, name, kind, currency, account_number, branch_number, is_active, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);
insertAccount.run('facc-itau',   ORG, COMPANY_ID, 'Itaú Conta Corrente',   'bank', 'BRL', '28374-5', '0341', now, now);
insertAccount.run('facc-bradesco', ORG, COMPANY_ID, 'Bradesco Reservas',   'bank', 'BRL', '91023-1', '2856', now, now);
insertAccount.run('facc-caixa',  ORG, COMPANY_ID, 'Caixa (dinheiro)',      'cash', 'BRL', null,       null,  now, now);

// ─── Categorias ───────────────────────────────────────────────────────────────
const insertCat = db.prepare(`
  insert or replace into financial_category
    (id, organization_id, company_id, name, kind, parent_category_id, is_active, created_at, updated_at)
  values (?, ?, ?, ?, ?, null, 1, ?, ?)
`);
// receitas
insertCat.run('fcat-consultoria',   ORG, COMPANY_ID, 'Consultoria Empresarial', 'income',  now, now);
insertCat.run('fcat-mensalidade',   ORG, COMPANY_ID, 'Mensalidades de Clientes','income',  now, now);
insertCat.run('fcat-treinamento',   ORG, COMPANY_ID, 'Treinamentos',            'income',  now, now);
// despesas
insertCat.run('fcat-folha',         ORG, COMPANY_ID, 'Folha de Pagamento',      'expense', now, now);
insertCat.run('fcat-aluguel',       ORG, COMPANY_ID, 'Aluguel',                 'expense', now, now);
insertCat.run('fcat-impostos',      ORG, COMPANY_ID, 'Impostos e Taxas',        'expense', now, now);
insertCat.run('fcat-contador',      ORG, COMPANY_ID, 'Honorários Contábeis',    'expense', now, now);
insertCat.run('fcat-software',      ORG, COMPANY_ID, 'Software e TI',           'expense', now, now);
insertCat.run('fcat-marketing',     ORG, COMPANY_ID, 'Marketing e Publicidade', 'expense', now, now);
insertCat.run('fcat-viagem',        ORG, COMPANY_ID, 'Viagens e Deslocamentos', 'expense', now, now);
insertCat.run('fcat-outros',        ORG, COMPANY_ID, 'Outros',                  'expense', now, now);

// ─── Entidades (clientes e fornecedores) ──────────────────────────────────────
const insertEntity = db.prepare(`
  insert or replace into financial_entity
    (id, organization_id, legal_name, trade_name, document_number, kind, email, phone, is_active, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);
// clientes
insertEntity.run('fent-alphaville',  ORG, 'Construtora Alphaville Ltda',   'Construtora Alphaville',  '12.480.108/0001-52', 'customer', 'fin@alphaville.com.br',    '+55 11 3000-1111', now, now);
insertEntity.run('fent-clinica',     ORG, 'Clínica Saúde Plena S/S',       'Clínica Saúde Plena',     '28.940.015/0001-77', 'customer', 'admin@saudeplena.com.br',  '+55 11 98765-0000', now, now);
insertEntity.run('fent-automota',    ORG, 'Auto Mota Peças Ltda',           'Auto Mota',               '05.312.490/0001-80', 'customer', 'compras@automota.com.br', '+55 11 97654-1111', now, now);
insertEntity.run('fent-distribuidora', ORG, 'Distribuidora Mega Alimentos', 'Distribuidora Mega',      '47.820.031/0001-61', 'customer', 'fin@megaalimentos.com',   '+55 21 3100-2222', now, now);
insertEntity.run('fent-instituto',   ORG, 'Instituto Formar RH',            'Instituto Formar',        '33.201.458/0001-09', 'customer', 'fin@institutoformar.com', '+55 11 3200-3333', now, now);
// fornecedores
insertEntity.run('fent-imobiliaria', ORG, 'Imobiliária Centro Comercial',   'Imobiliária Centro',      '09.184.530/0001-48', 'supplier', 'aluguel@centrocomercial.com.br', '+55 11 3300-0000', now, now);
insertEntity.run('fent-lima',        ORG, 'Lima & Associados Contabilidade','Lima & Associados',        '55.720.018/0001-33', 'supplier', 'contato@limaassoc.com.br',       '+55 11 4000-5555', now, now);
insertEntity.run('fent-receita',     ORG, 'Receita Federal / Simples',      'Simples Nacional',        '00.394.460/0057-27', 'supplier', null, null, now, now);
insertEntity.run('fent-freelancer',  ORG, 'Freelancers Independentes',      'Freelancers',             '000.000.000-00',     'supplier', null, null, now, now);

// ─── Centros de custo ─────────────────────────────────────────────────────────
const insertCC = db.prepare(`
  insert or replace into financial_cost_center
    (id, organization_id, name, code, is_active, created_at, updated_at)
  values (?, ?, ?, ?, 1, ?, ?)
`);
insertCC.run('fcc-op',  ORG, 'Operações',  'OP',  now, now);
insertCC.run('fcc-com', ORG, 'Comercial',  'COM', now, now);
insertCC.run('fcc-adm', ORG, 'Administrativo', 'ADM', now, now);

// ─── Meios de pagamento ───────────────────────────────────────────────────────
const insertPM = db.prepare(`
  insert or replace into financial_payment_method
    (id, organization_id, name, kind, is_active, created_at, updated_at)
  values (?, ?, ?, ?, 1, ?, ?)
`);
insertPM.run('fpm-pix',      ORG, 'PIX',           'pix',      now, now);
insertPM.run('fpm-ted',      ORG, 'TED / DOC',     'transfer', now, now);
insertPM.run('fpm-boleto',   ORG, 'Boleto',         'boleto',   now, now);
insertPM.run('fpm-cartao',   ORG, 'Cartão Empresa', 'card',     now, now);

// ─── Transações ───────────────────────────────────────────────────────────────
// amount_cents = valor em centavos
const insertTx = db.prepare(`
  insert or replace into financial_transaction (
    id, organization_id, company_id, financial_entity_id, financial_account_id, financial_category_id,
    kind, status, amount_cents, issue_date, due_date, settlement_date, competence_date, note,
    created_at, updated_at, is_deleted
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`);

// RECEITAS LIQUIDADAS (mês atual)
insertTx.run('ftxn-r01', ORG, COMPANY_ID, 'fent-alphaville',    'facc-itau',     'fcat-consultoria', 'income',  'settled',  1850000, d15, d10, d10, d10, 'Projeto reestruturação financeira — fase 1', now, now);
insertTx.run('ftxn-r02', ORG, COMPANY_ID, 'fent-clinica',       'facc-itau',     'fcat-mensalidade', 'income',  'settled',   520000, d10, d5,  d5,  d5,  'Mensalidade mai/2026 — Clínica Saúde Plena', now, now);
insertTx.run('ftxn-r03', ORG, COMPANY_ID, 'fent-automota',      'facc-itau',     'fcat-mensalidade', 'income',  'settled',   390000, d10, d5,  d5,  d5,  'Mensalidade mai/2026 — Auto Mota', now, now);
insertTx.run('ftxn-r04', ORG, COMPANY_ID, 'fent-alphaville',    'facc-itau',     'fcat-treinamento', 'income',  'settled',   850000, d7,  d3,  d3,  d3,  'Treinamento equipe de gestão (8h)', now, now);
insertTx.run('ftxn-r05', ORG, COMPANY_ID, 'fent-instituto',     'facc-itau',     'fcat-treinamento', 'income',  'settled',   680000, d5,  d3,  d3,  d3,  'Facilitação workshop liderança', now, now);
// RECEITAS EM ABERTO
insertTx.run('ftxn-r06', ORG, COMPANY_ID, 'fent-distribuidora', 'facc-itau',     'fcat-consultoria', 'income',  'open',     1200000, yesterday, p7, null, p7,  'Diagnóstico operacional — Distribuidora Mega', now, now);
insertTx.run('ftxn-r07', ORG, COMPANY_ID, 'fent-clinica',       'facc-itau',     'fcat-mensalidade', 'income',  'open',      520000, today,     p5, null, p5,  'Mensalidade jun/2026 — Clínica Saúde Plena', now, now);
insertTx.run('ftxn-r08', ORG, COMPANY_ID, 'fent-automota',      'facc-itau',     'fcat-mensalidade', 'income',  'open',      390000, today,     p5, null, p5,  'Mensalidade jun/2026 — Auto Mota', now, now);
// RECEITA EM ATRASO
insertTx.run('ftxn-r09', ORG, COMPANY_ID, 'fent-distribuidora', 'facc-itau',     'fcat-consultoria', 'income',  'overdue',   750000, d15, d5, null, d5,  'Parcela 2/3 projeto logística — em atraso', now, now);
// RECEITA PLANEJADA
insertTx.run('ftxn-r10', ORG, COMPANY_ID, 'fent-instituto',     'facc-itau',     'fcat-treinamento', 'income',  'planned',  1500000, today, p30, null, p30, 'Programa 40h liderança executiva — Instituto Formar', now, now);

// DESPESAS LIQUIDADAS
insertTx.run('ftxn-p01', ORG, COMPANY_ID, null,                'facc-itau',     'fcat-folha',    'expense', 'settled',  2440000, d10, d5,  d5,  d5,  'Folha de pagamento mai/2026 (3 colaboradores)', now, now);
insertTx.run('ftxn-p02', ORG, COMPANY_ID, 'fent-imobiliaria',  'facc-itau',     'fcat-aluguel',  'expense', 'settled',   320000, d20, d10, d10, d10, 'Aluguel sala comercial — mai/2026', now, now);
insertTx.run('ftxn-p03', ORG, COMPANY_ID, 'fent-lima',         'facc-itau',     'fcat-contador', 'expense', 'settled',   180000, d15, d10, d10, d10, 'Honorários contábeis — mai/2026', now, now);
insertTx.run('ftxn-p04', ORG, COMPANY_ID, null,                'facc-itau',     'fcat-software', 'expense', 'settled',    89000, d10, d7,  d7,  d7,  'Google Workspace + Notion + Zoom (anual/12)', now, now);
insertTx.run('ftxn-p05', ORG, COMPANY_ID, 'fent-freelancer',   'facc-itau',     'fcat-outros',   'expense', 'settled',   520000, d7,  d5,  d5,  d5,  'Freelancer design — apresentações clientes', now, now);
insertTx.run('ftxn-p06', ORG, COMPANY_ID, null,                'facc-itau',     'fcat-viagem',   'expense', 'settled',   210000, d5,  d3,  d3,  d3,  'Passagem SP→BH — visita Construtora Alphaville', now, now);
// DESPESAS EM ABERTO
insertTx.run('ftxn-p07', ORG, COMPANY_ID, 'fent-receita',      'facc-itau',     'fcat-impostos', 'expense', 'open',      264000, yesterday, p3, null, p3,  'Simples Nacional DAS — mai/2026', now, now);
insertTx.run('ftxn-p08', ORG, COMPANY_ID, null,                'facc-itau',     'fcat-marketing','expense', 'open',      150000, today,     p7, null, p7,  'Google Ads — campanha leads B2B', now, now);
insertTx.run('ftxn-p09', ORG, COMPANY_ID, 'fent-imobiliaria',  'facc-itau',     'fcat-aluguel',  'expense', 'open',      320000, today,     p10, null, p10, 'Aluguel sala comercial — jun/2026', now, now);
// DESPESA EM ATRASO
insertTx.run('ftxn-p10', ORG, COMPANY_ID, 'fent-receita',      'facc-itau',     'fcat-impostos', 'expense', 'overdue',    84000, d10, d3, null, d3,  'INSS sobre pró-labore — abr/2026 (pendente)', now, now);
// DESPESA PLANEJADA
insertTx.run('ftxn-p11', ORG, COMPANY_ID, null,                'facc-itau',     'fcat-folha',    'expense', 'planned',  2440000, today,     p15, null, p15, 'Folha de pagamento jun/2026', now, now);

// ─── Contas a receber ─────────────────────────────────────────────────────────
const insertRec = db.prepare(`
  insert or replace into financial_receivable (
    id, organization_id, company_id, financial_transaction_id, financial_entity_id,
    financial_account_id, financial_category_id, customer_name, description,
    amount_cents, status, issue_date, due_date, received_at, note, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertRec.run('frec-01', ORG, COMPANY_ID, 'ftxn-r01', 'fent-alphaville',    'facc-itau', 'fcat-consultoria', 'Construtora Alphaville', 'Projeto reestruturação financeira',      1850000, 'received', d15, d10, d10, 'Pago via TED', now, now);
insertRec.run('frec-02', ORG, COMPANY_ID, 'ftxn-r02', 'fent-clinica',       'facc-itau', 'fcat-mensalidade', 'Clínica Saúde Plena',    'Mensalidade mai/2026',                    520000, 'received', d10, d5,  d5,  'Pago via PIX', now, now);
insertRec.run('frec-03', ORG, COMPANY_ID, 'ftxn-r03', 'fent-automota',      'facc-itau', 'fcat-mensalidade', 'Auto Mota Peças',        'Mensalidade mai/2026',                    390000, 'received', d10, d5,  d5,  'Pago via PIX', now, now);
insertRec.run('frec-04', ORG, COMPANY_ID, 'ftxn-r04', 'fent-alphaville',    'facc-itau', 'fcat-treinamento', 'Construtora Alphaville', 'Treinamento equipe gestão',               850000, 'received', d7,  d3,  d3,  null, now, now);
insertRec.run('frec-05', ORG, COMPANY_ID, 'ftxn-r05', 'fent-instituto',     'facc-itau', 'fcat-treinamento', 'Instituto Formar',       'Facilitação workshop liderança',          680000, 'received', d5,  d3,  d3,  null, now, now);
insertRec.run('frec-06', ORG, COMPANY_ID, 'ftxn-r06', 'fent-distribuidora', 'facc-itau', 'fcat-consultoria', 'Distribuidora Mega',     'Diagnóstico operacional',               1200000, 'open',     yesterday, p7,  null, 'Aguardando aprovação NF', now, now);
insertRec.run('frec-07', ORG, COMPANY_ID, 'ftxn-r07', 'fent-clinica',       'facc-itau', 'fcat-mensalidade', 'Clínica Saúde Plena',    'Mensalidade jun/2026',                    520000, 'open',     today,     p5,  null, null, now, now);
insertRec.run('frec-08', ORG, COMPANY_ID, 'ftxn-r08', 'fent-automota',      'facc-itau', 'fcat-mensalidade', 'Auto Mota Peças',        'Mensalidade jun/2026',                    390000, 'open',     today,     p5,  null, null, now, now);
insertRec.run('frec-09', ORG, COMPANY_ID, 'ftxn-r09', 'fent-distribuidora', 'facc-itau', 'fcat-consultoria', 'Distribuidora Mega',     'Parcela 2/3 projeto logística',           750000, 'overdue',  d15,       d5,  null, 'Cobrar hoje — 13 dias de atraso', now, now);
insertRec.run('frec-10', ORG, COMPANY_ID, 'ftxn-r10', 'fent-instituto',     'facc-itau', 'fcat-treinamento', 'Instituto Formar',       'Programa 40h liderança executiva',      1500000, 'planned',  today,     p30, null, 'Contrato assinado, NF no próximo mês', now, now);

// ─── Contas a pagar ───────────────────────────────────────────────────────────
const insertPay = db.prepare(`
  insert or replace into financial_payable (
    id, organization_id, company_id, financial_transaction_id, financial_entity_id,
    financial_account_id, financial_category_id, supplier_name, description,
    amount_cents, status, issue_date, due_date, paid_at, note, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertPay.run('fpay-01', ORG, COMPANY_ID, 'ftxn-p01', null,               'facc-itau', 'fcat-folha',    'Folha de Pagamento',  'Salários + encargos mai/2026',          2440000, 'paid',    d10, d5,  d5,  null, now, now);
insertPay.run('fpay-02', ORG, COMPANY_ID, 'ftxn-p02', 'fent-imobiliaria', 'facc-itau', 'fcat-aluguel',  'Imobiliária Centro',  'Aluguel sala comercial mai/2026',         320000, 'paid',    d20, d10, d10, null, now, now);
insertPay.run('fpay-03', ORG, COMPANY_ID, 'ftxn-p03', 'fent-lima',        'facc-itau', 'fcat-contador', 'Lima & Associados',   'Honorários contábeis mai/2026',           180000, 'paid',    d15, d10, d10, null, now, now);
insertPay.run('fpay-04', ORG, COMPANY_ID, 'ftxn-p04', null,               'facc-itau', 'fcat-software', 'Software / TI',       'Google Workspace + Notion + Zoom',         89000, 'paid',    d10, d7,  d7,  'Débito automático cartão', now, now);
insertPay.run('fpay-05', ORG, COMPANY_ID, 'ftxn-p05', 'fent-freelancer',  'facc-itau', 'fcat-outros',   'Freelancers',         'Design apresentações — mai/2026',          520000, 'paid',    d7,  d5,  d5,  'PIX', now, now);
insertPay.run('fpay-06', ORG, COMPANY_ID, 'ftxn-p06', null,               'facc-itau', 'fcat-viagem',   'Viagem SP→BH',        'Passagem + hotel Alphaville',              210000, 'paid',    d5,  d3,  d3,  null, now, now);
insertPay.run('fpay-07', ORG, COMPANY_ID, 'ftxn-p07', 'fent-receita',     'facc-itau', 'fcat-impostos', 'Simples Nacional',    'DAS mai/2026 — vence em 3 dias',          264000, 'open',    yesterday, p3, null, 'Urgente — vence em 3 dias', now, now);
insertPay.run('fpay-08', ORG, COMPANY_ID, 'ftxn-p08', null,               'facc-itau', 'fcat-marketing','Google Ads',          'Campanha leads B2B — jun/2026',           150000, 'open',    today,     p7, null, null, now, now);
insertPay.run('fpay-09', ORG, COMPANY_ID, 'ftxn-p09', 'fent-imobiliaria', 'facc-itau', 'fcat-aluguel',  'Imobiliária Centro',  'Aluguel sala comercial jun/2026',          320000, 'open',    today,     p10, null, null, now, now);
insertPay.run('fpay-10', ORG, COMPANY_ID, 'ftxn-p10', 'fent-receita',     'facc-itau', 'fcat-impostos', 'Receita Federal',     'INSS pró-labore abr/2026 — em atraso',     84000, 'overdue', d10,  d3, null, 'Pagar com multa', now, now);
insertPay.run('fpay-11', ORG, COMPANY_ID, 'ftxn-p11', null,               'facc-itau', 'fcat-folha',    'Folha de Pagamento',  'Salários + encargos jun/2026',          2440000, 'planned', today,     p15, null, null, now, now);

// ─── Extrato bancário (para conciliação) ──────────────────────────────────────
const insertImport = db.prepare(`
  insert or replace into financial_import_job (
    id, organization_id, company_id, import_type, source_file_name, source_file_mime_type,
    source_file_size_bytes, status, total_rows, processed_rows, error_rows, error_summary,
    created_by, finished_at, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?)
`);
insertImport.run('fimp-01', ORG, COMPANY_ID, 'OFX', 'extrato-itau-mai2026.ofx', 'application/x-ofx', 52840, 'completed', 8, 8, 0, 'seed', now, now, now);

const insertStmt = db.prepare(`
  insert or replace into financial_bank_statement_entry (
    id, organization_id, company_id, financial_account_id, financial_import_job_id,
    statement_date, posted_at, amount_cents, description, reference_code,
    balance_cents, source, source_ref, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
let saldo = 3200000; // saldo inicial
const stmtRows = [
  ['fstmt-01', d15, -320000,   'PAG IMOVEIS CENTRO COMERCIAL',        'OFX001'],
  ['fstmt-02', d15,  1850000,  'TED CONSTRUTORA ALPHAVILLE LTDA',     'OFX002'],
  ['fstmt-03', d10, -2440000,  'PAG FOLHA MAI 2026',                  'OFX003'],
  ['fstmt-04', d10,  520000,   'PIX CLINICA SAUDE PLENA SS',          'OFX004'],
  ['fstmt-05', d10,  390000,   'PIX AUTO MOTA PECAS LTDA',            'OFX005'],
  ['fstmt-06', d10, -180000,   'PAG LIMA ASSOCIADOS CONTABILIDADE',   'OFX006'],
  ['fstmt-07', d7,   850000,   'TED CONSTRUTORA ALPHAVILLE LTDA',     'OFX007'],
  ['fstmt-08', d7,  -520000,   'PIX FREELANCERS',                     'OFX008'],
  ['fstmt-09', d5,   680000,   'PIX INSTITUTO FORMAR RH',             'OFX009'],
  ['fstmt-10', d5,   -89000,   'DEB GOOGLE WORKSPACE',                'OFX010'],
  ['fstmt-11', d3,  -210000,   'PAG VIAGEM SP BH',                    'OFX011'],
];
for (const [id, date, amount, desc, ref] of stmtRows) {
  saldo += amount;
  insertStmt.run(id, ORG, COMPANY_ID, 'facc-itau', 'fimp-01', date, date, amount, desc, ref, saldo, 'ofx', ref, now, now);
}

// ─── Conciliações ─────────────────────────────────────────────────────────────
const insertMatch = db.prepare(`
  insert or replace into financial_reconciliation_match (
    id, organization_id, company_id, financial_bank_statement_entry_id, financial_transaction_id,
    match_type, match_status, matched_amount_cents, matched_at, matched_by, note, created_at, updated_at
  ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const matches = [
  ['fmatch-01', 'fstmt-02', 'ftxn-r01', 1850000, 'confidence=0.98'],
  ['fmatch-02', 'fstmt-04', 'ftxn-r02',  520000, 'confidence=0.97'],
  ['fmatch-03', 'fstmt-05', 'ftxn-r03',  390000, 'confidence=0.97'],
  ['fmatch-04', 'fstmt-07', 'ftxn-r04',  850000, 'confidence=0.95'],
  ['fmatch-05', 'fstmt-09', 'ftxn-r05',  680000, 'confidence=0.96'],
  ['fmatch-06', 'fstmt-01', 'ftxn-p02',  320000, 'confidence=0.99'],
  ['fmatch-07', 'fstmt-03', 'ftxn-p01', 2440000, 'confidence=0.99'],
  ['fmatch-08', 'fstmt-06', 'ftxn-p03',  180000, 'confidence=0.98'],
];
for (const [id, stmtId, txId, amount, note] of matches) {
  insertMatch.run(id, ORG, COMPANY_ID, stmtId, txId, 'seed', 'matched', amount, now, 'seed', note, now, now);
}

// 3 entradas sem match (para a tela de conciliação mostrar pendências)
insertStmt.run('fstmt-12', ORG, COMPANY_ID, 'facc-itau', 'fimp-01', yesterday, yesterday, -84000,  'DEB INSS PRO LABORE',        'OFX012', saldo - 84000,  'ofx', 'OFX012', now, now);
insertStmt.run('fstmt-13', ORG, COMPANY_ID, 'facc-itau', 'fimp-01', yesterday, yesterday,  120000,  'PIX DEPOSITO SOCIO',         'OFX013', saldo + 36000,  'ofx', 'OFX013', now, now);
insertStmt.run('fstmt-14', ORG, COMPANY_ID, 'facc-itau', 'fimp-01', today,     today,      -264000, 'DAS SIMPLES NACIONAL',       'OFX014', saldo - 228000, 'ofx', 'OFX014', now, now);

db.pragma('foreign_keys = ON');
db.close();

console.log('✅ Seed PME concluído — Vértice Consultoria inserida com sucesso.');
console.log('   Receitas liquidadas: R$ 42.900');
console.log('   Despesas liquidadas: R$ 37.590');
console.log('   Lucro do mês:        R$  5.310');
console.log('   A receber (aberto):  R$ 26.600');
console.log('   A pagar (aberto):    R$  8.180');
