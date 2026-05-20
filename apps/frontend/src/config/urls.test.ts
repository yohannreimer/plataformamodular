import { describe, expect, test } from 'vitest';
import { productAccessDeniedUrl, productBrowserTitleForHostname, productEntryPathForHostname } from './urls';

describe('productEntryPathForHostname', () => {
  test('routes public product domains straight to their modules', () => {
    expect(productEntryPathForHostname('fluvia.prymeiradigital.com.br')).toBe('/m/financeiro');
    expect(productEntryPathForHostname('velio.prymeiradigital.com.br')).toBe('/m/tecnico');
    expect(productEntryPathForHostname('fluvia.primeiradigital.com.br')).toBe('/m/financeiro');
    expect(productEntryPathForHostname('velio.primeiradigital.com.br')).toBe('/m/tecnico');
  });

  test('keeps the shared app domain on the hub', () => {
    expect(productEntryPathForHostname('hub.prymeiradigital.com.br')).toBeNull();
    expect(productEntryPathForHostname('localhost')).toBeNull();
  });
});

describe('productBrowserTitleForHostname', () => {
  test('names each public product tab', () => {
    expect(productBrowserTitleForHostname('fluvia.prymeiradigital.com.br')).toBe('Prymeira Fluvia');
    expect(productBrowserTitleForHostname('velio.prymeiradigital.com.br')).toBe('Prymeira Velio');
  });

  test('keeps a neutral title outside product domains', () => {
    expect(productBrowserTitleForHostname('localhost')).toBe('Prymeira Apps');
  });
});

describe('productAccessDeniedUrl', () => {
  test('points blocked products to the central Hub access page', () => {
    expect(productAccessDeniedUrl('financeiro', {
      reason: 'no_entitlement',
      returnUrl: 'https://fluvia.prymeiradigital.com.br/m/financeiro'
    })).toBe(
      'https://hub.prymeiradigital.com.br/acesso-negado?product_key=financeiro&reason=no_entitlement&return_url=https%3A%2F%2Ffluvia.prymeiradigital.com.br%2Fm%2Ffinanceiro'
    );
  });
});
