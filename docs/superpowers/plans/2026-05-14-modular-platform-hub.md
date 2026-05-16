# Modular Platform Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the copied product into a modular platform shell where users land on a module hub and open Financeiro or Gestao Tecnica as separate module spaces.

**Architecture:** Keep the current code in place, but introduce a frontend module registry that owns module metadata, access checks, default paths, and nav items. `App.tsx` becomes a shell that routes `/app` to the hub, `/m/financeiro/*` to the financial module, and `/m/tecnico/*` to the technical module, with activation based on existing user permissions for this first pass.

**Tech Stack:** React 18, React Router 6, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Module Registry

**Files:**
- Create: `apps/frontend/src/core/modules.ts`
- Test: `apps/frontend/src/core/modules.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests that prove:
- a supremo user with finance permissions sees both modules
- a technical-only user sees only Gestao Tecnica
- finance redirects to `/m/financeiro/overview`
- technical redirects to `/m/tecnico/calendario`

- [ ] **Step 2: Run focused test**

Run: `npm --workspace apps/frontend test -- src/core/modules.test.ts`

Expected: fail because `src/core/modules.ts` does not exist yet.

- [ ] **Step 3: Implement registry**

Create a `PlatformModule` type, `PLATFORM_MODULES`, `visibleModulesForUser`, `defaultModulePathForUser`, and `moduleById`.

- [ ] **Step 4: Run focused test**

Run: `npm --workspace apps/frontend test -- src/core/modules.test.ts`

Expected: pass.

### Task 2: Module Hub And Routing

**Files:**
- Create: `apps/frontend/src/core/ModuleHubPage.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/auth/navigation.ts`
- Test: `apps/frontend/src/core/ModuleHubPage.test.tsx`

- [ ] **Step 1: Write failing hub test**

Render the hub with both modules and verify the cards link to `/m/financeiro` and `/m/tecnico`.

- [ ] **Step 2: Run focused test**

Run: `npm --workspace apps/frontend test -- src/core/ModuleHubPage.test.tsx`

Expected: fail because the hub page does not exist.

- [ ] **Step 3: Implement hub and routes**

Add `/app` for module selection, `/m/financeiro/*` for Financeiro, `/m/tecnico/*` for Gestao Tecnica, and redirect login/session startup to `/app`.

- [ ] **Step 4: Run focused test**

Run: `npm --workspace apps/frontend test -- src/core/ModuleHubPage.test.tsx`

Expected: pass.

### Task 3: Styling And Verification

**Files:**
- Modify: `apps/frontend/src/styles.css`
- Modify: `apps/frontend/src/components/Layout.tsx`

- [ ] **Step 1: Add hub styling**

Create a restrained software-suite hub with clear module cards, account context, and no nested cards.

- [ ] **Step 2: Run tests**

Run: `npm --workspace apps/frontend test -- src/core/modules.test.ts src/core/ModuleHubPage.test.tsx src/auth/navigation.test.ts`

Expected: pass.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: backend and frontend build successfully.
