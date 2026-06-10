import { useEffect, useMemo, useState } from 'react';
import { hasAnyPermission, internalSessionStore } from '../../auth/session';
import {
  financeApi,
  type CreateFinanceTransactionPayload,
  type FinanceAccount,
  type FinanceCategory,
  type FinanceEntity,
  type FinanceTransaction
} from '../api';
import { FINANCE_QUICK_LAUNCH_CREATED_EVENT } from '../components/FinanceFloatingQuickLauncher';
import { formatAmountInput, parseAmountToCents, todayIso } from '../utils/financeFormatters';
import { resolveFinancePeriodWindow, useFinancePeriod } from './useFinancePeriod';

export type TransactionEditorMode = 'view' | 'create';

export type TransactionFormState = {
  financial_entity_id: string;
  financial_account_id: string;
  financial_category_id: string;
  kind: FinanceTransaction['kind'];
  status: FinanceTransaction['status'];
  amount: string;
  issue_date: string;
  due_date: string;
  competence_date: string;
  settlement_date: string;
  note: string;
};

export type FilterState = {
  type: 'todos' | 'income' | 'expense';
  status: 'todos' | FinanceTransaction['status'];
  search: string;
};

export const initialFilters: FilterState = {
  type: 'todos',
  status: 'todos',
  search: ''
};

export const initialForm: TransactionFormState = {
  financial_entity_id: '',
  financial_account_id: '',
  financial_category_id: '',
  kind: 'expense',
  status: 'open',
  amount: '',
  issue_date: todayIso(),
  due_date: '',
  competence_date: '',
  settlement_date: '',
  note: ''
};

export const statusOptions: Array<{ value: FilterState['status']; label: string }> = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'planned', label: 'Planejado' },
  { value: 'open', label: 'Em aberto' },
  { value: 'partial', label: 'Parcial' },
  { value: 'settled', label: 'Liquidado' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'canceled', label: 'Cancelado' }
];

export const kindOptions: Array<{ value: FilterState['type']; label: string }> = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'income', label: 'Entrada' },
  { value: 'expense', label: 'Saída' }
];

export function entityName(entity?: FinanceEntity | null) {
  if (!entity) return '—';
  return entity.trade_name || entity.legal_name || '—';
}

export function kindLabel(kind: FinanceTransaction['kind']) {
  if (kind === 'income') return 'Entrada';
  if (kind === 'expense') return 'Saída';
  if (kind === 'transfer') return 'Transferência';
  return 'Ajuste';
}

export function statusLabel(status: FinanceTransaction['status']) {
  if (status === 'planned') return 'Planejado';
  if (status === 'open') return 'Em aberto';
  if (status === 'partial') return 'Parcial';
  if (status === 'settled') return 'Liquidado';
  if (status === 'overdue') return 'Atrasado';
  return 'Cancelado';
}

export function statusTone(status: FinanceTransaction['status']) {
  if (status === 'settled') return '#059669';
  if (status === 'overdue' || status === 'canceled') return '#ef4444';
  if (status === 'planned') return '#2563eb';
  if (status === 'partial') return '#d97706';
  return '#64748b';
}

export function matchesSearch(transaction: FinanceTransaction, search: string) {
  if (!search.trim()) return true;
  const normalized = search.trim().toLowerCase();
  return [
    transaction.note,
    transaction.financial_entity_name,
    transaction.financial_account_name,
    transaction.financial_category_name,
    transaction.financial_cost_center_name,
    transaction.source_ref,
    transaction.issue_date,
    transaction.due_date,
    transaction.settlement_date,
    transaction.competence_date,
    transaction.id
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export function buildFormFromTransaction(transaction: FinanceTransaction): TransactionFormState {
  return {
    financial_entity_id: transaction.financial_entity_id ?? '',
    financial_account_id: transaction.financial_account_id ?? '',
    financial_category_id: transaction.financial_category_id ?? '',
    kind: transaction.kind,
    status: transaction.status,
    amount: formatAmountInput(transaction.amount_cents),
    issue_date: transaction.issue_date ?? todayIso(),
    due_date: transaction.due_date ?? '',
    competence_date: transaction.competence_date ?? '',
    settlement_date: transaction.settlement_date ?? '',
    note: transaction.note ?? ''
  };
}

export function getRowLabel(transaction: FinanceTransaction) {
  return transaction.note?.trim() || transaction.financial_entity_name || 'Movimentação financeira';
}

export function useFinanceTransactionsController() {
  const { period, setPeriod } = useFinancePeriod();
  const session = internalSessionStore.read();
  const canWrite = hasAnyPermission(session?.user, ['finance.write']);
  const canApprove = hasAnyPermission(session?.user, ['finance.approve']);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [entities, setEntities] = useState<FinanceEntity[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [mode, setMode] = useState<TransactionEditorMode>('view');
  const [draftTransactionId, setDraftTransactionId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const periodWindow = useMemo(() => resolveFinancePeriodWindow(period), [period]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    const kind = params.get('kind');
    const status = params.get('status');
    setFilters((current) => ({
      ...current,
      type: kind === 'income' || kind === 'expense' ? kind : current.type,
      status: statusOptions.some((option) => option.value === status) ? status as FilterState['status'] : current.status
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    setCatalogLoading(true);
    Promise.all([financeApi.listAccounts(), financeApi.listCategories(), financeApi.listEntities()])
      .then(([accountsResponse, categoriesResponse, entitiesResponse]) => {
        if (cancelled) return;
        setAccounts(accountsResponse.accounts);
        setCategories(categoriesResponse.categories);
        setEntities(entitiesResponse);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar os catálogos financeiros.');
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    financeApi
      .listTransactions({
        kind: filters.type === 'todos' ? null : filters.type,
        status: filters.status === 'todos' ? null : filters.status,
        from: periodWindow.from,
        to: periodWindow.to,
        search: filters.search.trim() || null
      })
      .then((response) => {
        if (cancelled) return;
        setTransactions(response.transactions);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setTransactions([]);
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o ledger financeiro.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.status, filters.type, periodWindow.from, periodWindow.to, reloadNonce]);

  useEffect(() => {
    function handleQuickLaunchCreated() {
      setMessage('Lançamento rápido registrado.');
      setReloadNonce((current) => current + 1);
    }

    window.addEventListener(FINANCE_QUICK_LAUNCH_CREATED_EVENT, handleQuickLaunchCreated);
    return () => window.removeEventListener(FINANCE_QUICK_LAUNCH_CREATED_EVENT, handleQuickLaunchCreated);
  }, []);

  useEffect(() => {
    if (selectedTransactionId && !transactions.some((transaction) => transaction.id === selectedTransactionId)) {
      setSelectedTransactionId(null);
    }
  }, [selectedTransactionId, transactions]);

  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === selectedTransactionId) ?? null,
    [selectedTransactionId, transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.type !== 'todos' && transaction.kind !== filters.type) {
        return false;
      }

      if (filters.status !== 'todos' && transaction.status !== filters.status) {
        return false;
      }

      return matchesSearch(transaction, filters.search);
    });
  }, [filters.search, filters.status, filters.type, transactions]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.kind === 'income') {
          accumulator.in += transaction.amount_cents;
        } else {
          accumulator.out += transaction.amount_cents;
        }
        return accumulator;
      },
      { in: 0, out: 0 }
    );
  }, [filteredTransactions]);

  const filteredCount = filteredTransactions.length;
  const selectedIsEditing = mode === 'create' && Boolean(draftTransactionId);
  const submitLabel = selectedIsEditing ? 'Salvar alteração' : 'Salvar lançamento';
  const currentDraftSource = draftTransactionId ? transactions.find((transaction) => transaction.id === draftTransactionId) ?? null : null;

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateForm<K extends keyof TransactionFormState>(key: K, value: TransactionFormState[K]) {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value
      };

      if (key === 'status' && value === 'settled') {
        next.settlement_date = current.settlement_date || todayIso();
      }

      return next;
    });
  }

  function startCreateMode() {
    setMode('create');
    setDraftTransactionId(null);
    setSelectedTransactionId(null);
    setForm(initialForm);
    setMessage('');
  }

  function startEditMode() {
    if (!selectedTransaction) {
      return;
    }

    setMode('create');
    setDraftTransactionId(selectedTransaction.id);
    setForm(buildFormFromTransaction(selectedTransaction));
    setMessage('');
  }

  async function submitTransaction() {
    if (!canWrite) {
      setError('Você não tem permissão para alterar movimentações.');
      return;
    }

    const nextSettlementDate =
      form.status === 'settled'
        ? (form.settlement_date || todayIso())
        : null;

    const payload: CreateFinanceTransactionPayload = {
      financial_entity_id: form.financial_entity_id || null,
      financial_account_id: form.financial_account_id || null,
      financial_category_id: form.financial_category_id || null,
      kind: form.kind,
      status: form.status,
      amount_cents: parseAmountToCents(form.amount),
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      settlement_date: nextSettlementDate,
      competence_date: form.competence_date || null,
      note: form.note.trim() || null
    };

    if (payload.amount_cents <= 0) {
      setError('Informe um valor maior que zero para o lançamento.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      if (selectedIsEditing && draftTransactionId) {
        const updated = await financeApi.updateTransaction(draftTransactionId, payload);
        setSelectedTransactionId(updated.id);
        setDraftTransactionId(null);
        setMode('view');
        setMessage('Lançamento atualizado no ledger central.');
      } else {
        const created = await financeApi.createTransaction(payload);
        setSelectedTransactionId(created.id);
        setDraftTransactionId(null);
        setMode('view');
        setMessage('Novo lançamento manual registrado com sucesso.');
      }

      setReloadNonce((current) => current + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar movimentação.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSelectedTransaction() {
    if (!selectedTransaction || !canApprove || selectedTransaction.is_deleted) {
      return;
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm('Excluir esta movimentação do ledger ativo? Ela continuará visível no histórico de excluídos.');

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');
      const deleted = await financeApi.deleteTransaction(selectedTransaction.id);
      setSelectedTransactionId(deleted.transaction.id);
      setDraftTransactionId(null);
      setMode('view');
      setReloadNonce((current) => current + 1);
      setMessage('Lançamento removido do ledger ativo. O histórico auditável agora inclui itens excluídos.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir movimentação.');
    } finally {
      setSubmitting(false);
    }
  }

  return {
    period,
    setPeriod,
    canWrite,
    canApprove,
    transactions,
    filteredTransactions,
    accounts,
    categories,
    entities,
    filters,
    form,
    mode,
    draftTransactionId,
    selectedTransactionId,
    selectedTransaction,
    currentDraftSource,
    selectedIsEditing,
    submitLabel,
    filteredCount,
    totals,
    loading,
    catalogLoading,
    submitting,
    error,
    message,
    updateFilter,
    updateForm,
    startCreateMode,
    startEditMode,
    submitTransaction,
    deleteSelectedTransaction,
    setSelectedTransactionId,
    setMode,
    setDraftTransactionId
  };
}

export type FinanceTransactionsController = ReturnType<typeof useFinanceTransactionsController>;
