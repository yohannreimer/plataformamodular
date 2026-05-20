import { readRuntimeConfig } from './runtime';

export const PRYMEIRA_HUB_URL = (
  readRuntimeConfig('VITE_PRYMEIRA_HUB_URL') ?? 'https://hub.prymeiradigital.com.br'
).replace(/\/$/, '');

type ProductAccessDeniedUrlOptions = {
  reason?: string;
  returnUrl?: string;
};

export function productAccessDeniedUrl(productKey: string, options: ProductAccessDeniedUrlOptions = {}) {
  const params = new URLSearchParams({
    product_key: productKey,
    reason: options.reason ?? 'no_entitlement'
  });

  if (options.returnUrl) {
    params.set('return_url', options.returnUrl);
  }

  return `${PRYMEIRA_HUB_URL}/acesso-negado?${params.toString()}`;
}

export function productEntryPathForHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (normalized === 'fluvia.prymeiradigital.com.br' || normalized === 'fluvia.primeiradigital.com.br') {
    return '/m/financeiro';
  }

  if (normalized === 'velio.prymeiradigital.com.br' || normalized === 'velio.primeiradigital.com.br') {
    return '/m/tecnico';
  }

  return null;
}

export function productBrowserTitleForHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (normalized === 'fluvia.prymeiradigital.com.br' || normalized === 'fluvia.primeiradigital.com.br') {
    return 'Prymeira Fluvia';
  }

  if (normalized === 'velio.prymeiradigital.com.br' || normalized === 'velio.primeiradigital.com.br') {
    return 'Prymeira Velio';
  }

  return 'Prymeira Apps';
}
