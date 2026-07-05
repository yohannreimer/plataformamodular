import type { NextFunction, Request, Response } from 'express';
import { checkAccountProductAccess, type AccountProductKey } from './client.js';
import { isLocalDevAuthBypassEnabled } from '../localDevAuth.js';

const PUBLIC_PREFIXES = ['/auth/', '/portal/api'];

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function extractClerkToken(req: Request): string | null {
  const directToken = readHeaderValue(req.headers['x-clerk-token']);
  if (directToken?.trim()) return directToken.trim();

  const clerkAuthorization = readHeaderValue(req.headers['x-clerk-authorization']);
  const match = clerkAuthorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function resolveAccountProductForRequest(req: Request): AccountProductKey | null {
  if (req.path === '/health') return null;
  if (PUBLIC_PREFIXES.some((prefix) => req.path.startsWith(prefix))) return null;

  if (req.path === '/finance' || req.path.startsWith('/finance/')) {
    return 'financeiro';
  }

  return 'orquestrador';
}

export async function requireAccountProductAccess(req: Request, res: Response, next: NextFunction) {
  const productKey = resolveAccountProductForRequest(req);
  if (!productKey) {
    return next();
  }

  if (isLocalDevAuthBypassEnabled(req)) {
    res.locals.prymeiraAccountAccess = {
      allowed: true,
      product_key: productKey,
      status: 'active',
      reason: 'local_auth_bypass'
    };
    return next();
  }

  const clerkToken = extractClerkToken(req);
  if (!clerkToken) {
    return res.status(401).json({
      message: 'Token Clerk obrigatório para validar acesso ao produto.',
      product_key: productKey,
      reason: 'missing_clerk_token'
    });
  }

  try {
    const decision = await checkAccountProductAccess(clerkToken, productKey);
    if (decision.allowed) {
      res.locals.prymeiraAccountAccess = decision;
      return next();
    }

    return res.status(403).json({
      message: 'Acesso ao produto bloqueado pela Prymeira Account.',
      product_key: productKey,
      status: decision.status,
      reason: decision.reason,
      upgrade_url: decision.upgrade_url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[account-product-access] validation failed:', message);
    return res.status(502).json({
      message: 'Não foi possível validar acesso na Prymeira Account.',
      product_key: productKey,
      reason: 'account_validation_failed'
    });
  }
}
