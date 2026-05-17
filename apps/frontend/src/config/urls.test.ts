import { describe, expect, test } from 'vitest';
import { productEntryPathForHostname } from './urls';

describe('productEntryPathForHostname', () => {
  test('routes public product domains straight to their modules', () => {
    expect(productEntryPathForHostname('fluvia.prymeiradigital.com.br')).toBe('/m/financeiro');
    expect(productEntryPathForHostname('velio.prymeiradigital.com.br')).toBe('/m/tecnico');
  });

  test('keeps the shared app domain on the hub', () => {
    expect(productEntryPathForHostname('hub.prymeiradigital.com.br')).toBeNull();
    expect(productEntryPathForHostname('localhost')).toBeNull();
  });
});
