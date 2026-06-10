import { useState, type FormEvent } from 'react';
import { FinanceBottomSheet } from './FinanceBottomSheet';
import { FinanceMobileFilterSheet } from './FinanceMobileFilterSheet';
import { FinanceMobileList, FinanceMobileListCard } from './FinanceMobileList';
import {
  entityName,
  kindOptions,
  statusLabel,
  statusOptions,
  type FinanceTransactionsController,
  type FilterState,
  type TransactionFormState
} from '../hooks/useFinanceTransactionsController';
import { formatCurrency, formatDate, todayIso } from '../utils/financeFormatters';

export function FinanceTransactionsMobileView({ controller }: { controller: FinanceTransactionsController }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    accounts,
    categories,
    entities,
    filters,
    form,
    canWrite,
    selectedTransaction,
    filteredTransactions,
    filteredCount,
    totals,
    loading,
    catalogLoading,
    submitting,
    error,
    message,
    submitLabel,
    selectedIsEditing,
    updateFilter,
    updateForm,
    startCreateMode,
    startEditMode,
    submitTransaction,
    deleteSelectedTransaction,
    setSelectedTransactionId,
    setMode,
    setDraftTransactionId
  } = controller;

  function openTransaction(transactionId: string) {
    setSelectedTransactionId(transactionId);
    setMode('view');
    setDraftTransactionId(null);
    setDetailOpen(true);
  }

  function handleCreate() {
    startCreateMode();
    setDetailOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitTransaction();
  }

  const activeFilterCount = [filters.type !== 'todos', filters.status !== 'todos', Boolean(filters.search.trim())].filter(Boolean).length;
  const editing = selectedIsEditing || controller.mode === 'create';

  return (
    <section className="page finance-page finance-ledger-page finance-ledger-page--mobile">
      <header className="finance-mobile-page-head">
        <div>
          <small>Movimentações</small>
          <h1>Ledger financeiro</h1>
          <p>{filteredCount} lançamentos no filtro atual</p>
        </div>
        <button type="button" className="finance-mobile-primary-action" onClick={handleCreate} disabled={!canWrite}>
          Novo
        </button>
      </header>

      {error ? <div className="finance-mobile-alert finance-mobile-alert--error">{error}</div> : null}
      {message ? <div className="finance-mobile-alert finance-mobile-alert--success">{message}</div> : null}

      <section className="finance-mobile-summary" aria-label="Resumo do ledger">
        <article><span>Total</span><strong>{filteredCount}</strong></article>
        <article><span>Entradas</span><strong>{formatCurrency(totals.in)}</strong></article>
        <article><span>Saídas</span><strong>{formatCurrency(totals.out)}</strong></article>
        <article><span>Saldo</span><strong>{formatCurrency(totals.in - totals.out)}</strong></article>
      </section>

      <div className="finance-mobile-toolbar">
        <FinanceMobileFilterSheet title="Filtros do ledger" activeCount={activeFilterCount}>
          <label className="finance-ledger-field">
            <span>Busca</span>
            <input aria-label="Busca" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} title="Buscar lançamento ou entidade" />
          </label>
          <label className="finance-ledger-field">
            <span>Tipo</span>
            <select aria-label="Tipo" value={filters.type} onChange={(event) => updateFilter('type', event.target.value as FilterState['type'])}>
              {kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="finance-ledger-field">
            <span>Status</span>
            <select aria-label="Status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value as FilterState['status'])}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </FinanceMobileFilterSheet>
        {loading ? <span className="finance-mobile-loading">Atualizando...</span> : null}
      </div>

      <FinanceMobileList ariaLabel="Ledger financeiro mobile">
        {filteredTransactions.map((transaction) => (
          <FinanceMobileListCard
            key={transaction.id}
            title={transaction.note?.trim() || transaction.financial_entity_name || 'Movimentação financeira'}
            amount={`${transaction.kind === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount_cents)}`}
            amountTone={transaction.kind === 'income' ? 'income' : 'expense'}
            status={statusLabel(transaction.status)}
            date={formatDate(transaction.settlement_date ?? transaction.due_date ?? transaction.competence_date ?? transaction.issue_date)}
            meta={[transaction.financial_entity_name || 'Sem entidade', transaction.financial_category_name || 'Sem categoria']}
            onClick={() => openTransaction(transaction.id)}
          />
        ))}
      </FinanceMobileList>

      <FinanceBottomSheet
        open={detailOpen}
        title={editing ? (selectedIsEditing ? 'Editar lançamento' : 'Novo lançamento') : 'Detalhes do lançamento'}
        dirty={editing && Boolean(form.note || form.amount)}
        confirmClose={() => window.confirm('Fechar sem salvar este lançamento?')}
        onClose={() => {
          setDetailOpen(false);
          setMode('view');
          setDraftTransactionId(null);
        }}
      >
        {editing ? (
          <form className="finance-mobile-transaction-form" onSubmit={handleSubmit}>
            <label><span>Descrição</span><input aria-label="Descrição" value={form.note} onChange={(event) => updateForm('note', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Entidade</span><select aria-label="Entidade" value={form.financial_entity_id} onChange={(event) => updateForm('financial_entity_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem entidade</option>{entities.map((entry) => <option key={entry.id} value={entry.id}>{entityName(entry)}</option>)}</select></label>
            <label><span>Conta</span><select aria-label="Conta" value={form.financial_account_id} onChange={(event) => updateForm('financial_account_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem conta</option>{accounts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label><span>Categoria</span><select aria-label="Categoria" value={form.financial_category_id} onChange={(event) => updateForm('financial_category_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem categoria</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label><span>Valor</span><input aria-label="Valor" inputMode="decimal" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Tipo</span><select aria-label="Tipo do lançamento" value={form.kind} onChange={(event) => updateForm('kind', event.target.value as TransactionFormState['kind'])} disabled={!canWrite || submitting}><option value="income">Entrada</option><option value="expense">Saída</option></select></label>
            <label><span>Status</span><select aria-label="Status do lançamento" value={form.status} onChange={(event) => updateForm('status', event.target.value as TransactionFormState['status'])} disabled={!canWrite || submitting}>{statusOptions.filter((option) => option.value !== 'todos').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Emissão</span><input aria-label="Data de emissão" type="date" value={form.issue_date} onChange={(event) => updateForm('issue_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Vencimento</span><input aria-label="Data de vencimento" type="date" value={form.due_date} onChange={(event) => updateForm('due_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Competência</span><input aria-label="Data de competência" type="date" value={form.competence_date} onChange={(event) => updateForm('competence_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Baixa</span><input aria-label="Data da baixa" type="date" value={form.settlement_date || (form.status === 'settled' ? todayIso() : '')} onChange={(event) => updateForm('settlement_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <button type="submit" className="finance-mobile-primary-action" disabled={!canWrite || submitting}>{submitting ? 'Salvando...' : submitLabel}</button>
          </form>
        ) : selectedTransaction ? (
          <div className="finance-mobile-transaction-detail">
            <strong>{selectedTransaction.note || 'Movimentação financeira'}</strong>
            <span>{formatCurrency(selectedTransaction.amount_cents)}</span>
            <dl>
              <div><dt>Entidade</dt><dd>{selectedTransaction.financial_entity_name || 'Sem entidade'}</dd></div>
              <div><dt>Conta</dt><dd>{selectedTransaction.financial_account_name || 'Sem conta'}</dd></div>
              <div><dt>Categoria</dt><dd>{selectedTransaction.financial_category_name || 'Sem categoria'}</dd></div>
              <div><dt>Status</dt><dd>{statusLabel(selectedTransaction.status)}</dd></div>
            </dl>
            <div className="finance-mobile-sheet-actions">
              <button type="button" onClick={startEditMode} disabled={!canWrite}>Editar linha</button>
              <button type="button" onClick={() => void deleteSelectedTransaction()} disabled={submitting}>Excluir</button>
            </div>
          </div>
        ) : null}
      </FinanceBottomSheet>
    </section>
  );
}
