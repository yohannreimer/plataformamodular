import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ModuleHubPage } from './ModuleHubPage';
import type { InternalSessionUser } from '../auth/session';

function user(role: InternalSessionUser['role'], permissions: InternalSessionUser['permissions']): InternalSessionUser {
  return {
    id: `user-${role}`,
    username: role,
    display_name: 'Yohann',
    role,
    permissions
  };
}

test('renders module cards with direct entry links', () => {
  render(
    <MemoryRouter>
      <ModuleHubPage user={user('supremo', ['calendar', 'cohorts', 'finance.read'])} onLogout={() => null} />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'Seus módulos ativos' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /abrir financeiro/i })).toHaveAttribute('href', '/m/financeiro');
  expect(screen.getByRole('link', { name: /abrir gestão técnica/i })).toHaveAttribute('href', '/m/tecnico');
});

test('renders only modules available to the user', () => {
  render(
    <MemoryRouter>
      <ModuleHubPage user={user('custom', ['clients'])} onLogout={() => null} />
    </MemoryRouter>
  );

  expect(screen.queryByRole('link', { name: /abrir financeiro/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /abrir gestão técnica/i })).toBeInTheDocument();
});
