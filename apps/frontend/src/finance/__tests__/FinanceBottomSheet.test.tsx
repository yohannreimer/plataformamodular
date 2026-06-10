import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FinanceBottomSheet } from '../components/FinanceBottomSheet';

test('bottom sheet renders an accessible dialog when open', () => {
  render(
    <FinanceBottomSheet open title="Detalhes do lançamento" onClose={vi.fn()}>
      <button type="button">Editar linha</button>
    </FinanceBottomSheet>
  );

  const dialog = screen.getByRole('dialog', { name: 'Detalhes do lançamento' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(within(dialog).getByRole('button', { name: 'Editar linha' })).toBeInTheDocument();
});

test('bottom sheet calls onClose from close button and escape key', () => {
  const onClose = vi.fn();
  render(
    <FinanceBottomSheet open title="Filtros" onClose={onClose}>
      <p>Conteúdo</p>
    </FinanceBottomSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Fechar Filtros' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('bottom sheet keeps editing open when dirty close is rejected', () => {
  const onClose = vi.fn();
  const confirmClose = vi.fn(() => false);
  render(
    <FinanceBottomSheet open title="Editar lançamento" onClose={onClose} dirty confirmClose={confirmClose}>
      <p>Formulário</p>
    </FinanceBottomSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Fechar Editar lançamento' }));
  expect(confirmClose).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});
