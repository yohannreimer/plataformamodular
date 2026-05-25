import type { Request } from 'express';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeHost(value: string | undefined): string {
  const host = (value ?? '').trim().toLowerCase();
  if (!host) return '';
  if (host === '::1') return host;
  if (host.startsWith('[')) {
    const closingBracketIndex = host.indexOf(']');
    return closingBracketIndex > 0 ? host.slice(1, closingBracketIndex) : host;
  }
  return host.split(':')[0] ?? '';
}

function normalizeRemoteAddress(value: string | undefined): string {
  return (value ?? '').replace(/^::ffff:/, '');
}

export function isLocalDevAuthBypassEnabled(req?: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.LOCAL_AUTH_BYPASS !== '1') return false;
  if (!req) return true;

  const host = normalizeHost(req.hostname || req.header('host'));
  const remoteAddress = normalizeRemoteAddress(req.socket.remoteAddress);
  return LOCAL_HOSTS.has(host) || LOCAL_HOSTS.has(remoteAddress);
}
