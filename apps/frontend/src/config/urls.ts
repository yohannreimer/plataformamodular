import { readRuntimeConfig } from './runtime';

export const PRYMEIRA_HUB_URL = (
  readRuntimeConfig('VITE_PRYMEIRA_HUB_URL') ?? 'https://hub.prymeiradigital.com.br'
).replace(/\/$/, '');
