import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';
import { todayIso } from '../utils/financeFormatters';

const mocks = vi.hoisted(() => ({
  sessionRead: vi.fn()
}));

vi.mock('../../auth/session', () => ({
  hasAnyPermission: vi.fn(() => true),
  internalSessionStore: {
    read: mocks.sessionRead
  }
}));

vi.mock('../api', () => ({
  financeApi: {
    listTransactions: vi.fn().mockResolvedValue({
      transactions: [
        {
          id: 'ftxn-1',
          organization_id: 'org-prymeira',
          financial_entity_id: 'entity-1',
          financial_entity_name: 'Alpha Serviços',
          financial_account_id: 'facc-1',
          financial_account_name: 'Conta Operacional',
          financial_category_id: 'fcat-1',
          financial_category_name: 'Despesas Operacionais',
          kind: 'expense',
          status: 'open',
          amount_cents: 12500,
          issue_date: '2026-04-20',
          due_date: '2026-04-25',
          settlement_date: null,
          competence_date: '2026-04-20',
          source: 'manual',
          source_ref: null,
          note: 'Mensalidade de serviços',
          created_by: 'finance.user',
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z',
          is_deleted: false,
          views: {
            signed_amount_cents: -12500,
            cash_amount_cents: 0,
            competence_amount_cents: -12500,
            projected_amount_cents: -12500,
            confirmed_amount_cents: 0,
            competence_anchor_date: '2026-04-20',
            cash_anchor_date: null,
            projected_anchor_date: '2026-04-25'
          }
        }
      ]
    }),
    listEntities: vi.fn().mockResolvedValue([
      {
        id: 'entity-1',
        organization_id: 'org-prymeira',
        legal_name: 'Alpha Serviços LTDA',
        trade_name: 'Alpha Serviços',
        document_number: '12.345.678/0001-90',
        kind: 'supplier',
        email: 'financeiro@alpha.com',
        phone: null,
        is_active: true,
        created_at: '2026-04-20T10:00:00.000Z',
        updated_at: '2026-04-20T10:00:00.000Z'
      }
    ]),
    listAccounts: vi.fn().mockResolvedValue({
      company_id: null,
      company_name: null,
      accounts: [
        {
          id: 'facc-1',
          organization_id: 'org-prymeira',
          company_id: 'company-prymeira',
          name: 'Conta Operacional',
          kind: 'bank',
          currency: 'BRL',
          account_number: null,
          branch_number: null,
          is_active: true,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z'
        }
      ]
    }),
    listCategories: vi.fn().mockResolvedValue({
      company_id: null,
      company_name: null,
      categories: [
        {
          id: 'fcat-1',
          organization_id: 'org-prymeira',
          company_id: 'company-prymeira',
          name: 'Despesas Operacionais',
          kind: 'expense',
          parent_category_id: null,
          is_active: true,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z'
        }
      ]
    }),
    getOverview: vi.fn(),
    getContext: vi.fn(),
    createTransaction: vi.fn().mockResolvedValue({
      id: 'ftxn-2',
      organization_id: 'org-prymeira',
      financial_entity_id: 'entity-1',
      financial_entity_name: 'Alpha Serviços',
      financial_account_id: 'facc-1',
      financial_account_name: 'Conta Operacional',
      financial_category_id: 'fcat-1',
      financial_category_name: 'Despesas Operacionais',
      kind: 'expense',
      status: 'open',
      amount_cents: 20000,
      issue_date: '2026-04-20',
      due_date: '2026-04-25',
      settlement_date: null,
      competence_date: '2026-04-20',
      source: 'manual',
      source_ref: null,
      note: 'Novo lançamento',
      created_by: 'finance.user',
      created_at: '2026-04-20T10:00:00.000Z',
      updated_at: '2026-04-20T10:00:00.000Z',
      is_deleted: false,
      views: {
        signed_amount_cents: -20000,
        cash_amount_cents: 0,
        competence_amount_cents: -20000,
        projected_amount_cents: -20000,
        confirmed_amount_cents: 0,
        competence_anchor_date: '2026-04-20',
        cash_anchor_date: null,
        projected_anchor_date: '2026-04-25'
      }
    }),
    updateTransaction: vi.fn().mockResolvedValue({
      id: 'ftxn-1'
    }),
    deleteTransaction: vi.fn().mockResolvedValue({
      ok: true,
      transaction: { id: 'ftxn-1' }
    })
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionRead.mockReturnValue({
    token: 'token-finance',
    expires_at: '2099-01-01T00:00:00.000Z',
    user: {
      id: 'user-finance',
      username: 'financeiro',
      display_name: 'Financeiro',
      role: 'supremo',
      permissions: ['finance.read', 'finance.write', 'finance.approve']
    }
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

test('transactions controller loads catalog, ledger and totals', async () => {
  const { financeApi } = await import('../api');
  const { result } = renderHook(() => useFinanceTransactionsController());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.catalogLoading).toBe(false);
  });

  expect(result.current.transactions).toHaveLength(1);
  expect(result.current.filteredTransactions).toHaveLength(1);
  expect(result.current.accounts).toHaveLength(1);
  expect(result.current.accounts[0]).toEqual(expect.objectContaining({ name: 'Conta Operacional' }));
  expect(result.current.categories).toHaveLength(1);
  expect(result.current.categories[0]).toEqual(expect.objectContaining({ name: 'Despesas Operacionais' }));
  expect(result.current.entities).toHaveLength(1);
  expect(result.current.entities[0]).toEqual(
    expect.objectContaining({
      trade_name: 'Alpha Serviços'
    })
  );
  expect(result.current.totals.out).toBe(12500);
  expect(result.current.canWrite).toBe(true);
  expect(result.current.canApprove).toBe(true);
  expect(financeApi.listAccounts).toHaveBeenCalled();
  expect(financeApi.listCategories).toHaveBeenCalled();
  expect(financeApi.listEntities).toHaveBeenCalled();
});

test('transactions controller auto-fills settlement date for settled creates', async () => {
  const { financeApi } = await import('../api');
  const { result } = renderHook(() => useFinanceTransactionsController());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  act(() => {
    result.current.startCreateMode();
    result.current.updateForm('note', 'Lançamento liquidado');
    result.current.updateForm('amount', '100,00');
    result.current.updateForm('status', 'settled');
  });

  await act(async () => {
    await result.current.submitTransaction();
  });

  expect(financeApi.createTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'settled',
      settlement_date: todayIso()
    })
  );
});
