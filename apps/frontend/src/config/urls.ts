import { readRuntimeConfig } from './runtime';

export const PRYMEIRA_HUB_URL = (
  readRuntimeConfig('VITE_PRYMEIRA_HUB_URL') ?? 'https://hub.prymeiradigital.com.br'
).replace(/\/$/, '');

export function productEntryPathForHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (normalized === 'fluvia.prymeiradigital.com.br') {
    return '/m/financeiro';
  }

  if (normalized === 'velio.prymeiradigital.com.br') {
    return '/m/tecnico';
  }

  return null;
}
