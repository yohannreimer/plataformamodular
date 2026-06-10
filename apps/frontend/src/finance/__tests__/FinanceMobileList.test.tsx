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
