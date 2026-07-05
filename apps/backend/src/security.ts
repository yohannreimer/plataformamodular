import cors, { type CorsOptions } from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const DEFAULT_PRODUCTION_CORS_ORIGINS = [
  'https://fluvia.prymeiradigital.com.br',
  'https://velio.prymeiradigital.com.br',
  'https://fluvia.com.br',
  'https://www.fluvia.com.br',
  'https://velio.com.br',
  'https://www.velio.com.br'
];

const DEFAULT_DEVELOPMENT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function configuredCorsOrigins() {
  const envOrigins = parseCsvEnv(process.env.CORS_ORIGINS);
  if (envOrigins.length > 0) {
    return envOrigins;
  }

  return process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_CORS_ORIGINS
    : DEFAULT_DEVELOPMENT_CORS_ORIGINS;
}

export function createCorsMiddleware() {
  const allowedOrigins = new Set(configuredCorsOrigins());
  const options: CorsOptions = {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Clerk-Token', 'X-Clerk-Authorization'],
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin) ? origin : false);
    },
    optionsSuccessStatus: 204
  };

  return cors(options);
}

type LoginAttemptState = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number;
};

const internalLoginAttempts = new Map<string, LoginAttemptState>();
export const INTERNAL_SESSION_COOKIE_NAME = 'pm_internal_session';
export const PORTAL_SESSION_COOKIE_NAME = 'pm_portal_session';

function readPositiveIntegerEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function internalLoginRateLimitConfig() {
  return {
    attempts: readPositiveIntegerEnv('INTERNAL_LOGIN_RATE_LIMIT_ATTEMPTS', 8),
    windowMs: readPositiveIntegerEnv('INTERNAL_LOGIN_RATE_LIMIT_WINDOW_MS', 60_000),
    blockMs: readPositiveIntegerEnv('INTERNAL_LOGIN_RATE_LIMIT_BLOCK_MS', 5 * 60_000)
  };
}

function internalLoginRateLimitKey(req: Request, username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const userAgent = req.get('user-agent')?.slice(0, 120) ?? '';
  return `${req.ip}:${userAgent}:${normalizedUsername}`;
}

function pruneExpiredInternalLoginAttempts(now: number, windowMs: number) {
  if (internalLoginAttempts.size <= 3000) return;
  for (const [key, state] of internalLoginAttempts) {
    if (state.blockedUntil <= now && now - state.firstAttemptAt > windowMs) {
      internalLoginAttempts.delete(key);
    }
  }
}

export function isInternalLoginRateLimited(req: Request, username: string) {
  const now = Date.now();
  const { windowMs } = internalLoginRateLimitConfig();
  const state = internalLoginAttempts.get(internalLoginRateLimitKey(req, username));
  if (!state) return false;
  if (state.blockedUntil > now) return true;
  if (now - state.firstAttemptAt > windowMs) {
    internalLoginAttempts.delete(internalLoginRateLimitKey(req, username));
  }
  return false;
}

export function recordInternalLoginFailure(req: Request, username: string) {
  const now = Date.now();
  const { attempts, windowMs, blockMs } = internalLoginRateLimitConfig();
  const key = internalLoginRateLimitKey(req, username);
  const existing = internalLoginAttempts.get(key);
  const state = existing && now - existing.firstAttemptAt <= windowMs
    ? existing
    : { attempts: 0, firstAttemptAt: now, blockedUntil: 0 };

  state.attempts += 1;
  if (state.attempts >= attempts) {
    state.blockedUntil = now + blockMs;
  }

  internalLoginAttempts.set(key, state);
  pruneExpiredInternalLoginAttempts(now, windowMs);
}

export function clearInternalLoginFailures(req: Request, username: string) {
  internalLoginAttempts.delete(internalLoginRateLimitKey(req, username));
}

export function readCookie(req: Request, name: string): string | null {
  const cookieHeader = req.header('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName !== name) continue;
    const rawValue = rawValueParts.join('=');
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

function cookieAttributes(expiresAt?: string) {
  const attrs = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (process.env.NODE_ENV === 'production') {
    attrs.push('Secure');
  }
  if (expiresAt) {
    const expires = new Date(expiresAt);
    if (!Number.isNaN(expires.getTime())) {
      attrs.push(`Expires=${expires.toUTCString()}`);
    }
  }
  return attrs;
}

export function setSessionCookie(res: Response, name: string, token: string, expiresAt: string) {
  res.append('Set-Cookie', `${name}=${encodeURIComponent(token)}; ${cookieAttributes(expiresAt).join('; ')}`);
}

export function clearSessionCookie(res: Response, name: string) {
  res.append('Set-Cookie', `${name}=; ${cookieAttributes('1970-01-01T00:00:00.000Z').join('; ')}; Max-Age=0`);
}

function jsonBodyLimitForPath(pathname: string) {
  if (
    pathname === '/finance/assistant/transcribe'
    || pathname.startsWith('/portal/api/tickets')
    || pathname.startsWith('/implementation/kanban')
  ) {
    return '35mb';
  }

  if (pathname.startsWith('/internal-documents')) {
    return '15mb';
  }

  if (pathname.startsWith('/finance/ofx') || pathname.startsWith('/finance/reconciliation/ofx')) {
    return '35mb';
  }

  return '2mb';
}

export function createJsonBodyParser() {
  const parsers = new Map<string, ReturnType<typeof express.json>>();
  return (req: Request, res: Response, next: NextFunction) => {
    const limit = jsonBodyLimitForPath(req.path);
    let parser = parsers.get(limit);
    if (!parser) {
      parser = express.json({ limit });
      parsers.set(limit, parser);
    }
    return parser(req, res, next);
  };
}
