import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ACCOUNT_ACCESS_STORAGE_KEY, accountAccessStore } from './accountAccess';

describe('accountAccessStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  test('reads workspace context from stored account access', () => {
    window.localStorage.setItem(ACCOUNT_ACCESS_STORAGE_KEY, JSON.stringify({
      customer: {
        id: 'customer-1',
        email: 'user@example.com',
        name: 'User'
      },
      workspace: {
        id: 'workspace-1',
        name: 'Acme Ltda',
        type: 'company',
        role: 'owner'
      },
      products: [
        {
          product_key: 'financeiro',
          name: 'Fluvia',
          description: null,
          app_url: 'http://localhost:5173/m/financeiro',
          marketing_url: null,
          status: 'active',
          workspace_id: 'workspace-1',
          workspace_role: 'owner',
          product_role: 'owner',
          seats_limit: 3,
          allowed: true,
          reason: 'active_entitlement'
        }
      ]
    }));

    const state = accountAccessStore.read();

    expect(state?.workspace).toEqual({
      id: 'workspace-1',
      name: 'Acme Ltda',
      type: 'company',
      role: 'owner'
    });
    expect(state?.products[0]).toMatchObject({
      product_key: 'financeiro',
      workspace_id: 'workspace-1',
      workspace_role: 'owner',
      product_role: 'owner',
      seats_limit: 3
    });
  });
});
