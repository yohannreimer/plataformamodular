# Plataforma Modular + Prymeira Account Integration Design

Date: 2026-05-16

## 1. Goal

Integrate the existing Plataforma Modular app with Prymeira Account while preserving the current app structure and using the existing module hub as the first practical version of the Prymeira modular hub.

The app currently contains two internal modules:

- Technical module at `/m/tecnico`
- Finance module at `/m/financeiro`

For the Account API, these become two products:

- `/m/tecnico` maps to `product_key: "orquestrador"`
- `/m/financeiro` maps to `product_key: "financeiro"`

The first integration should prove the central identity/access model locally before extracting or rebuilding a standalone hub.

## 2. Current App Shape

The project is a Node workspace with:

- `apps/frontend`: Vite + React frontend.
- `apps/backend`: Express backend with SQLite local data.
- Existing hub: `apps/frontend/src/core/ModuleHubPage.tsx`.
- Existing module registry: `apps/frontend/src/core/modules.ts`.
- Existing frontend auth/session: `apps/frontend/src/auth/session.ts`.
- Existing backend auth/session: `apps/backend/src/internalAuth.ts`.

The current login is internal username/password with local sessions. It is not Clerk-based yet.

The current internal permission system should not be removed immediately. It controls sub-feature access inside each module, such as finance approvals, reconciliation, admin, licenses, calendar, and technical operations.

## 3. Recommended Architecture

Use a hybrid authorization model:

```txt
Clerk authenticates the person.
Prymeira Account authorizes product access.
Plataforma Modular keeps internal permissions for sub-features.
```

That means:

- Prymeira Account decides whether a user can enter `orquestrador` or `financeiro`.
- Plataforma Modular decides what the user can do inside that module.

This avoids a risky rewrite of all local permissions while still moving product access to the central account layer.

## 4. Product Mapping

Initial module-to-product mapping:

```txt
technical module
  route: /m/tecnico
  product_key: orquestrador

finance module
  route: /m/financeiro
  product_key: financeiro
```

The hub should eventually show other Prymeira products:

```txt
operis
orquestrador
financeiro
media
ads
commerce
```

In the first implementation, only the two existing modules need to be wired as real local destinations.

## 5. Hub Strategy

Do not extract the hub into the Prymeira Account repo yet.

First, adapt the existing hub in Plataforma Modular so it can consume Account API product access data. Once the flow works locally and the design is validated, the hub can be extracted into `Prymeira Account/apps/hub-web` or deployed as `hub.primeiradigital.com.br` / `app.primeiradigital.com.br`.

The existing hub should evolve from permission-only logic to product-aware logic:

- Active product: clickable card.
- Locked product: disabled card with locked status or upgrade link.
- Future products: visible but unavailable.
- Admin entry: visible only to internal/admin users later.

## 6. Frontend Auth Flow

The current `LoginPage` should be replaced or wrapped with Clerk.

Initial frontend flow:

1. User opens Plataforma Modular.
2. If not authenticated with Clerk, show Clerk login.
3. After login, call Account API `/customers/sync`.
4. Call Account API `/me/products`.
5. Render the hub with product access state.
6. If the user enters `/m/tecnico`, require access to `orquestrador`.
7. If the user enters `/m/financeiro`, require access to `financeiro`.

The existing internal session model can be bridged temporarily if needed, but the target state is that the frontend session source is Clerk plus Account API product decisions.

## 7. Backend Protection

Backend routes must be protected by product access too. Hiding hub cards is not enough.

Recommended backend middleware:

- Verify Clerk token from `Authorization: Bearer <clerk_token>`.
- Call Prymeira Account `/access-check`.
- Allow or deny by product key.

Route protection:

```txt
/finance/* or finance route handlers
  require product_key financeiro

/planning, /calendar, /cohorts, /clients, /technicians, /implementation, /licenses, /docs
  require product_key orquestrador
```

Internal feature permissions can remain after product access is confirmed.

## 8. Local Dev Setup

Local testing should run:

```txt
Prymeira Account API
  localhost:3001

Plataforma Modular backend
  localhost:4000

Plataforma Modular frontend
  Vite dev server
```

Environment variables likely needed in Plataforma Modular:

```txt
VITE_CLERK_PUBLISHABLE_KEY=
VITE_PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001
VITE_PRYMEIRA_PRODUCT_TECHNICAL=orquestrador
VITE_PRYMEIRA_PRODUCT_FINANCE=financeiro

CLERK_SECRET_KEY=
PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001
PRYMEIRA_PRODUCT_TECHNICAL=orquestrador
PRYMEIRA_PRODUCT_FINANCE=financeiro
```

Exact names can be adjusted during implementation to match the app's existing env style.

## 9. Implementation Scope

### Included

- Add Clerk authentication to the frontend.
- Add customer sync after login.
- Add Account API product access loading.
- Adapt `ModuleHubPage` to show Account API product states.
- Map existing modules to `orquestrador` and `financeiro`.
- Add frontend route guards for module entry.
- Add backend product-access middleware.
- Protect finance backend routes with `financeiro`.
- Protect technical backend routes with `orquestrador`.
- Keep existing internal permission system for sub-feature access.
- Run everything locally against Prymeira Account API.

### Excluded

- Extracting hub into `Prymeira Account/apps/hub-web`.
- Fully desmembrar finance and technical modules into separate apps.
- Removing all internal auth/permission code in one pass.
- Payment gateway integration.
- Admin visual UI inside the hub.
- Production domain/deploy configuration.

## 10. Open Design Decisions For Implementation Plan

The implementation plan should decide these details after a closer code pass:

- Whether to keep the old username/password login as a temporary fallback.
- Whether to create a backend bridge session from Clerk or remove local internal sessions from the main app flow.
- How to map Clerk users to existing internal roles/permissions.
- Whether the first local test user should become `supremo` automatically based on allowlisted email.
- Whether backend product access checks should call Account API on every request or use a short-lived in-memory cache.

## 11. Acceptance Criteria

The integration is acceptable when:

- User can log in locally using Clerk.
- User is synced into Prymeira Account as a customer.
- Hub loads product states from Prymeira Account.
- `orquestrador` entitlement unlocks the technical module.
- Missing `orquestrador` entitlement blocks the technical module.
- `financeiro` entitlement unlocks the finance module.
- Missing `financeiro` entitlement blocks the finance module.
- Backend finance APIs deny access without `financeiro`.
- Backend technical APIs deny access without `orquestrador`.
- Existing internal permissions still control sub-feature visibility/behavior.
- Local dev can run with Account API + Plataforma Modular backend + Plataforma Modular frontend.

## 12. Future Extraction

After this works locally, the hub can be extracted into a standalone app:

```txt
Prymeira Account/apps/hub-web
```

That future hub can reuse the visual language and behavior of the current `ModuleHubPage`, but consume the Account API directly and show every Prymeira product.
