import { readRuntimeConfig } from '../config/runtime';
import type { AccountAccessState } from './accountAccess';
import {
  INTERNAL_PERMISSION_KEYS,
  type InternalSessionData
} from './session';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeHostname(hostname: string | undefined): string {
  const value = (hostname ?? '').trim().toLowerCase();
  if (!value) return '';
  if (value === '::1') return value;
  if (value.startsWith('[')) {
    const closingBracketIndex = value.indexOf(']');
    return closingBracketIndex > 0 ? value.slice(1, closingBracketIndex) : value;
  }
  return value.split(':')[0] ?? '';
}

export function isLocalAuthBypassEnabled(hostname = window.location.hostname): boolean {
  const env = (import.meta as unknown as { env?: { PROD?: boolean } }).env;
  if (env?.PROD === true) return false;
  if (readRuntimeConfig('VITE_LOCAL_AUTH_BYPASS') !== '1') return false;
  return LOCAL_HOSTS.has(normalizeHostname(hostname));
}

export function createLocalDevSession(): InternalSessionData {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    token: 'local-dev-auth-bypass',
    expires_at: expiresAt,
    user: {
      id: 'local-dev-user',
      username: 'local.dev@prymeira.test',
      display_name: 'Dev Financeiro',
      role: 'supremo',
      permissions: [...INTERNAL_PERMISSION_KEYS],
      preferences: {
        calendar_vivid_mode: false
      }
    }
  };
}

export function createLocalDevAccountAccess(): AccountAccessState {
  return {
    customer: {
      id: 'local-dev-customer',
      email: 'local.dev@prymeira.test',
      name: 'Dev Local'
    },
    workspace: {
      id: 'org-holand',
      name: 'Holand',
      type: 'organization',
      role: 'owner'
    },
    products: [
      {
        product_key: 'financeiro',
        name: 'ERP Financeiro',
        description: 'Acesso local de desenvolvimento ao financeiro.',
        app_url: '/m/financeiro',
        marketing_url: null,
        status: 'active',
        plan: 'dev',
        source: 'local_auth_bypass',
        workspace_id: 'org-holand',
        workspace_role: 'owner',
        product_role: 'supremo',
        allowed: true,
        reason: 'local_auth_bypass'
      },
      {
        product_key: 'orquestrador',
        name: 'Prymeira Flowcut',
        description: 'Acesso local de desenvolvimento ao orquestrador.',
        app_url: '/m/tecnico',
        marketing_url: null,
        status: 'active',
        plan: 'dev',
        source: 'local_auth_bypass',
        workspace_id: 'org-holand',
        workspace_role: 'owner',
        product_role: 'supremo',
        allowed: true,
        reason: 'local_auth_bypass'
      }
    ]
  };
}
