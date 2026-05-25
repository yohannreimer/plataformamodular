# OFX Inline Smart Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let reviewers turn noisy OFX descriptions into clean, categorized, learned financial records during batch approval.

**Architecture:** Extend the OFX approval contract to accept typed names for entity, category, and cost center. The backend resolves existing records or creates new ones inside the approval transaction, then saves a fuzzy reconciliation memory that can match nearby descriptions such as `PISTA 3` and `PISTA 4`.

**Tech Stack:** Express, Zod, SQLite/better-sqlite3, React, Vite, Testing Library, Node test runner.

---

### Task 1: Backend Contract And Memory

**Files:**
- Modify: `apps/backend/src/finance/types.ts`
- Modify: `apps/backend/src/finance/routes.ts`
- Modify: `apps/backend/src/finance/service.ts`
- Modify: `apps/backend/src/finance/reconciliationDraft.ts`
- Test: `apps/backend/src/finance/reconciliationDraft.test.ts`
- Test: `apps/backend/src/finance/finance.test.ts`

- [ ] Add failing tests for useful single-token memories and OFX approval creating entity/category/cost center from inline names.
- [ ] Extend `FinanceOfxApprovalItemInput` and route schema with optional `financial_entity_name`, `financial_category_name`, and `financial_cost_center_name`.
- [ ] Resolve typed names during approval: existing exact match first, create new record second.
- [ ] Save new memory with enough confidence for future ready suggestions.
- [ ] Allow useful single-token memory patterns such as `pista` while keeping generic tokens blocked.

### Task 2: Frontend Review Modal

**Files:**
- Modify: `apps/frontend/src/finance/api.ts`
- Modify: `apps/frontend/src/finance/components/FinanceOfxImportModal.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinanceOfxImportModal.test.tsx`

- [ ] Add failing tests for typed entity/category/cost center names going into approval payload.
- [ ] Replace rigid selects with editable combobox-style fields backed by datalists.
- [ ] Add an explicit reference-name field and entry/exit signal.
- [ ] Keep payment method as a select.
- [ ] Send IDs when the typed name matches an existing option, otherwise send the typed name for backend creation.

### Task 3: Verification And Commit

- [ ] Run focused backend tests:
  `npx tsx --test apps/backend/src/finance/reconciliationDraft.test.ts apps/backend/src/finance/finance.test.ts`
- [ ] Run focused frontend tests:
  `npm --workspace apps/frontend test -- src/finance/__tests__/FinanceOfxImportModal.test.tsx src/finance/__tests__/FinanceReconciliationPage.test.tsx src/finance/__tests__/financeApi.test.ts`
- [ ] Run `npm run build`.
- [ ] Commit and push only files related to OFX smart review.
