import { describe, expect, test } from 'vitest';
import { createLocalDevAccountAccess, createLocalDevSession, isLocalAuthBypassEnabled } from './localDevAuth';

describe('local dev auth bypass', () => {
  test('only enables on local hostnames with explicit runtime flag', () => {
    window.__PRYMEIRA_CONFIG__ = { VITE_LOCAL_AUTH_BYPASS: '1' };

    expect(isLocalAuthBypassEnabled('localhost')).toBe(true);
    expect(isLocalAuthBypassEnabled('127.0.0.1')).toBe(true);
    expect(isLocalAuthBypassEnabled('fluvia.prymeiradigital.com.br')).toBe(false);
  });

  test('creates a supremo finance session and active product access', () => {
    const session = createLocalDevSession();
    const access = createLocalDevAccountAccess();

    expect(session.token).toBe('local-dev-auth-bypass');
    expect(session.user.role).toBe('supremo');
    expect(session.user.permissions).toContain('finance.reconcile');
    expect(access.products.find((product) => product.product_key === 'financeiro')?.allowed).toBe(true);
  });
});
