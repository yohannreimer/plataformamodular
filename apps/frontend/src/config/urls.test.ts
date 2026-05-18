import { describe, expect, test } from 'vitest';
import { productBrowserTitleForHostname, productEntryPathForHostname } from './urls';

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
