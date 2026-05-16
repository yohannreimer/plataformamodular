# Plataforma Modular Prymeira Account Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Plataforma Modular with Prymeira Account so the existing hub can gate the technical and finance modules through central product entitlements while preserving the app's current internal permissions.

**Architecture:** Keep Plataforma Modular as one deploy for now. Use Clerk for user authentication, Prymeira Account API for product-level access (`orquestrador`, `financeiro`), and the existing internal session/permission system for sub-feature access inside each module. The frontend sends both the local internal session token and the current Clerk token to the backend during the transition.

**Tech Stack:** React + Vite frontend, Express backend, SQLite existing app DB, Clerk React SDK, local backend Account API HTTP client, Prymeira Account API at `localhost:3001`.

---

## Scope Check

This plan integrates the existing app with Prymeira Account. It does not extract the hub into `Prymeira Account/apps/hub-web`, split finance/technical into separate apps, add billing, or build an Admin UI.

The hub remains in:

```txt
apps/frontend/src/core/ModuleHubPage.tsx
```

The products are mapped as:

```txt
/m/tecnico    -> orquestrador
/m/financeiro -> financeiro
```

## File Structure

Expected files to create or modify:

```txt
apps/backend/package.json
apps/backend/src/account/
  client.ts
  productAccess.ts
apps/backend/src/app.ts
apps/backend/src/coreRoutes.ts
apps/backend/src/finance/routes.ts
apps/backend/src/internalAuth.ts
apps/backend/src/account/accountAuth.test.ts

apps/frontend/package.json
apps/frontend/src/main.tsx
apps/frontend/src/App.tsx
apps/frontend/src/auth/accountAccess.ts
apps/frontend/src/auth/clerkToken.ts
apps/frontend/src/auth/session.ts
apps/frontend/src/core/modules.ts
apps/frontend/src/core/ModuleHubPage.tsx
apps/frontend/src/services/api.ts
apps/frontend/src/pages/NoProductAccessPage.tsx
```

The exact test file names can be adjusted to match local testing patterns, but route/auth behavior must be covered.

## Task 0: Git Safety

**Files:**

- None unless creating a repo is explicitly approved.

- [ ] **Step 1: Confirm git state**

Run:

```bash
git status --short --branch
```

Expected: this currently fails because `Plataforma Modular` is not a Git repository.

- [ ] **Step 2: Choose safety mode**

If the user wants version control before implementation, initialize Git:

```bash
git init
git add .
git commit -m "chore: baseline plataforma modular"
git checkout -b codex/prymeira-account-integration
```

If the user does not want Git yet, proceed without commit steps and keep a precise file-change summary after each task.

## Task 1: Backend Account API Client

**Files:**

- Create: `apps/backend/src/account/client.ts`
- Modify: `apps/backend/package.json` only if a dependency is needed. Prefer built-in `fetch` first.

- [ ] **Step 1: Add Account API types and client**

Create `apps/backend/src/account/client.ts`:

```ts
export type AccountProductKey = 'orquestrador' | 'financeiro';

export type AccountAccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
  limits?: Record<string, unknown>;
  reason: string;
  upgrade_url?: string;
};

export type AccountMeProductsResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  products: Array<{
    product_key: string;
    name: string;
    description: string | null;
    app_url: string;
    marketing_url: string | null;
    status: string;
    plan?: string;
    allowed: boolean;
    reason: string;
  }>;
};

export type AccountSyncCustomerInput = {
  clerk_user_id: string;
  email: string;
  name?: string;
};

function accountApiBaseUrl() {
  return (process.env.PRYMEIRA_ACCOUNT_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

async function accountRequest<T>(path: string, clerkToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${accountApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clerkToken}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Prymeira Account API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function syncAccountCustomer(clerkToken: string, input: AccountSyncCustomerInput) {
  return accountRequest<{ customer_id: string; clerk_user_id: string; email: string }>(
    '/customers/sync',
    clerkToken,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export async function readAccountProducts(clerkToken: string) {
  return accountRequest<AccountMeProductsResponse>('/me/products', clerkToken);
}

export async function checkAccountProductAccess(clerkToken: string, productKey: AccountProductKey) {
  return accountRequest<AccountAccessDecision>(
    `/access-check?product_key=${encodeURIComponent(productKey)}`,
    clerkToken
  );
}
```

- [ ] **Step 2: Run backend typecheck**

Run:

```bash
npm --workspace apps/backend run build
```

Expected: PASS.

## Task 2: Backend Clerk-To-Internal Bootstrap

**Files:**

- Modify: `apps/backend/src/internalAuth.ts`
- Modify: `apps/backend/src/coreRoutes.ts`
- Test: `apps/backend/src/account/accountAuth.test.ts`

- [ ] **Step 1: Add internal user lookup/provision helpers**

In `apps/backend/src/internalAuth.ts`, add exported helpers near existing internal user functions:

```ts
export function readInternalUserByUsernameForAuth(username: string): InternalUserDto | null {
  const row = readInternalUserByUsername(username);
  return row ? rowToDto(row) : null;
}

export function createInternalSessionForUserId(internalUserId: string): {
  token: string;
  expires_at: string;
  user: InternalAuthContext;
} | null {
  const row = readInternalUserById(internalUserId);
  if (!row || Number(row.is_active) !== 1) return null;

  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const nowIso = new Date().toISOString();
  const expiresAt = computeSessionExpiry(Date.now());

  db.prepare(`
    insert into internal_session (
      id, internal_user_id, token_hash, expires_at, created_at, last_seen_at
    ) values (?, ?, ?, ?, ?, ?)
  `).run(uuid('isess'), row.id, tokenHash, expiresAt, nowIso, nowIso);

  db.prepare(`
    update internal_user
    set last_login_at = ?, updated_at = ?
    where id = ?
  `).run(nowIso, nowIso, row.id);

  return {
    token,
    expires_at: expiresAt,
    user: buildAuthContextFromSessionRow({
      session_id: '',
      expires_at: expiresAt,
      internal_user_id: row.id,
      username: row.username,
      display_name: row.display_name,
      role: normalizeRole(row.role),
      permissions_json: row.permissions_json,
      preferences_json: row.preferences_json,
      organization_id: row.organization_id
    })
  };
}
```

If `readInternalUserById` is not available, add a small private reader mirroring `readInternalUserByUsername`.

- [ ] **Step 2: Add bootstrap route**

In `apps/backend/src/coreRoutes.ts`, import:

```ts
import { readAccountProducts, syncAccountCustomer } from './account/client.js';
```

Add schema:

```ts
const accountBootstrapSchema = z.object({
  clerk_user_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional()
});
```

Add route under `/auth/*` routes:

```ts
app.post('/auth/account/bootstrap', async (req, res, next) => {
  try {
    const clerkToken = extractInternalBearerToken(req);
    if (!clerkToken) {
      return res.status(401).json({ message: 'Token Clerk obrigatório.' });
    }

    const input = accountBootstrapSchema.parse(req.body);
    await syncAccountCustomer(clerkToken, input);
    const products = await readAccountProducts(clerkToken);

    const username = input.email.toLowerCase();
    let internalUser = readInternalUserByUsernameForAuth(username);
    if (!internalUser) {
      // MVP local mapping: provision supremo only for allowlisted bootstrap admins.
      const admins = new Set((process.env.PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS ?? '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean));
      if (!admins.has(username)) {
        return res.status(403).json({ message: 'Usuário interno não provisionado.' });
      }
      internalUser = createInternalUser({
        username,
        display_name: input.name ?? username,
        password: randomBytes(24).toString('base64url'),
        role: 'supremo',
        permissions: [],
        organization_id: null
      });
    }

    const session = createInternalSessionForUserId(internalUser.id);
    if (!session) {
      return res.status(403).json({ message: 'Usuário interno inativo.' });
    }

    return res.json({
      ...session,
      account: products
    });
  } catch (error) {
    return next(error);
  }
});
```

Adjust helper names to match actual exports after implementing Step 1.

- [ ] **Step 3: Test bootstrap denial**

Add tests for:

- missing Clerk token returns 401.
- non-allowlisted email with no internal user returns 403.
- allowlisted email provisions a `supremo` internal session and returns account products when Account API client is stubbed.

If stubbing module imports is too heavy for the existing Node test runner, isolate provisioning helpers and add focused unit tests.

- [ ] **Step 4: Run backend tests/build**

Run:

```bash
npm --workspace apps/backend test
npm --workspace apps/backend run build
```

Expected: PASS.

## Task 3: Backend Product Access Middleware

**Files:**

- Create: `apps/backend/src/account/productAccess.ts`
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/src/finance/routes.ts`
- Modify: `apps/backend/src/coreRoutes.ts`
- Test: `apps/backend/src/account/accountAuth.test.ts`

- [ ] **Step 1: Add product access middleware**

Create `apps/backend/src/account/productAccess.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';
import { checkAccountProductAccess, type AccountProductKey } from './client.js';

export function readClerkTokenFromRequest(req: Request): string | null {
  const explicit = req.header('x-clerk-token')?.trim();
  if (explicit) return explicit;
  const auth = req.header('authorization');
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireAccountProduct(productKey: AccountProductKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clerkToken = readClerkTokenFromRequest(req);
      if (!clerkToken) {
        return res.status(401).json({ message: 'Token Clerk obrigatório para validar produto.' });
      }

      const decision = await checkAccountProductAccess(clerkToken, productKey);
      if (!decision.allowed) {
        return res.status(403).json({
          message: 'Produto bloqueado para este usuário.',
          product_key: productKey,
          reason: decision.reason,
          upgrade_url: decision.upgrade_url ?? null
        });
      }

      (res.locals as { accountAccess?: Record<string, unknown> }).accountAccess = decision;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
```

- [ ] **Step 2: Protect finance routes**

In `apps/backend/src/finance/routes.ts`, import:

```ts
import { requireAccountProduct } from '../account/productAccess.js';
```

Add before `router.use(requireInternalAuth)`:

```ts
router.use(requireAccountProduct('financeiro'));
```

Expected order:

```ts
router.use(requireAccountProduct('financeiro'));
router.use(requireInternalAuth);
```

This validates product access before internal finance permissions.

- [ ] **Step 3: Protect technical routes**

In `apps/backend/src/coreRoutes.ts`, add a middleware after public auth routes and before technical route handlers when `enforceInternalAuth` is true:

```ts
app.use((req, res, next) => {
  if (!enforceInternalAuth) return next();
  if (isPublicOrPortalPath(req.path)) return next();
  if (req.path.startsWith('/finance')) return next();
  return requireAccountProduct('orquestrador')(req, res, next);
});
```

Import `requireAccountProduct`.

The existing internal permission middleware remains after this.

- [ ] **Step 4: Test product denial**

Add tests that stub the Account API access client:

- `/finance/context` returns 403 when `financeiro` access is denied.
- `/calendar/cohorts` returns 403 when `orquestrador` access is denied.
- Same endpoints continue to reach existing internal auth/permission checks when product access is allowed.

- [ ] **Step 5: Run backend tests/build**

Run:

```bash
npm --workspace apps/backend test
npm --workspace apps/backend run build
```

Expected: PASS.

## Task 4: Frontend Clerk Provider And Token Bridge

**Files:**

- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/src/main.tsx`
- Create: `apps/frontend/src/auth/clerkToken.ts`
- Modify: `apps/frontend/src/services/api.ts`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Install Clerk React**

Run:

```bash
npm install @clerk/clerk-react --workspace apps/frontend
```

- [ ] **Step 2: Add ClerkProvider**

In `apps/frontend/src/main.tsx`, wrap the app:

```tsx
import { ClerkProvider } from '@clerk/clerk-react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

root.render(
  <ClerkProvider publishableKey={publishableKey}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
);
```

Preserve the existing root/render structure.

- [ ] **Step 3: Add token provider bridge**

Create `apps/frontend/src/auth/clerkToken.ts`:

```ts
type ClerkTokenGetter = () => Promise<string | null>;

let currentGetter: ClerkTokenGetter | null = null;

export function setClerkTokenGetter(getter: ClerkTokenGetter | null) {
  currentGetter = getter;
}

export async function readClerkToken(): Promise<string | null> {
  return currentGetter ? currentGetter() : null;
}
```

- [ ] **Step 4: Make API requests async-token aware**

In `apps/frontend/src/services/api.ts`, update `createInternalAuthHeaders` or `req` so requests include:

```txt
Authorization: Bearer <internal session token>
X-Clerk-Token: <current Clerk token>
```

Because Clerk `getToken()` is async, make `req` call `await readClerkToken()`.

Pseudo-target:

```ts
const clerkToken = await readClerkToken();
if (clerkToken) {
  headers.set('X-Clerk-Token', clerkToken);
}
```

Keep existing internal session `Authorization` behavior.

- [ ] **Step 5: Register token getter in App**

In `apps/frontend/src/App.tsx`, use Clerk:

```tsx
import { SignedIn, SignedOut, SignIn, useAuth, useUser } from '@clerk/clerk-react';
import { setClerkTokenGetter } from './auth/clerkToken';
```

Inside the internal app component, register:

```tsx
const { getToken, isLoaded, isSignedIn } = useAuth();
useEffect(() => {
  setClerkTokenGetter(() => getToken());
  return () => setClerkTokenGetter(null);
}, [getToken]);
```

Render Clerk sign-in while signed out instead of the old `LoginPage`.

- [ ] **Step 6: Run frontend tests/build**

Run:

```bash
npm --workspace apps/frontend test
npm --workspace apps/frontend run build
```

Expected: PASS.

## Task 5: Frontend Account Bootstrap

**Files:**

- Create: `apps/frontend/src/auth/accountAccess.ts`
- Modify: `apps/frontend/src/services/api.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/auth/session.ts`

- [ ] **Step 1: Add account access types/store**

Create `apps/frontend/src/auth/accountAccess.ts`:

```ts
export type ProductKey = 'orquestrador' | 'financeiro' | 'operis' | 'media' | 'ads' | 'commerce';

export type AccountProduct = {
  product_key: ProductKey | string;
  name: string;
  description: string | null;
  app_url: string;
  marketing_url: string | null;
  status: string;
  plan?: string;
  allowed: boolean;
  reason: string;
};

export type AccountBootstrapResponse = {
  token: string;
  expires_at: string;
  user: import('./session').InternalSessionUser;
  account: {
    customer: { id: string; email: string; name: string | null } | null;
    products: AccountProduct[];
  };
};

const ACCOUNT_PRODUCTS_STORAGE_KEY = 'prymeira_account_products_v1';

export const accountProductStore = {
  read(): AccountProduct[] {
    const raw = window.localStorage.getItem(ACCOUNT_PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as AccountProduct[] : [];
    } catch {
      return [];
    }
  },
  save(products: AccountProduct[]) {
    window.localStorage.setItem(ACCOUNT_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  },
  clear() {
    window.localStorage.removeItem(ACCOUNT_PRODUCTS_STORAGE_KEY);
  }
};
```

- [ ] **Step 2: Add API bootstrap function**

In `apps/frontend/src/services/api.ts`, add:

```ts
accountBootstrap: (payload: { clerk_user_id: string; email: string; name?: string }) =>
  req<AccountBootstrapResponse>('/auth/account/bootstrap', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
```

Import the type.

- [ ] **Step 3: Bootstrap after Clerk sign-in**

In `App.tsx`, when Clerk is signed in and no internal session exists:

1. Get Clerk token.
2. Read Clerk user id/email/name.
3. Call `api.accountBootstrap`.
4. Save returned internal session to `internalSessionStore`.
5. Save returned products to `accountProductStore`.
6. Navigate to `/app`.

Keep old internal `LoginPage` behind an env fallback if desired:

```txt
VITE_ENABLE_LEGACY_INTERNAL_LOGIN=true
```

Default should be Clerk flow.

- [ ] **Step 4: Clear account products on logout**

In `handleLogout`, also call:

```ts
accountProductStore.clear();
```

- [ ] **Step 5: Test bootstrap state helpers**

Add tests for `accountProductStore` read/save/clear and API header behavior if existing service tests make that straightforward.

- [ ] **Step 6: Run frontend tests/build**

Run:

```bash
npm --workspace apps/frontend test
npm --workspace apps/frontend run build
```

Expected: PASS.

## Task 6: Product-Aware Hub And Route Guards

**Files:**

- Modify: `apps/frontend/src/core/modules.ts`
- Modify: `apps/frontend/src/core/ModuleHubPage.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/pages/NoProductAccessPage.tsx`
- Test: existing frontend route tests or new focused tests.

- [ ] **Step 1: Add product keys to module registry**

In `apps/frontend/src/core/modules.ts`, update `PlatformModule`:

```ts
productKey: 'orquestrador' | 'financeiro';
```

Set:

```ts
technical.productKey = 'orquestrador'
finance.productKey = 'financeiro'
```

- [ ] **Step 2: Add product access helpers**

Add:

```ts
export function canAccessModuleProduct(products: AccountProduct[], module: PlatformModule): boolean {
  return products.some((product) => product.product_key === module.productKey && product.allowed);
}
```

Use this alongside existing internal permissions.

- [ ] **Step 3: Adapt hub cards**

In `ModuleHubPage`, read account products from props:

```tsx
type ModuleHubPageProps = {
  user: InternalSessionUser;
  accountProducts: AccountProduct[];
  onLogout: () => void;
};
```

A card is active only if:

```txt
internal permissions allow module
and
Account API product is allowed
```

Locked card label should distinguish:

```txt
Sem permissão interna
Sem acesso ao produto
Em breve
```

- [ ] **Step 4: Add no-access page**

Create `apps/frontend/src/pages/NoProductAccessPage.tsx`:

```tsx
import { Link } from 'react-router-dom';

export function NoProductAccessPage({ productName }: { productName: string }) {
  return (
    <main className="no-access-page">
      <h1>Acesso indisponível</h1>
      <p>Seu usuário ainda não tem acesso ativo a {productName}.</p>
      <Link to="/app">Voltar aos módulos</Link>
    </main>
  );
}
```

Style with existing CSS conventions.

- [ ] **Step 5: Guard module routes**

In `App.tsx`, before rendering finance/technical routes:

```ts
if (isFinanceRoute && !hasAccountProduct('financeiro')) {
  return <NoProductAccessPage productName="Financeiro" />;
}
if (isTechnicalRoute && !hasAccountProduct('orquestrador')) {
  return <NoProductAccessPage productName="Gestão Técnica" />;
}
```

Keep existing internal `ProtectedRoute` inside modules.

- [ ] **Step 6: Run frontend tests/build**

Run:

```bash
npm --workspace apps/frontend test
npm --workspace apps/frontend run build
```

Expected: PASS.

## Task 7: Local End-To-End Test Script

**Files:**

- Modify: `README.md`
- Optional: add `.env.example` if not present in this repo.

- [ ] **Step 1: Document local env**

Add to README:

```txt
Prymeira Account API:
  http://localhost:3001

Backend:
  PORT=4000
  PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001
  PRYMEIRA_PRODUCT_TECHNICAL=orquestrador
  PRYMEIRA_PRODUCT_FINANCE=financeiro
  PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS=<your email>

Frontend:
  VITE_CLERK_PUBLISHABLE_KEY=
  VITE_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 2: Document run order**

Add:

```bash
# Terminal 1
cd "/Users/yohannreimer/Documents/Prymeira Account"
npx pnpm@9.15.4 dev

# Terminal 2
cd "/Users/yohannreimer/Documents/Plataforma Modular"
npm run dev:backend

# Terminal 3
cd "/Users/yohannreimer/Documents/Plataforma Modular"
npm run dev:frontend
```

- [ ] **Step 3: Document manual test path**

Add:

```txt
1. Log in with Clerk.
2. Confirm backend creates/loads internal session.
3. Confirm hub shows Financeiro/Técnico locked without entitlements.
4. In Prymeira Account admin endpoint, grant orquestrador.
5. Reload hub and confirm Técnico unlocks.
6. Grant financeiro.
7. Reload hub and confirm Financeiro unlocks.
8. Remove/block entitlement and confirm backend API denies access.
```

- [ ] **Step 4: Run full app checks**

Run:

```bash
npm --workspace apps/backend test
npm --workspace apps/backend run build
npm --workspace apps/frontend test
npm --workspace apps/frontend run build
npm run build
```

Expected: PASS.

## Task 8: Local Smoke Test

**Files:**

- No code unless smoke test reveals defects.

- [ ] **Step 1: Start Account API**

In `/Users/yohannreimer/Documents/Prymeira Account`, with PostgreSQL running:

```bash
npx pnpm@9.15.4 prisma:migrate
npx pnpm@9.15.4 prisma:seed
npx pnpm@9.15.4 dev
```

- [ ] **Step 2: Start Plataforma Modular**

In `/Users/yohannreimer/Documents/Plataforma Modular`:

```bash
npm run dev:backend
npm run dev:frontend
```

- [ ] **Step 3: Verify browser flow**

Open Vite localhost URL and test:

- Clerk login appears.
- Login succeeds.
- Hub appears.
- Product locks reflect Account API entitlements.
- Técnico/Financeiro routes respect product access.
- Backend finance/technical API requests deny when product access is missing.

Use the Browser tool for this step if running inside Codex with the app available.

## Open Questions Before Implementation

Before executing this plan, confirm:

1. Should we initialize Git in `Plataforma Modular` before changing code?
2. What Clerk application should be used for local testing, and what is the local `VITE_CLERK_PUBLISHABLE_KEY`?
3. Which email should be allowlisted as `PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS` for the first local `supremo` user?
4. Is keeping legacy username/password behind a dev fallback acceptable for now?

## Verification Summary Required At End

The implementation is not complete until these pass:

```bash
npm --workspace apps/backend test
npm --workspace apps/backend run build
npm --workspace apps/frontend test
npm --workspace apps/frontend run build
npm run build
```

And manual local smoke testing should state clearly whether it passed or which external dependency blocked it.
