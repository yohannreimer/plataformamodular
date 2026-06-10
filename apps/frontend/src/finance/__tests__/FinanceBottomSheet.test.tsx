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

test('bottom sheet renders no dialog when closed', () => {
  render(
    <FinanceBottomSheet open={false} title="Filtros" onClose={vi.fn()}>
      <p>Conteúdo</p>
    </FinanceBottomSheet>
  );

  expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument();
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

test('bottom sheet moves focus to close button and restores previous focus when closed', () => {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'Abrir detalhes';
  document.body.appendChild(trigger);
  trigger.focus();

  const onClose = vi.fn();
  const { rerender } = render(
    <FinanceBottomSheet open title="Detalhes" onClose={onClose}>
      <button type="button">Salvar</button>
    </FinanceBottomSheet>
  );

  const closeButton = screen.getByRole('button', { name: 'Fechar Detalhes' });
  expect(closeButton).toHaveFocus();

  fireEvent.click(closeButton);
  expect(onClose).toHaveBeenCalledTimes(1);

  rerender(
    <FinanceBottomSheet open={false} title="Detalhes" onClose={onClose}>
      <button type="button">Salvar</button>
    </FinanceBottomSheet>
  );

  expect(trigger).toHaveFocus();
  trigger.remove();
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

test('bottom sheet keeps editing open when dirty escape close is rejected', () => {
  const onClose = vi.fn();
  const confirmClose = vi.fn(() => false);
  render(
    <FinanceBottomSheet open title="Editar lançamento" onClose={onClose} dirty confirmClose={confirmClose}>
      <p>Formulário</p>
    </FinanceBottomSheet>
  );

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(confirmClose).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test('bottom sheet calls onClose from scrim click', () => {
  const onClose = vi.fn();
  const { container } = render(
    <FinanceBottomSheet open title="Filtros" onClose={onClose}>
      <p>Conteúdo</p>
    </FinanceBottomSheet>
  );

  const scrim = container.querySelector('.finance-bottom-sheet__scrim');
  expect(scrim).not.toBeNull();
  fireEvent.click(scrim as Element);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('bottom sheet keeps editing open when dirty scrim close is rejected', () => {
  const onClose = vi.fn();
  const confirmClose = vi.fn(() => false);
  const { container } = render(
    <FinanceBottomSheet open title="Editar lançamento" onClose={onClose} dirty confirmClose={confirmClose}>
      <p>Formulário</p>
    </FinanceBottomSheet>
  );

  const scrim = container.querySelector('.finance-bottom-sheet__scrim');
  expect(scrim).not.toBeNull();
  fireEvent.click(scrim as Element);
  expect(confirmClose).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test('bottom sheet wraps tab focus inside the dialog', () => {
  render(
    <FinanceBottomSheet open title="Filtros" onClose={vi.fn()}>
      <button type="button">Primeiro campo</button>
      <button type="button">Aplicar</button>
    </FinanceBottomSheet>
  );

  const dialog = screen.getByRole('dialog', { name: 'Filtros' });
  const closeButton = within(dialog).getByRole('button', { name: 'Fechar Filtros' });
  const applyButton = within(dialog).getByRole('button', { name: 'Aplicar' });

  applyButton.focus();
  fireEvent.keyDown(document, { key: 'Tab' });

  expect(closeButton).toHaveFocus();
});
