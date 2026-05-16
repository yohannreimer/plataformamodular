import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ModuleHubPage } from './ModuleHubPage';
import type { InternalSessionUser } from '../auth/session';
import type { AccountAccessState } from '../auth/accountAccess';

function user(role: InternalSessionUser['role'], permissions: InternalSessionUser['permissions']): InternalSessionUser {
  return {
    id: `user-${role}`,
    username: role,
    display_name: 'Yohann',
    role,
    permissions
  };
}

const allProductsAllowed: AccountAccessState = {
  customer: {
    id: 'customer-1',
    email: 'yohannreimer20@gmail.com',
    name: 'Yohann'
  },
  workspace: {
    id: 'workspace-1',
    name: 'Yohann',
    type: 'individual',
    role: 'owner'
  },
  products: [
    {
      product_key: 'orquestrador',
      name: 'Gestão Técnica',
      description: null,
      app_url: 'http://localhost:5173/m/tecnico',
      marketing_url: null,
      status: 'active',
      workspace_id: 'workspace-1',
      workspace_role: 'owner',
      product_role: 'owner',
      allowed: true,
      reason: 'active_entitlement'
    },
    {
      product_key: 'financeiro',
      name: 'Financeiro',
      description: null,
      app_url: 'http://localhost:5173/m/financeiro',
      marketing_url: null,
      status: 'active',
      workspace_id: 'workspace-1',
      workspace_role: 'owner',
      product_role: 'owner',
      allowed: true,
      reason: 'active_entitlement'
    }
  ]
};

test('renders module cards with direct entry links', () => {
  render(
    <MemoryRouter>
      <ModuleHubPage
        user={user('supremo', ['calendar', 'cohorts', 'finance.read'])}
        accountAccess={allProductsAllowed}
        onLogout={() => null}
      />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'Seus módulos ativos' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /abrir financeiro/i })).toHaveAttribute('href', '/m/financeiro');
  expect(screen.getByRole('link', { name: /abrir gestão técnica/i })).toHaveAttribute('href', '/m/tecnico');
});

test('renders only modules available to the user', () => {
  render(
    <MemoryRouter>
      <ModuleHubPage
        user={user('custom', ['clients'])}
        accountAccess={allProductsAllowed}
        onLogout={() => null}
      />
    </MemoryRouter>
  );

  expect(screen.queryByRole('link', { name: /abrir financeiro/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /abrir gestão técnica/i })).toBeInTheDocument();
});
