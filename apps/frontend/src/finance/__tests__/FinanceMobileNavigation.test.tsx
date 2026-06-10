import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { financeNavigationItems } from '../components/FinanceSidebar';
import { FinanceMobileNavigation } from '../components/FinanceMobileNavigation';

test('finance navigation metadata exposes all ERP routes for desktop and mobile shells', () => {
  expect(financeNavigationItems).toEqual([
    { to: 'overview', label: 'Visão Geral', icon: 'overview' },
    { to: 'transactions', label: 'Movimentações', icon: 'transactions' },
    { to: 'receivables', label: 'Contas a Receber', icon: 'receivables' },
    { to: 'payables', label: 'Contas a Pagar', icon: 'payables' },
    { to: 'reconciliation', label: 'Conciliação & Revisão', icon: 'reconciliation' },
    { to: 'cashflow', label: 'Fluxo de Caixa', icon: 'cashflow' },
    { to: 'reports', label: 'Relatórios', icon: 'reports' },
    { to: 'cadastros', label: 'Cadastros', icon: 'cadastros' },
    { to: 'simulation', label: 'Simulação', icon: 'simulation' },
    { to: 'advanced', label: 'Avançado', icon: 'advanced' }
  ]);
});

test('renders the mobile finance header and primary shortcuts for the active canonical route', () => {
  render(
    <MemoryRouter initialEntries={['/m/financeiro/transactions']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  expect(screen.getByRole('banner', { name: 'Cabeçalho financeiro mobile' })).toHaveTextContent('Movimentações');

  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  expect(within(navigation).getByRole('link', { name: /visão geral/i })).toHaveAttribute('href', '/m/financeiro/overview');
  expect(within(navigation).getByRole('link', { name: /movimentações/i })).toHaveAttribute('href', '/m/financeiro/transactions');
  expect(within(navigation).getByRole('link', { name: /receber/i })).toHaveAttribute('href', '/m/financeiro/receivables');
  expect(within(navigation).getByRole('link', { name: /pagar/i })).toHaveAttribute('href', '/m/financeiro/payables');
  expect(within(navigation).getByRole('button', { name: /mais áreas/i })).toBeInTheDocument();
});

test('normalizes legacy finance routes when resolving the active mobile label', () => {
  render(
    <MemoryRouter initialEntries={['/financeiro/transactions']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  expect(screen.getByRole('banner', { name: 'Cabeçalho financeiro mobile' })).toHaveTextContent('Movimentações');
  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  expect(within(navigation).getByRole('link', { name: /movimentações/i })).toHaveClass('is-active');
});

test('keeps nested canonical routes active in the mobile shortcuts', () => {
  render(
    <MemoryRouter initialEntries={['/m/financeiro/transactions/detail']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  expect(screen.getByRole('banner', { name: 'Cabeçalho financeiro mobile' })).toHaveTextContent('Movimentações');
  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  expect(within(navigation).getByRole('link', { name: /movimentações/i })).toHaveClass('is-active');
});

test('opens the mobile overflow menu with secondary links and logout action', () => {
  const onLogout = vi.fn();

  render(
    <MemoryRouter initialEntries={['/m/financeiro/overview']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={onLogout} />
    </MemoryRouter>
  );

  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  fireEvent.click(within(navigation).getByRole('button', { name: /mais áreas/i }));

  const dialog = screen.getByRole('dialog', { name: 'Mais áreas do financeiro' });
  expect(within(dialog).getByRole('link', { name: /conciliação/i })).toHaveAttribute('href', '/m/financeiro/reconciliation');
  expect(within(dialog).getByRole('link', { name: /fluxo de caixa/i })).toHaveAttribute('href', '/m/financeiro/cashflow');
  expect(within(dialog).getByRole('link', { name: /relatórios/i })).toHaveAttribute('href', '/m/financeiro/reports');
  expect(within(dialog).getByRole('link', { name: /cadastros/i })).toHaveAttribute('href', '/m/financeiro/cadastros');
  expect(within(dialog).getByRole('link', { name: /simulação/i })).toHaveAttribute('href', '/m/financeiro/simulation');
  expect(within(dialog).getByRole('link', { name: /avançado/i })).toHaveAttribute('href', '/m/financeiro/advanced');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Sair' }));
  expect(onLogout).toHaveBeenCalledTimes(1);
});

test('focuses the close button when the mobile overflow menu opens', () => {
  render(
    <MemoryRouter initialEntries={['/m/financeiro/overview']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  fireEvent.click(within(navigation).getByRole('button', { name: /mais áreas/i }));

  const dialog = screen.getByRole('dialog', { name: 'Mais áreas do financeiro' });
  expect(within(dialog).getByRole('button', { name: 'Fechar áreas financeiras' })).toHaveFocus();
});

test('closes the mobile overflow menu with Escape', () => {
  render(
    <MemoryRouter initialEntries={['/m/financeiro/overview']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  const navigation = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  fireEvent.click(within(navigation).getByRole('button', { name: /mais áreas/i }));
  expect(screen.getByRole('dialog', { name: 'Mais áreas do financeiro' })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(screen.queryByRole('dialog', { name: 'Mais áreas do financeiro' })).not.toBeInTheDocument();
});
