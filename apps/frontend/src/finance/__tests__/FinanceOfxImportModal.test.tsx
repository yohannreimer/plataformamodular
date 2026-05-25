import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FinanceOfxImportModal } from '../components/FinanceOfxImportModal';
import type { FinanceAccount, FinanceCategory, FinanceCostCenter, FinanceEntity, FinanceOfxApproveResult, FinanceOfxPreview, FinancePaymentMethod } from '../api';

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
    total_rows: 3,
    ready_count: 1,
    review_count: 0,
    blocked_count: 1,
    duplicate_count: 1,
    inflow_cents: 45000,
    outflow_cents: 1990
  },
  items: [
    {
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
        dedupe_hash: 'dedupe-1',
        invalid_reason: null
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
        financial_cost_center_id: 'cost-1',
        financial_cost_center_name: 'Administração',
        financial_payment_method_id: 'pm-1',
        financial_payment_method_name: 'Débito em conta',
        financial_account_id: 'acc-1',
        note: 'TARIFA BANCARIA',
        save_memory: true
      },
      blocking_reason: null
    },
    {
      id: 'ofx-line-2',
      line: {
        id: 'ofx-line-2',
        statement_date: '2026-05-24',
        posted_at: '2026-05-24',
        amount_cents: 45000,
        description: 'CLIENTE SOL',
        normalized_description: 'cliente sol',
        reference_code: 'rec-1',
        balance_cents: null,
        dedupe_hash: 'dedupe-2',
        invalid_reason: null
      },
      decision_type: 'receivable_match',
      confidence_score: 0.93,
      confidence_band: 'auto',
      reasons: [{ label: 'Valor exato', detail: 'Valor e data compatíveis.', tone: 'positive' }],
      target: { receivable_id: 'recv-1', financial_transaction_id: 'txn-1' },
      proposed: {
        financial_entity_id: 'entity-1',
        financial_entity_name: 'Cliente Sol',
        financial_category_id: 'cat-2',
        financial_category_name: 'Receita',
        financial_cost_center_id: null,
        financial_cost_center_name: null,
        financial_payment_method_id: null,
        financial_payment_method_name: null,
        financial_account_id: 'acc-1',
        note: 'CLIENTE SOL',
        save_memory: false
      },
      blocking_reason: null
    },
    {
      id: 'ofx-line-3',
      line: {
        id: 'ofx-line-3',
        statement_date: '2026-05-24',
        posted_at: '2026-05-24',
        amount_cents: -1000,
        description: 'LANCAMENTO DUPLICADO',
        normalized_description: 'lancamento duplicado',
        reference_code: 'dup-1',
        balance_cents: null,
        dedupe_hash: 'dedupe-3',
        invalid_reason: null
      },
      decision_type: 'duplicate',
      confidence_score: 1,
      confidence_band: 'blocked',
      reasons: [{ label: 'Duplicidade', detail: 'Linha já importada.', tone: 'warning' }],
      target: { financial_transaction_id: 'txn-dup' },
      proposed: {
        financial_entity_id: null,
        financial_entity_name: null,
        financial_category_id: null,
        financial_category_name: null,
        financial_cost_center_id: null,
        financial_cost_center_name: null,
        financial_payment_method_id: null,
        financial_payment_method_name: null,
        financial_account_id: 'acc-1',
        note: 'LANCAMENTO DUPLICADO',
        save_memory: false
      },
      blocking_reason: 'Linha duplicada.'
    }
  ]
};

const approveResult = {
  batch_id: 'batch-1',
  import_job: {
    id: 'job-1',
    organization_id: 'org-holand',
    company_id: 'company-a',
    import_type: 'ofx',
    source_file_name: 'maio.ofx',
    source_file_mime_type: 'application/x-ofx',
    source_file_size_bytes: 512,
    status: 'completed',
    total_rows: 3,
    processed_rows: 2,
    error_rows: 1,
    error_summary: null,
    created_by: null,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
    finished_at: '2026-05-25T00:01:00.000Z'
  },
  approved_count: 1,
  skipped_count: 1,
  matches: [],
  transactions: []
} satisfies FinanceOfxApproveResult;

const reviewEntities: FinanceEntity[] = [
  {
    id: 'entity-edited',
    organization_id: 'org-holand',
    legal_name: 'Fornecedor Editado',
    trade_name: null,
    document_number: null,
    kind: 'supplier',
    email: null,
    phone: null,
    is_active: true,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z'
  }
];

const reviewCategories: FinanceCategory[] = [
  {
    id: 'cat-edited',
    organization_id: 'org-holand',
    company_id: 'company-a',
    name: 'Tarifas revisadas',
    kind: 'expense',
    parent_category_id: null,
    is_active: true,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z'
  }
];

const reviewCostCenters: FinanceCostCenter[] = [{
  id: 'cost-edited',
  organization_id: 'org-holand',
  name: 'Financeiro',
  code: null,
  is_active: true,
  created_at: '2026-05-25T00:00:00.000Z',
  updated_at: '2026-05-25T00:00:00.000Z'
}];

const reviewPaymentMethods: FinancePaymentMethod[] = [{
  id: 'pm-edited',
  organization_id: 'org-holand',
  name: 'PIX',
  kind: 'pix',
  is_active: true,
  created_at: '2026-05-25T00:00:00.000Z',
  updated_at: '2026-05-25T00:00:00.000Z'
}];

function renderModal(overrides: Partial<Parameters<typeof FinanceOfxImportModal>[0]> = {}) {
  const props = {
    open: true,
    accounts: [account],
    onPreview: vi.fn().mockResolvedValue(preview),
    onApprove: vi.fn().mockResolvedValue(approveResult),
    onClose: vi.fn(),
    onApproved: vi.fn(),
    entities: reviewEntities,
    categories: reviewCategories,
    costCenters: reviewCostCenters,
    paymentMethods: reviewPaymentMethods,
    ...overrides
  };

  return {
    ...render(<FinanceOfxImportModal {...props} />),
    props
  };
}

test('FinanceOfxImportModal renders null when closed', () => {
  renderModal({ open: false });

  expect(screen.queryByRole('dialog', { name: 'Importar OFX' })).not.toBeInTheDocument();
});

test('FinanceOfxImportModal lets reviewers edit financial fields before approval', async () => {
  const user = userEvent.setup();
  const { props } = renderModal();
  const ofxText = '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-19.90<MEMO>TARIFA</STMTTRN></BANKTRANLIST></OFX>';

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(screen.getByLabelText('Arquivo OFX'), new File([ofxText], 'maio.ofx', { type: 'application/x-ofx' }));
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  await screen.findByText('TARIFA BANCARIA');
  await user.click(screen.getByRole('button', { name: 'Editar TARIFA BANCARIA' }));
  await user.clear(screen.getByLabelText('Entidade TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Entidade TARIFA BANCARIA'), 'Fornecedor Editado');
  await user.clear(screen.getByLabelText('Categoria TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Categoria TARIFA BANCARIA'), 'Tarifas revisadas');
  await user.clear(screen.getByLabelText('Centro de custo TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Centro de custo TARIFA BANCARIA'), 'Financeiro');
  await user.selectOptions(screen.getByLabelText('Forma de pagamento TARIFA BANCARIA'), 'pm-edited');
  await user.clear(screen.getByLabelText('Referência TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Referência TARIFA BANCARIA'), 'Tarifa revisada');
  await user.click(screen.getByLabelText('Salvar memória TARIFA BANCARIA'));

  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));

  await waitFor(() => {
    expect(props.onApprove).toHaveBeenCalledWith(expect.objectContaining({
      approved_items: expect.arrayContaining([
        expect.objectContaining({
          draft_item_id: 'ofx-line-1',
          financial_entity_id: 'entity-edited',
          financial_entity_name: null,
          financial_category_id: 'cat-edited',
          financial_category_name: null,
          financial_cost_center_id: 'cost-edited',
          financial_cost_center_name: null,
          financial_payment_method_id: 'pm-edited',
          note: 'Tarifa revisada',
          save_memory: false
        })
      ])
    }));
  });
});

test('FinanceOfxImportModal lets review rows be selected and edited even when confidence band is blocked', async () => {
  const user = userEvent.setup();
  const reviewOnlyPreview: FinanceOfxPreview = {
    ...preview,
    summary: {
      ...preview.summary,
      ready_count: 0,
      review_count: 1,
      blocked_count: 0
    },
    items: [{
      ...preview.items[0],
      decision_type: 'needs_review',
      confidence_band: 'blocked',
      blocking_reason: 'Revise os campos financeiros antes de aprovar.',
      proposed: {
        ...preview.items[0].proposed,
        financial_entity_id: null,
        financial_entity_name: null,
        financial_category_id: null,
        financial_category_name: null,
        financial_cost_center_id: null,
        financial_cost_center_name: null
      }
    }]
  };
  const { props } = renderModal({ onPreview: vi.fn().mockResolvedValue(reviewOnlyPreview) });
  const ofxText = '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-5.70<MEMO>PISTA 3</STMTTRN></BANKTRANLIST></OFX>';

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(screen.getByLabelText('Arquivo OFX'), new File([ofxText], 'pista.ofx', { type: 'application/x-ofx' }));
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  await screen.findByText('TARIFA BANCARIA');
  expect(screen.getByRole('checkbox', { name: 'Aprovar TARIFA BANCARIA' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Editar TARIFA BANCARIA' })).toBeEnabled();
  expect(screen.queryByText('Bloqueada')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Editar TARIFA BANCARIA' }));
  await user.type(screen.getByLabelText('Entidade TARIFA BANCARIA'), 'Pedágio');
  await user.type(screen.getByLabelText('Categoria TARIFA BANCARIA'), 'Pedágio');
  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));

  await waitFor(() => {
    expect(props.onApprove).toHaveBeenCalledWith(expect.objectContaining({
      approved_items: [expect.objectContaining({
        draft_item_id: 'ofx-line-1',
        approved: true,
        decision_type: 'new_transaction',
        financial_entity_name: 'Pedágio',
        financial_category_name: 'Pedágio'
      })]
    }));
  });
});

test('FinanceOfxImportModal sends typed names for inline catalog creation', async () => {
  const user = userEvent.setup();
  const { props } = renderModal({ entities: [], categories: [], costCenters: [] });
  const ofxText = '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-5.70<MEMO>PISTA 3</STMTTRN></BANKTRANLIST></OFX>';

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(screen.getByLabelText('Arquivo OFX'), new File([ofxText], 'pista.ofx', { type: 'application/x-ofx' }));
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  await screen.findByText('TARIFA BANCARIA');
  await user.click(screen.getByRole('button', { name: 'Editar TARIFA BANCARIA' }));
  await user.clear(screen.getByLabelText('Entidade TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Entidade TARIFA BANCARIA'), 'Pedágio');
  await user.clear(screen.getByLabelText('Categoria TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Categoria TARIFA BANCARIA'), 'Pedágio');
  await user.clear(screen.getByLabelText('Centro de custo TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Centro de custo TARIFA BANCARIA'), 'Operacional');
  await user.clear(screen.getByLabelText('Referência TARIFA BANCARIA'));
  await user.type(screen.getByLabelText('Referência TARIFA BANCARIA'), 'Pedágio');

  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));

  await waitFor(() => {
    expect(props.onApprove).toHaveBeenCalledWith(expect.objectContaining({
      approved_items: expect.arrayContaining([
        expect.objectContaining({
          draft_item_id: 'ofx-line-1',
          financial_entity_id: null,
          financial_entity_name: 'Pedágio',
          financial_category_id: null,
          financial_category_name: 'Pedágio',
          financial_cost_center_id: null,
          financial_cost_center_name: 'Operacional',
          note: 'Pedágio'
        })
      ])
    }));
  });
});

test('FinanceOfxImportModal previews file and approves checked items', async () => {
  const user = userEvent.setup();
  const { props } = renderModal();
  const ofxText = '<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20260524<TRNAMT>-19.90<MEMO>TARIFA</STMTTRN></BANKTRANLIST></OFX>';

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(screen.getByLabelText('Arquivo OFX'), new File([ofxText], 'maio.ofx', { type: 'application/x-ofx' }));
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  expect(await screen.findByText('TARIFA BANCARIA')).toBeInTheDocument();
  expect(screen.getByText('Novo liquidado')).toBeInTheDocument();
  expect(screen.getByText('Tarifas')).toBeInTheDocument();
  expect(screen.getByText('86%')).toBeInTheDocument();
  expect(props.onPreview).toHaveBeenCalledWith({
    financial_account_id: 'acc-1',
    source_file_name: 'maio.ofx',
    source_file_size_bytes: ofxText.length,
    ofx_text: ofxText
  });

  const feeRow = screen.getByRole('row', { name: /TARIFA BANCARIA/ });
  const receivableRow = screen.getByRole('row', { name: /CLIENTE SOL/ });
  const duplicateRow = screen.getByRole('row', { name: /LANCAMENTO DUPLICADO/ });

  expect(within(feeRow).getByRole('checkbox', { name: 'Aprovar TARIFA BANCARIA' })).toBeChecked();
  expect(within(receivableRow).getByRole('checkbox', { name: 'Aprovar CLIENTE SOL' })).toBeChecked();
  expect(within(duplicateRow).getByRole('checkbox', { name: 'Aprovar LANCAMENTO DUPLICADO' })).not.toBeChecked();
  expect(within(duplicateRow).getByRole('checkbox', { name: 'Aprovar LANCAMENTO DUPLICADO' })).toBeDisabled();

  await user.click(within(receivableRow).getByRole('checkbox', { name: 'Aprovar CLIENTE SOL' }));
  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));

  await waitFor(() => {
    expect(props.onApprove).toHaveBeenCalledWith({
      financial_account_id: 'acc-1',
      source_file_name: 'maio.ofx',
      source_file_size_bytes: ofxText.length,
      source_file_hash: 'hash-1',
      ofx_text: ofxText,
      approved_items: [
        {
          draft_item_id: 'ofx-line-1',
          approved: true,
          decision_type: 'new_transaction',
          save_memory: true,
          payable_id: null,
          receivable_id: null,
          financial_transaction_id: null,
          financial_entity_id: null,
          financial_entity_name: null,
          financial_category_id: 'cat-1',
          financial_category_name: null,
          financial_cost_center_id: 'cost-1',
          financial_cost_center_name: null,
          financial_payment_method_id: 'pm-1',
          note: 'TARIFA BANCARIA'
        },
        {
          draft_item_id: 'ofx-line-2',
          approved: false,
          decision_type: 'receivable_match',
          save_memory: false,
          payable_id: null,
          receivable_id: 'recv-1',
          financial_transaction_id: 'txn-1',
          financial_entity_id: 'entity-1',
          financial_entity_name: null,
          financial_category_id: 'cat-2',
          financial_category_name: null,
          financial_cost_center_id: null,
          financial_cost_center_name: null,
          financial_payment_method_id: null,
          note: 'Cliente Sol'
        }
      ]
    });
  });
  expect(props.onApproved).toHaveBeenCalledWith(approveResult);
});

test('FinanceOfxImportModal displays preview and approval errors in the dialog', async () => {
  const user = userEvent.setup();
  const onPreview = vi.fn().mockRejectedValueOnce(new Error('OFX inválido'));
  const onApprove = vi.fn().mockRejectedValueOnce(new Error('Lote recusado'));
  renderModal({ onPreview, onApprove });

  await user.selectOptions(screen.getByLabelText('Conta bancária'), 'acc-1');
  await user.upload(screen.getByLabelText('Arquivo OFX'), new File(['<OFX />'], 'erro.ofx', { type: 'application/x-ofx' }));
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));

  expect(await screen.findByText('OFX inválido')).toBeInTheDocument();

  onPreview.mockResolvedValueOnce(preview);
  await user.click(screen.getByRole('button', { name: 'Gerar prévia' }));
  expect(await screen.findByText('TARIFA BANCARIA')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Aprovar lote' }));
  expect(await screen.findByText('Lote recusado')).toBeInTheDocument();
});
