import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FinanceMobileFilterSheet } from '../components/FinanceMobileFilterSheet';
import { FinanceMobileList, FinanceMobileListCard } from '../components/FinanceMobileList';

test('mobile list renders actionable financial cards', () => {
  const onSelect = vi.fn();
  render(
    <FinanceMobileList ariaLabel="Lançamentos mobile">
      <FinanceMobileListCard
        title="Mensalidade de serviços"
        amount="R$ 125,00"
        amountTone="expense"
        status="Em aberto"
        date="25/04/2026"
        meta={['Alpha Serviços', 'Despesas Operacionais']}
        onClick={onSelect}
      />
    </FinanceMobileList>
  );

  const list = screen.getByRole('list', { name: 'Lançamentos mobile' });
  const item = within(list).getByRole('button', { name: /mensalidade de serviços/i });
  expect(item).toHaveTextContent('R$ 125,00');
  expect(item).toHaveTextContent('Em aberto');
  fireEvent.click(item);
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test('mobile list card supports disabled actionable state', () => {
  const onSelect = vi.fn();
  render(
    <FinanceMobileList ariaLabel="Lançamentos mobile">
      <FinanceMobileListCard
        title="Recebível liquidado"
        amount="R$ 300,00"
        status="Recebido"
        disabled
        onClick={onSelect}
      />
    </FinanceMobileList>
  );

  const item = screen.getByRole('button', { name: /recebível liquidado/i });
  expect(item).toBeDisabled();
  fireEvent.click(item);
  expect(onSelect).not.toHaveBeenCalled();
});

test('mobile list card without onClick renders static content', () => {
  render(
    <FinanceMobileList ariaLabel="Conciliação mobile">
      <FinanceMobileListCard
        title="Fornecedor Atlas"
        amount="R$ 1.245,00"
        status="Com sugestão"
        meta={['Banco principal']}
      />
    </FinanceMobileList>
  );

  expect(screen.queryByRole('button', { name: /fornecedor atlas/i })).not.toBeInTheDocument();
  expect(screen.getByText('Fornecedor Atlas')).toBeInTheDocument();
  expect(screen.getByText('R$ 1.245,00')).toBeInTheDocument();
});

test('mobile filter sheet opens supplied filter controls', () => {
  render(
    <FinanceMobileFilterSheet title="Filtros do ledger" activeCount={2}>
      <label htmlFor="ledger-search-mobile">Busca</label>
      <input id="ledger-search-mobile" />
    </FinanceMobileFilterSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Abrir filtros do ledger, 2 filtros ativos' }));
  expect(screen.getByRole('dialog', { name: 'Filtros do ledger' })).toBeInTheDocument();
  expect(screen.getByLabelText('Busca')).toBeInTheDocument();
});

test('mobile filter sheet uses singular active filter label', () => {
  render(
    <FinanceMobileFilterSheet title="Filtros do ledger" activeCount={1}>
      <label htmlFor="ledger-search-single-mobile">Busca</label>
      <input id="ledger-search-single-mobile" />
    </FinanceMobileFilterSheet>
  );

  expect(screen.getByRole('button', { name: 'Abrir filtros do ledger, 1 filtro ativo' })).toBeInTheDocument();
});

test('mobile list card skips empty optional wrappers', () => {
  const { container } = render(
    <FinanceMobileList ariaLabel="Lançamentos mobile">
      <FinanceMobileListCard title="Receita avulsa" amount="R$ 80,00" meta={['']} onClick={vi.fn()} />
    </FinanceMobileList>
  );

  expect(container.querySelector('.finance-mobile-list-card__subhead')).not.toBeInTheDocument();
  expect(container.querySelector('.finance-mobile-list-card__meta')).not.toBeInTheDocument();
});
