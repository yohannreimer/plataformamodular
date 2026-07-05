import express, { type NextFunction, type Request, type Response } from 'express';
import { initDb, resetDbConnection, seedDb } from './db.js';
import { registerCoreRoutes } from './coreRoutes.js';
import { registerFinanceRoutes } from './finance/routes.js';
import { registerPlanningRoutes } from './planning/routes.js';
import { registerPortalRoutes } from './portal/routes.js';
import { createCorsMiddleware, createJsonBodyParser } from './security.js';

export type CreateAppOptions = {
  forceDbRefresh?: boolean;
  initDb?: boolean;
  seedDb?: boolean;
  enforceInternalAuth?: boolean;
  enforceAccountProductAccess?: boolean;
};

export function createApp(options: CreateAppOptions = {}) {
  const {
    forceDbRefresh = false,
    initDb: shouldInitDb = true,
    seedDb: shouldSeedDb = true,
    enforceInternalAuth = false,
    enforceAccountProductAccess = false
  } = options;

  if (forceDbRefresh) {
    resetDbConnection();
  }

  if (shouldInitDb) {
    initDb();
  }
  if (shouldSeedDb) {
    seedDb();
  }

  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY?.trim() || 'loopback, linklocal, uniquelocal');
  app.use(createCorsMiddleware());
  app.use(createJsonBodyParser());
  registerCoreRoutes(app, { enforceInternalAuth, enforceAccountProductAccess });
  registerPlanningRoutes(app);
  registerFinanceRoutes(app);
  registerPortalRoutes(app);
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : null;
    const type = typeof error === 'object' && error !== null && 'type' in error
      ? String((error as { type?: unknown }).type)
      : '';
    if (res.headersSent) {
      return;
    }
    if (status === 413 || type === 'entity.too.large') {
      return res.status(413).json({ message: 'Payload muito grande.' });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api] unexpected error:', message);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  });

  return app;
}
