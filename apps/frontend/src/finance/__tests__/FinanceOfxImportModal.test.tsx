import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FinanceOfxImportModal } from '../components/FinanceOfxImportModal';
import type { FinanceAccount, FinanceOfxApproveResult, FinanceOfxPreview } from '../api';

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
        dedupe_hash: 'dedupe-1'
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
        dedupe_hash: 'dedupe-2'
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
        dedupe_hash: 'dedupe-3'
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

function renderModal(overrides: Partial<Parameters<typeof FinanceOfxImportModal>[0]> = {}) {
  const props = {
    open: true,
    accounts: [account],
    onPreview: vi.fn().mockResolvedValue(preview),
    onApprove: vi.fn().mockResolvedValue(approveResult),
    onClose: vi.fn(),
    onApproved: vi.fn(),
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

  expect(within(feeRow).getByRole('checkbox')).toBeChecked();
  expect(within(receivableRow).getByRole('checkbox')).toBeChecked();
  expect(within(duplicateRow).getByRole('checkbox')).not.toBeChecked();
  expect(within(duplicateRow).getByRole('checkbox')).toBeDisabled();

  await user.click(within(receivableRow).getByRole('checkbox'));
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
          financial_category_id: 'cat-1',
          financial_cost_center_id: 'cost-1',
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
          financial_category_id: 'cat-2',
          financial_cost_center_id: null,
          financial_payment_method_id: null,
          note: 'CLIENTE SOL'
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
