import { expect, test } from 'vitest';
import { financeNavigationItems } from '../components/FinanceSidebar';

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
