const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const PRYMEIRA_HUB_URL = (
  env?.VITE_PRYMEIRA_HUB_URL ?? 'https://hub.prymeiradigital.com.br'
).replace(/\/$/, '');
