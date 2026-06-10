import { expect, test } from 'vitest';
import { financeNavigationItems } from '../components/FinanceSidebar';

test('finance navigation metadata exposes all ERP routes for desktop and mobile shells', () => {
  expect(financeNavigationItems.map((item) => item.to)).toEqual([
    'overview',
    'transactions',
    'receivables',
    'payables',
    'reconciliation',
    'cashflow',
    'reports',
    'cadastros',
    'simulation',
    'advanced'
  ]);
  expect(financeNavigationItems.map((item) => item.label)).toContain('Movimentações');
  expect(financeNavigationItems.map((item) => item.label)).toContain('Conciliação & Revisão');
});
