# Financeiro Mobile B+ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `/financeiro/*` web app fully usable on mobile with a hybrid mobile shell, reusable mobile interaction patterns, and a mobile-first experience for dense finance workflows.

**Architecture:** Keep the existing routes and desktop UX, add a responsive finance shell for mobile, then introduce shared mobile components for bottom navigation, sheets, list cards, and compact filters. For critical pages, extract controller hooks so desktop and mobile views share data loading, filters, permissions, mutations, and error states while rendering different layouts.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, Testing Library, lucide-react, existing finance API services and CSS modules under `apps/frontend/src/finance`.

---

## File Structure

### New Files

- `apps/frontend/src/finance/components/FinanceMobileNavigation.tsx`
  - Mobile header, bottom nav, and "Mais" menu.
  - Consumes the same finance navigation metadata used by the desktop sidebar.

- `apps/frontend/src/finance/components/FinanceBottomSheet.tsx`
  - Accessible bottom sheet for details, filters, forms, and action menus.
  - Owns dialog markup, overlay close behavior, escape key close behavior, and unsaved-close confirmation hook.

- `apps/frontend/src/finance/components/FinanceMobileList.tsx`
  - Reusable mobile list/card primitives for dense financial records.
  - Provides consistent value/status/date/context layout.

- `apps/frontend/src/finance/components/FinanceMobileFilterSheet.tsx`
  - Reusable button plus sheet wrapper for compact filters.
  - Keeps filter controls supplied by each page.

- `apps/frontend/src/finance/hooks/useFinanceTransactionsController.ts`
  - Extracted data, filters, selection, form state, mutations, permissions, totals, and messages from `FinanceTransactionsPage`.

- `apps/frontend/src/finance/components/FinanceTransactionsDesktopView.tsx`
  - Desktop presentation for the transaction ledger.
  - Uses the controller and preserves current desktop behavior.

- `apps/frontend/src/finance/components/FinanceTransactionsMobileView.tsx`
  - Mobile presentation for the transaction ledger.
  - Uses mobile list cards and bottom sheets for filters, details, create, and edit.

- `apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx`
- `apps/frontend/src/finance/__tests__/FinanceBottomSheet.test.tsx`
- `apps/frontend/src/finance/__tests__/FinanceMobileList.test.tsx`
- `apps/frontend/src/finance/__tests__/useFinanceTransactionsController.test.tsx`

### Modified Files

- `apps/frontend/src/finance/FinanceWorkspace.tsx`
  - Render mobile navigation alongside the desktop sidebar.
  - Keep `FinanceWhisperFlow` and `FinanceFloatingQuickLauncher` gated by write permissions.

- `apps/frontend/src/finance/components/FinanceSidebar.tsx`
  - Export shared finance navigation metadata and icon rendering.
  - Preserve existing desktop sidebar markup and behavior.

- `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`
  - Replace mixed logic/UI page with controller plus desktop/mobile views.

- `apps/frontend/src/finance/pages/FinanceOverviewPage.tsx`
  - Add mobile-friendly class hooks and reduce header/KPI/chart overflow where needed.

- `apps/frontend/src/finance/pages/FinanceReceivablesPage.tsx`
  - Add mobile class hooks and use shared mobile dense-list pattern where title rows are rendered.

- `apps/frontend/src/finance/pages/FinancePayablesPage.tsx`
  - Add mobile class hooks and use shared mobile dense-list pattern where title rows are rendered.

- `apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx`
  - Add mobile class hooks for queue cards, filters, and OFX modal behavior.

- `apps/frontend/src/finance/pages/FinanceCashflowPage.tsx`
  - Stabilize chart, summary, and horizon controls on mobile.

- `apps/frontend/src/finance/pages/FinanceReportsPage.tsx`
  - Make report selectors, summaries, and tables usable on mobile.

- `apps/frontend/src/finance/pages/FinanceCadastrosPage.tsx`
  - Make tabs, forms, and lists usable on mobile.

- `apps/frontend/src/finance/pages/FinanceSimulationPage.tsx`
  - Add mobile overflow protection and stacked controls.

- `apps/frontend/src/finance/pages/FinanceAdvancedPage.tsx`
  - Add mobile overflow protection and stacked controls.

- `apps/frontend/src/finance/finance-shell.css`
  - Shell-level responsive rules for mobile header, bottom nav, more menu, safe-area padding, and desktop sidebar hiding.

- `apps/frontend/src/finance/finance-pages.css`
  - Page-level responsive rules for finance pages, mobile lists, bottom sheets, compact filters, and overflow control.

---

## Task 1: Share Finance Navigation Metadata

**Files:**
- Modify: `apps/frontend/src/finance/components/FinanceSidebar.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx`

- [ ] **Step 1: Write the failing navigation metadata test**

Create `apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx` with this initial test:

```tsx
import { expect, test } from 'vitest';
import { financeNavigationItems } from '../components/FinanceSidebar';

test('finance navigation metadata exposes all ERP routes for desktop and mobile shells', () => {
  expect(financeNavigationItems.map((item) => item.to)).toEqual([
    'overview',
    'transactions',
    'receivables',
    'payables',
    'reconciliation',
    'cashflow',
    'reports',
    'cadastros',
    'simulation',
    'advanced'
  ]);
  expect(financeNavigationItems.map((item) => item.label)).toContain('Movimentações');
  expect(financeNavigationItems.map((item) => item.label)).toContain('Conciliação & Revisão');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileNavigation.test.tsx
```

Expected: FAIL because `financeNavigationItems` is not exported.

- [ ] **Step 3: Export navigation metadata and icon helper**

Modify `apps/frontend/src/finance/components/FinanceSidebar.tsx`:

```tsx
export const financeNavigationItems = [
  { to: 'overview', label: 'Visão Geral', icon: 'overview' },
  { to: 'transactions', label: 'Movimentações', icon: 'transactions' },
  { to: 'receivables', label: 'Contas a Receber', icon: 'receivables' },
  { to: 'payables', label: 'Contas a Pagar', icon: 'payables' },
  { to: 'reconciliation', label: 'Conciliação & Revisão', icon: 'reconciliation' },
  { to: 'cashflow', label: 'Fluxo de Caixa', icon: 'cashflow' },
  { to: 'reports', label: 'Relatórios', icon: 'reports' },
  { to: 'cadastros', label: 'Cadastros', icon: 'cadastros' },
  { to: 'simulation', label: 'Simulação', icon: 'simulation' },
  { to: 'advanced', label: 'Avançado', icon: 'advanced' }
] as const;

export type FinanceNavigationItem = (typeof financeNavigationItems)[number];
```

Rename the internal `navigationItems` usages to `financeNavigationItems`.

Change `NavigationGlyph` to an exported function:

```tsx
export function FinanceNavigationGlyph({ name }: { name: string }) {
  const Icon = FINANCE_ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
}
```

Update the sidebar call site:

```tsx
<FinanceNavigationGlyph name={item.icon} />
```

- [ ] **Step 4: Run the navigation metadata test**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileNavigation.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceSidebar.tsx apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx
git commit -m "feat: share finance navigation metadata"
```

---

## Task 2: Add Mobile Finance Navigation Shell

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceMobileNavigation.tsx`
- Modify: `apps/frontend/src/finance/FinanceWorkspace.tsx`
- Modify: `apps/frontend/src/finance/finance-shell.css`
- Test: `apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx`

- [ ] **Step 1: Extend the mobile navigation test**

Append these tests to `apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx`:

```tsx
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FinanceMobileNavigation } from '../components/FinanceMobileNavigation';

test('mobile finance navigation renders primary bottom links and current route label', () => {
  render(
    <MemoryRouter initialEntries={['/financeiro/transactions']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={undefined} />
    </MemoryRouter>
  );

  expect(screen.getByRole('banner', { name: 'Cabeçalho financeiro mobile' })).toHaveTextContent('Movimentações');
  const bottomNav = screen.getByRole('navigation', { name: 'Atalhos financeiros mobile' });
  expect(within(bottomNav).getByRole('link', { name: /visão geral/i })).toHaveAttribute('href', '/financeiro/overview');
  expect(within(bottomNav).getByRole('link', { name: /movimentações/i })).toHaveAttribute('href', '/financeiro/transactions');
  expect(within(bottomNav).getByRole('link', { name: /receber/i })).toHaveAttribute('href', '/financeiro/receivables');
  expect(within(bottomNav).getByRole('link', { name: /pagar/i })).toHaveAttribute('href', '/financeiro/payables');
  expect(within(bottomNav).getByRole('button', { name: /mais áreas/i })).toBeInTheDocument();
});

test('mobile finance navigation opens the full ERP menu with hub and logout actions', () => {
  const onLogout = vi.fn();
  render(
    <MemoryRouter initialEntries={['/financeiro/overview']}>
      <FinanceMobileNavigation userLabel="Financeiro" onLogout={onLogout} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /mais áreas/i }));

  const menu = screen.getByRole('dialog', { name: 'Mais áreas do financeiro' });
  expect(within(menu).getByRole('link', { name: /conciliação/i })).toHaveAttribute('href', '/financeiro/reconciliation');
  expect(within(menu).getByRole('link', { name: /fluxo de caixa/i })).toHaveAttribute('href', '/financeiro/cashflow');
  expect(within(menu).getByRole('link', { name: /relatórios/i })).toHaveAttribute('href', '/financeiro/reports');
  expect(within(menu).getByRole('link', { name: /cadastros/i })).toHaveAttribute('href', '/financeiro/cadastros');
  expect(within(menu).getByRole('link', { name: /simulação/i })).toHaveAttribute('href', '/financeiro/simulation');
  expect(within(menu).getByRole('link', { name: /avançado/i })).toHaveAttribute('href', '/financeiro/advanced');

  fireEvent.click(within(menu).getByRole('button', { name: 'Sair' }));
  expect(onLogout).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileNavigation.test.tsx
```

Expected: FAIL because `FinanceMobileNavigation` does not exist.

- [ ] **Step 3: Create `FinanceMobileNavigation.tsx`**

Create `apps/frontend/src/finance/components/FinanceMobileNavigation.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PRYMEIRA_HUB_URL } from '../../config/urls';
import prymeiraLogo from '../../assets/prymeira-logo.png';
import { FinanceNavigationGlyph, financeNavigationItems } from './FinanceSidebar';

type FinanceMobileNavigationProps = {
  userLabel: string;
  onLogout?: () => void;
};

const bottomItems = [
  { to: 'overview', label: 'Visão Geral' },
  { to: 'transactions', label: 'Movimentações' },
  { to: 'receivables', label: 'Receber' },
  { to: 'payables', label: 'Pagar' }
] as const;

function itemHref(to: string) {
  return `/financeiro/${to}`;
}

export function FinanceMobileNavigation({ userLabel, onLogout }: FinanceMobileNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const activeItem = useMemo(() => {
    const active = financeNavigationItems.find((item) => location.pathname.endsWith(`/financeiro/${item.to}`));
    return active ?? financeNavigationItems[0];
  }, [location.pathname]);

  const overflowItems = financeNavigationItems.filter((item) => !bottomItems.some((bottomItem) => bottomItem.to === item.to));

  return (
    <>
      <header className="finance-mobile-header" aria-label="Cabeçalho financeiro mobile">
        <Link to="/financeiro/overview" className="finance-mobile-header__brand" aria-label="Ir para visão geral financeira">
          <img src={prymeiraLogo} alt="Prymeira" />
          <span>
            <strong>ERP Financeiro</strong>
            <small>{activeItem.label}</small>
          </span>
        </Link>
        <button
          type="button"
          className="finance-mobile-header__menu"
          aria-label={menuOpen ? 'Fechar áreas financeiras' : 'Mais áreas'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </header>

      <nav className="finance-mobile-bottom-nav" aria-label="Atalhos financeiros mobile">
        {bottomItems.map((item) => {
          const navItem = financeNavigationItems.find((entry) => entry.to === item.to);
          return (
            <NavLink key={item.to} to={itemHref(item.to)} className={({ isActive }) => `finance-mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`.trim()}>
              {navItem ? <FinanceNavigationGlyph name={navItem.icon} /> : null}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button type="button" className={`finance-mobile-bottom-nav__item ${menuOpen ? 'is-active' : ''}`.trim()} aria-label="Mais áreas" onClick={() => setMenuOpen(true)}>
          <Menu size={17} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {menuOpen ? (
        <div className="finance-mobile-more" role="dialog" aria-modal="true" aria-label="Mais áreas do financeiro">
          <button type="button" className="finance-mobile-more__scrim" aria-label="Fechar áreas financeiras" onClick={() => setMenuOpen(false)} />
          <section className="finance-mobile-more__panel">
            <header className="finance-mobile-more__header">
              <div>
                <small>Usuário</small>
                <strong>{userLabel}</strong>
              </div>
              <button type="button" aria-label="Fechar áreas financeiras" onClick={() => setMenuOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="finance-mobile-more__links">
              {overflowItems.map((item) => (
                <NavLink key={item.to} to={itemHref(item.to)} className="finance-mobile-more__link" onClick={() => setMenuOpen(false)}>
                  <FinanceNavigationGlyph name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            <footer className="finance-mobile-more__footer">
              <a href={PRYMEIRA_HUB_URL}>Voltar ao Hub</a>
              {onLogout ? <button type="button" onClick={onLogout}>Sair</button> : null}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: Render mobile navigation from `FinanceWorkspace`**

Modify `apps/frontend/src/finance/FinanceWorkspace.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { hasAnyPermission, internalSessionStore } from '../auth/session';
import { FinanceFloatingQuickLauncher } from './components/FinanceFloatingQuickLauncher';
import { FinanceMobileNavigation } from './components/FinanceMobileNavigation';
import { FinanceWhisperFlow } from './components/FinanceWhisperFlow';
import { FinanceSidebar } from './components/FinanceSidebar';
import { useFinanceContext } from './hooks/useFinanceContext';
import './finance.css';

export function FinanceWorkspace({ onLogout }: { onLogout?: () => void }) {
  const { context } = useFinanceContext();
  const session = internalSessionStore.read();
  const canWrite = hasAnyPermission(session?.user, ['finance.write']);
  const userLabel = session?.user.display_name || session?.user.username || 'usuário';

  return (
    <div className="finance-shell">
      <FinanceMobileNavigation userLabel={userLabel} onLogout={onLogout} />
      <FinanceSidebar context={context} onLogout={onLogout} />
      <main className="finance-workspace__main">
        <Outlet />
      </main>
      {canWrite ? <FinanceWhisperFlow /> : null}
      {canWrite ? <FinanceFloatingQuickLauncher /> : null}
    </div>
  );
}
```

- [ ] **Step 5: Add shell CSS for mobile navigation**

Append to `apps/frontend/src/finance/finance-shell.css`:

```css
.finance-mobile-header,
.finance-mobile-bottom-nav,
.finance-mobile-more {
  display: none;
}

@media (max-width: 760px) {
  .finance-shell {
    display: block;
    min-height: 100dvh;
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }

  .finance-sidebar {
    display: none;
  }

  .finance-workspace__main {
    padding: 16px 12px 24px !important;
    overflow: visible;
  }

  .finance-mobile-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 58px;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid #e2e8f0;
    backdrop-filter: blur(14px);
  }

  .finance-mobile-header__brand {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    gap: 9px;
    color: #0f172a;
    text-decoration: none;
  }

  .finance-mobile-header__brand img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }

  .finance-mobile-header__brand span {
    display: grid;
    min-width: 0;
    gap: 1px;
  }

  .finance-mobile-header__brand strong,
  .finance-mobile-header__brand small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .finance-mobile-header__brand strong {
    font-size: 13px;
    line-height: 1.15;
  }

  .finance-mobile-header__brand small {
    color: #64748b;
    font-size: 11px;
  }

  .finance-mobile-header__menu,
  .finance-mobile-more__header button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: 1px solid #dbe5f0;
    border-radius: 10px;
    background: #ffffff;
    color: #0f172a;
  }

  .finance-mobile-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 45;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
    padding: 7px 8px calc(7px + env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.98);
    border-top: 1px solid #dbe5f0;
    box-shadow: 0 -12px 30px rgba(15, 23, 42, 0.08);
  }

  .finance-mobile-bottom-nav__item {
    display: grid;
    justify-items: center;
    align-content: center;
    min-width: 0;
    min-height: 48px;
    gap: 3px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #64748b;
    text-decoration: none;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.1;
  }

  .finance-mobile-bottom-nav__item.is-active {
    background: #eef2f7;
    color: #0f172a;
  }

  .finance-mobile-more {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: block;
  }

  .finance-mobile-more__scrim {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(15, 23, 42, 0.34);
  }

  .finance-mobile-more__panel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    gap: 14px;
    max-height: min(82dvh, 620px);
    overflow-y: auto;
    padding: 16px 14px calc(18px + env(safe-area-inset-bottom, 0px));
    border-radius: 20px 20px 0 0;
    background: #ffffff;
    box-shadow: 0 -18px 48px rgba(15, 23, 42, 0.2);
  }

  .finance-mobile-more__header,
  .finance-mobile-more__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .finance-mobile-more__header small {
    display: block;
    color: #64748b;
    font-size: 11px;
  }

  .finance-mobile-more__links {
    display: grid;
    gap: 6px;
  }

  .finance-mobile-more__link {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 46px;
    padding: 0 12px;
    border-radius: 12px;
    background: #f8fafc;
    color: #0f172a;
    text-decoration: none;
    font-size: 14px;
    font-weight: 650;
  }

  .finance-mobile-more__footer a,
  .finance-mobile-more__footer button {
    border: 0;
    background: transparent;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }
}
```

- [ ] **Step 6: Run the mobile navigation tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileNavigation.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceMobileNavigation.tsx apps/frontend/src/finance/FinanceWorkspace.tsx apps/frontend/src/finance/finance-shell.css apps/frontend/src/finance/__tests__/FinanceMobileNavigation.test.tsx
git commit -m "feat: add finance mobile navigation"
```

---

## Task 3: Add Reusable Bottom Sheet

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceBottomSheet.tsx`
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Test: `apps/frontend/src/finance/__tests__/FinanceBottomSheet.test.tsx`

- [ ] **Step 1: Write bottom sheet tests**

Create `apps/frontend/src/finance/__tests__/FinanceBottomSheet.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FinanceBottomSheet } from '../components/FinanceBottomSheet';

test('bottom sheet renders an accessible dialog when open', () => {
  render(
    <FinanceBottomSheet open title="Detalhes do lançamento" onClose={vi.fn()}>
      <button type="button">Editar linha</button>
    </FinanceBottomSheet>
  );

  const dialog = screen.getByRole('dialog', { name: 'Detalhes do lançamento' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(within(dialog).getByRole('button', { name: 'Editar linha' })).toBeInTheDocument();
});

test('bottom sheet calls onClose from close button and escape key', () => {
  const onClose = vi.fn();
  render(
    <FinanceBottomSheet open title="Filtros" onClose={onClose}>
      <p>Conteúdo</p>
    </FinanceBottomSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Fechar Filtros' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('bottom sheet keeps editing open when dirty close is rejected', () => {
  const onClose = vi.fn();
  const confirmClose = vi.fn(() => false);
  render(
    <FinanceBottomSheet open title="Editar lançamento" onClose={onClose} dirty confirmClose={confirmClose}>
      <p>Formulário</p>
    </FinanceBottomSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Fechar Editar lançamento' }));
  expect(confirmClose).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceBottomSheet.test.tsx
```

Expected: FAIL because `FinanceBottomSheet` does not exist.

- [ ] **Step 3: Create `FinanceBottomSheet.tsx`**

Create `apps/frontend/src/finance/components/FinanceBottomSheet.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type FinanceBottomSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  dirty?: boolean;
  confirmClose?: () => boolean;
  onClose: () => void;
};

export function FinanceBottomSheet({
  open,
  title,
  description,
  children,
  footer,
  dirty = false,
  confirmClose,
  onClose
}: FinanceBottomSheetProps) {
  function requestClose() {
    if (dirty && confirmClose && !confirmClose()) {
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dirty, confirmClose, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="finance-bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="finance-bottom-sheet__scrim" aria-label={`Fechar ${title}`} onClick={requestClose} />
      <section className="finance-bottom-sheet__panel">
        <div className="finance-bottom-sheet__handle" aria-hidden="true" />
        <header className="finance-bottom-sheet__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="finance-bottom-sheet__close" aria-label={`Fechar ${title}`} onClick={requestClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="finance-bottom-sheet__body">{children}</div>
        {footer ? <footer className="finance-bottom-sheet__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Add bottom sheet CSS**

Append to `apps/frontend/src/finance/finance-pages.css`:

```css
.finance-bottom-sheet {
  position: fixed;
  inset: 0;
  z-index: 70;
}

.finance-bottom-sheet__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.36);
}

.finance-bottom-sheet__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  max-height: min(88dvh, 720px);
  overflow: hidden;
  border-radius: 22px 22px 0 0;
  background: #ffffff;
  box-shadow: 0 -22px 58px rgba(15, 23, 42, 0.22);
}

.finance-bottom-sheet__handle {
  justify-self: center;
  width: 44px;
  height: 4px;
  margin: 10px 0 4px;
  border-radius: 999px;
  background: #cbd5e1;
}

.finance-bottom-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.finance-bottom-sheet__header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  line-height: 1.2;
}

.finance-bottom-sheet__header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.finance-bottom-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #dbe5f0;
  border-radius: 11px;
  background: #ffffff;
  color: #0f172a;
}

.finance-bottom-sheet__body {
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
}

.finance-bottom-sheet__footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.finance-bottom-sheet__footer > * {
  flex: 1 1 0;
}
```

- [ ] **Step 5: Run bottom sheet tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceBottomSheet.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceBottomSheet.tsx apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/__tests__/FinanceBottomSheet.test.tsx
git commit -m "feat: add finance bottom sheet"
```

---

## Task 4: Add Mobile List And Filter Primitives

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceMobileList.tsx`
- Create: `apps/frontend/src/finance/components/FinanceMobileFilterSheet.tsx`
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Test: `apps/frontend/src/finance/__tests__/FinanceMobileList.test.tsx`

- [ ] **Step 1: Write mobile list and filter tests**

Create `apps/frontend/src/finance/__tests__/FinanceMobileList.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FinanceMobileFilterSheet } from '../components/FinanceMobileFilterSheet';
import { FinanceMobileList, FinanceMobileListCard } from '../components/FinanceMobileList';

test('mobile list renders actionable financial cards', () => {
  const onSelect = vi.fn();
  render(
    <FinanceMobileList ariaLabel="Lançamentos mobile">
      <FinanceMobileListCard
        title="Mensalidade de serviços"
        amount="R$ 125,00"
        amountTone="expense"
        status="Em aberto"
        date="25/04/2026"
        meta={['Alpha Serviços', 'Despesas Operacionais']}
        onClick={onSelect}
      />
    </FinanceMobileList>
  );

  const list = screen.getByRole('list', { name: 'Lançamentos mobile' });
  const item = within(list).getByRole('button', { name: /mensalidade de serviços/i });
  expect(item).toHaveTextContent('R$ 125,00');
  expect(item).toHaveTextContent('Em aberto');
  fireEvent.click(item);
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test('mobile filter sheet opens supplied filter controls', () => {
  render(
    <FinanceMobileFilterSheet title="Filtros do ledger" activeCount={2}>
      <label htmlFor="ledger-search-mobile">Busca</label>
      <input id="ledger-search-mobile" />
    </FinanceMobileFilterSheet>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Abrir filtros do ledger, 2 filtros ativos' }));
  expect(screen.getByRole('dialog', { name: 'Filtros do ledger' })).toBeInTheDocument();
  expect(screen.getByLabelText('Busca')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileList.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Create `FinanceMobileList.tsx`**

Create `apps/frontend/src/finance/components/FinanceMobileList.tsx`:

```tsx
import type { ReactNode } from 'react';

type AmountTone = 'income' | 'expense' | 'neutral';

export function FinanceMobileList({
  ariaLabel,
  children
}: {
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="finance-mobile-list" role="list" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function FinanceMobileListCard({
  title,
  amount,
  amountTone = 'neutral',
  status,
  date,
  meta,
  footer,
  onClick
}: {
  title: string;
  amount: string;
  amountTone?: AmountTone;
  status?: string;
  date?: string;
  meta?: string[];
  footer?: ReactNode;
  onClick: () => void;
}) {
  return (
    <article className="finance-mobile-list-card" role="listitem">
      <button type="button" className="finance-mobile-list-card__button" onClick={onClick}>
        <span className="finance-mobile-list-card__head">
          <strong>{title}</strong>
          <span className={`finance-mobile-list-card__amount finance-mobile-list-card__amount--${amountTone}`}>{amount}</span>
        </span>
        <span className="finance-mobile-list-card__subhead">
          {status ? <span>{status}</span> : null}
          {date ? <span>{date}</span> : null}
        </span>
        {meta && meta.length > 0 ? (
          <span className="finance-mobile-list-card__meta">
            {meta.filter(Boolean).map((item) => <small key={item}>{item}</small>)}
          </span>
        ) : null}
        {footer ? <span className="finance-mobile-list-card__footer">{footer}</span> : null}
      </button>
    </article>
  );
}
```

- [ ] **Step 4: Create `FinanceMobileFilterSheet.tsx`**

Create `apps/frontend/src/finance/components/FinanceMobileFilterSheet.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FinanceBottomSheet } from './FinanceBottomSheet';

export function FinanceMobileFilterSheet({
  title,
  activeCount = 0,
  children
}: {
  title: string;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const label = activeCount > 0 ? `Abrir ${title.toLowerCase()}, ${activeCount} filtros ativos` : `Abrir ${title.toLowerCase()}`;

  return (
    <>
      <button type="button" className="finance-mobile-filter-trigger" aria-label={label} onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>Filtros</span>
        {activeCount > 0 ? <strong>{activeCount}</strong> : null}
      </button>
      <FinanceBottomSheet open={open} title={title} onClose={() => setOpen(false)}>
        <div className="finance-mobile-filter-sheet__content">{children}</div>
      </FinanceBottomSheet>
    </>
  );
}
```

- [ ] **Step 5: Add CSS for mobile list and filter trigger**

Append to `apps/frontend/src/finance/finance-pages.css`:

```css
.finance-mobile-list {
  display: grid;
  gap: 10px;
}

.finance-mobile-list-card {
  min-width: 0;
}

.finance-mobile-list-card__button {
  display: grid;
  width: 100%;
  min-height: 96px;
  gap: 8px;
  padding: 14px;
  border: 1px solid #dbe5f0;
  border-radius: 14px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.finance-mobile-list-card__head,
.finance-mobile-list-card__subhead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
  gap: 10px;
}

.finance-mobile-list-card__head strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.25;
}

.finance-mobile-list-card__amount {
  flex-shrink: 0;
  font-family: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
}

.finance-mobile-list-card__amount--income {
  color: #047857;
}

.finance-mobile-list-card__amount--expense {
  color: #dc2626;
}

.finance-mobile-list-card__amount--neutral {
  color: #0f172a;
}

.finance-mobile-list-card__subhead {
  color: #64748b;
  font-size: 12px;
}

.finance-mobile-list-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.finance-mobile-list-card__meta small {
  max-width: 100%;
  padding: 4px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.finance-mobile-list-card__footer {
  display: block;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.finance-mobile-filter-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #dbe5f0;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.finance-mobile-filter-trigger strong {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #0f172a;
  color: #ffffff;
  font-size: 10px;
}

.finance-mobile-filter-sheet__content {
  display: grid;
  gap: 12px;
}
```

- [ ] **Step 6: Run the mobile primitive tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceMobileList.test.tsx src/finance/__tests__/FinanceBottomSheet.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceMobileList.tsx apps/frontend/src/finance/components/FinanceMobileFilterSheet.tsx apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/__tests__/FinanceMobileList.test.tsx
git commit -m "feat: add finance mobile list primitives"
```

---

## Task 5: Extract Transactions Controller

**Files:**
- Create: `apps/frontend/src/finance/hooks/useFinanceTransactionsController.ts`
- Modify: `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`
- Test: `apps/frontend/src/finance/__tests__/useFinanceTransactionsController.test.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx`

- [ ] **Step 1: Write controller tests**

Create `apps/frontend/src/finance/__tests__/useFinanceTransactionsController.test.tsx` by copying the API/session mocks from `FinanceTransactionsPage.test.tsx`, then add these tests:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';
import { todayIso } from '../utils/financeFormatters';

const mocks = vi.hoisted(() => ({
  sessionRead: vi.fn()
}));

vi.mock('../../auth/session', () => ({
  hasAnyPermission: vi.fn(() => true),
  internalSessionStore: {
    read: mocks.sessionRead
  }
}));

vi.mock('../api', () => ({
  financeApi: {
    listTransactions: vi.fn().mockResolvedValue({
      transactions: [
        {
          id: 'ftxn-1',
          organization_id: 'org-prymeira',
          financial_entity_id: 'entity-1',
          financial_entity_name: 'Alpha Serviços',
          financial_account_id: 'facc-1',
          financial_account_name: 'Conta Operacional',
          financial_category_id: 'fcat-1',
          financial_category_name: 'Despesas Operacionais',
          kind: 'expense',
          status: 'open',
          amount_cents: 12500,
          issue_date: '2026-04-20',
          due_date: '2026-04-25',
          settlement_date: null,
          competence_date: '2026-04-20',
          source: 'manual',
          source_ref: null,
          note: 'Mensalidade de serviços',
          created_by: 'finance.user',
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z',
          is_deleted: false,
          views: {
            signed_amount_cents: -12500,
            cash_amount_cents: 0,
            competence_amount_cents: -12500,
            projected_amount_cents: -12500,
            confirmed_amount_cents: 0,
            competence_anchor_date: '2026-04-20',
            cash_anchor_date: null,
            projected_anchor_date: '2026-04-25'
          }
        }
      ]
    }),
    listEntities: vi.fn().mockResolvedValue([
      {
        id: 'entity-1',
        organization_id: 'org-prymeira',
        legal_name: 'Alpha Serviços LTDA',
        trade_name: 'Alpha Serviços',
        document_number: '12.345.678/0001-90',
        kind: 'supplier',
        email: 'financeiro@alpha.com',
        phone: null,
        is_active: true,
        created_at: '2026-04-20T10:00:00.000Z',
        updated_at: '2026-04-20T10:00:00.000Z'
      }
    ]),
    listAccounts: vi.fn().mockResolvedValue({
      company_id: null,
      company_name: null,
      accounts: [
        {
          id: 'facc-1',
          organization_id: 'org-prymeira',
          company_id: 'company-prymeira',
          name: 'Conta Operacional',
          kind: 'bank',
          currency: 'BRL',
          account_number: null,
          branch_number: null,
          is_active: true,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z'
        }
      ]
    }),
    listCategories: vi.fn().mockResolvedValue({
      company_id: null,
      company_name: null,
      categories: [
        {
          id: 'fcat-1',
          organization_id: 'org-prymeira',
          company_id: 'company-prymeira',
          name: 'Despesas Operacionais',
          kind: 'expense',
          parent_category_id: null,
          is_active: true,
          created_at: '2026-04-20T10:00:00.000Z',
          updated_at: '2026-04-20T10:00:00.000Z'
        }
      ]
    }),
    createTransaction: vi.fn().mockResolvedValue({ id: 'ftxn-2' }),
    updateTransaction: vi.fn().mockResolvedValue({ id: 'ftxn-1' }),
    deleteTransaction: vi.fn().mockResolvedValue({ ok: true, transaction: { id: 'ftxn-1' } })
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionRead.mockReturnValue({
    token: 'token-finance',
    expires_at: '2099-01-01T00:00:00.000Z',
    user: {
      id: 'user-finance',
      username: 'financeiro',
      display_name: 'Financeiro',
      role: 'supremo',
      permissions: ['finance.read', 'finance.write', 'finance.approve']
    }
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

test('transactions controller loads catalog, ledger and totals', async () => {
  const { result } = renderHook(() => useFinanceTransactionsController());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.transactions).toHaveLength(1);
  expect(result.current.filteredTransactions).toHaveLength(1);
  expect(result.current.totals.out).toBe(12500);
  expect(result.current.canWrite).toBe(true);
  expect(result.current.canApprove).toBe(true);
});

test('transactions controller auto-fills settlement date for settled creates', async () => {
  const { financeApi } = await import('../api');
  const { result } = renderHook(() => useFinanceTransactionsController());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  result.current.startCreateMode();
  result.current.updateForm('note', 'Lançamento liquidado');
  result.current.updateForm('amount', '100,00');
  result.current.updateForm('status', 'settled');
  await result.current.submitTransaction();

  expect(financeApi.createTransaction).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'settled',
      settlement_date: todayIso()
    })
  );
});
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/useFinanceTransactionsController.test.tsx
```

Expected: FAIL because `useFinanceTransactionsController` does not exist.

- [ ] **Step 3: Create the controller file by moving logic from the page**

Create `apps/frontend/src/finance/hooks/useFinanceTransactionsController.ts`.

Move these exact pieces from `FinanceTransactionsPage.tsx` into the hook file:

- `TransactionEditorMode`
- `TransactionFormState`
- `FilterState`
- `initialFilters`
- `initialForm`
- `statusOptions`
- `kindOptions`
- `entityName`
- `kindLabel`
- `statusLabel`
- `statusTone`
- `matchesSearch`
- `buildFormFromTransaction`
- `getRowLabel`
- every `useState`, `useEffect`, and `useMemo` currently used for transactions data, filters, form, messages, loading, permissions, selected row, period, reload, totals, and selected transaction
- `updateFilter`
- `updateForm`
- `startCreateMode`
- `startEditMode`
- submit logic, renamed from `handleSubmit(event)` to `submitTransaction()`
- delete logic, renamed from `handleDelete()` to `deleteSelectedTransaction()`

The hook must export these types and constants:

```tsx
export type TransactionEditorMode = 'view' | 'create';

export type TransactionFormState = {
  financial_entity_id: string;
  financial_account_id: string;
  financial_category_id: string;
  kind: FinanceTransaction['kind'];
  status: FinanceTransaction['status'];
  amount: string;
  issue_date: string;
  due_date: string;
  competence_date: string;
  settlement_date: string;
  note: string;
};

export type FilterState = {
  type: 'todos' | 'income' | 'expense';
  status: 'todos' | FinanceTransaction['status'];
  search: string;
};

export { entityName, getRowLabel, kindLabel, kindOptions, statusLabel, statusOptions, statusTone };
```

The hook signature must be:

```tsx
export function useFinanceTransactionsController() {
  // moved logic
  return {
    period,
    setPeriod,
    canWrite,
    canApprove,
    transactions,
    filteredTransactions,
    accounts,
    categories,
    entities,
    filters,
    form,
    mode,
    draftTransactionId,
    selectedTransactionId,
    selectedTransaction,
    currentDraftSource,
    selectedIsEditing,
    submitLabel,
    filteredCount,
    totals,
    loading,
    catalogLoading,
    submitting,
    error,
    message,
    updateFilter,
    updateForm,
    startCreateMode,
    startEditMode,
    submitTransaction,
    deleteSelectedTransaction,
    setSelectedTransactionId,
    setMode,
    setDraftTransactionId
  };
}
```

Implement `submitTransaction` without a `FormEvent` parameter:

```tsx
async function submitTransaction() {
  if (!canWrite) {
    setError('Você não tem permissão para alterar movimentações.');
    return;
  }

  const nextSettlementDate = form.status === 'settled' ? (form.settlement_date || todayIso()) : null;
  const payload: CreateFinanceTransactionPayload = {
    financial_entity_id: form.financial_entity_id || null,
    financial_account_id: form.financial_account_id || null,
    financial_category_id: form.financial_category_id || null,
    kind: form.kind,
    status: form.status,
    amount_cents: parseAmountToCents(form.amount),
    issue_date: form.issue_date || null,
    due_date: form.due_date || null,
    settlement_date: nextSettlementDate,
    competence_date: form.competence_date || null,
    note: form.note.trim() || null
  };

  if (payload.amount_cents <= 0) {
    setError('Informe um valor maior que zero para o lançamento.');
    return;
  }

  try {
    setSubmitting(true);
    setError('');
    setMessage('');

    if (selectedIsEditing && draftTransactionId) {
      const updated = await financeApi.updateTransaction(draftTransactionId, payload);
      setSelectedTransactionId(updated.id);
      setDraftTransactionId(null);
      setMode('view');
      setMessage('Lançamento atualizado no ledger central.');
    } else {
      const created = await financeApi.createTransaction(payload);
      setSelectedTransactionId(created.id);
      setDraftTransactionId(null);
      setMode('view');
      setMessage('Novo lançamento manual registrado com sucesso.');
    }

    setReloadNonce((current) => current + 1);
  } catch (submitError) {
    setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar movimentação.');
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 4: Modify `FinanceTransactionsPage.tsx` to use the controller**

At this step, keep the current JSX in `FinanceTransactionsPage.tsx`. Replace local logic imports and local state with:

```tsx
import { type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { FinancePeriodFilter } from '../components/FinancePeriodFilter';
import {
  entityName,
  getRowLabel,
  kindLabel,
  kindOptions,
  statusLabel,
  statusOptions,
  statusTone,
  useFinanceTransactionsController,
  type FilterState,
  type TransactionFormState
} from '../hooks/useFinanceTransactionsController';
import { formatCurrency, formatDate, todayIso } from '../utils/financeFormatters';
```

Inside `FinanceTransactionsPage`, add:

```tsx
const controller = useFinanceTransactionsController();
const {
  period,
  setPeriod,
  canWrite,
  canApprove,
  transactions,
  filteredTransactions,
  accounts,
  categories,
  entities,
  filters,
  form,
  mode,
  draftTransactionId,
  selectedTransaction,
  selectedTransactionId,
  currentDraftSource,
  selectedIsEditing,
  submitLabel,
  filteredCount,
  totals,
  loading,
  catalogLoading,
  submitting,
  error,
  message,
  updateFilter,
  updateForm,
  startCreateMode,
  startEditMode,
  submitTransaction,
  deleteSelectedTransaction,
  setSelectedTransactionId,
  setMode,
  setDraftTransactionId
} = controller;
```

Replace the form submit handler with:

```tsx
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  void submitTransaction();
}
```

Replace calls to `handleDelete` with `deleteSelectedTransaction`.

- [ ] **Step 5: Run controller and existing page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/useFinanceTransactionsController.test.tsx src/finance/__tests__/FinanceTransactionsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/hooks/useFinanceTransactionsController.ts apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx apps/frontend/src/finance/__tests__/useFinanceTransactionsController.test.tsx
git commit -m "refactor: extract finance transactions controller"
```

---

## Task 6: Split Transactions Desktop View

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceTransactionsDesktopView.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx`

- [ ] **Step 1: Add a regression expectation for desktop table**

Add this assertion to the first test in `apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx` after the table assertion:

```tsx
expect(screen.getByRole('region', { name: 'Resumo do ledger' })).toBeInTheDocument();
```

If the summary wrapper currently lacks `role="region"`, the test will fail until the desktop view adds it.

- [ ] **Step 2: Run the page test to verify the new assertion fails if the region is missing**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceTransactionsPage.test.tsx
```

Expected: FAIL if `Resumo do ledger` is not exposed as a region.

- [ ] **Step 3: Create `FinanceTransactionsDesktopView.tsx`**

Create `apps/frontend/src/finance/components/FinanceTransactionsDesktopView.tsx`.

Move the entire JSX return tree and local presentational components/styles from `FinanceTransactionsPage.tsx` into this file:

- `SummaryCard`
- `StatusBadge`
- `InputLabel`
- `TransactionCard`
- every `CSSProperties` constant currently below the component
- the full desktop JSX currently returned by `FinanceTransactionsPage`

The new component signature must be:

```tsx
import { type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { FinancePeriodFilter } from './FinancePeriodFilter';
import {
  entityName,
  getRowLabel,
  kindLabel,
  kindOptions,
  statusLabel,
  statusOptions,
  statusTone,
  type FinanceTransactionsController,
  type FilterState,
  type TransactionFormState
} from '../hooks/useFinanceTransactionsController';
import { formatCurrency, formatDate, todayIso } from '../utils/financeFormatters';

export function FinanceTransactionsDesktopView({ controller }: { controller: FinanceTransactionsController }) {
  const {
    period,
    setPeriod,
    canWrite,
    canApprove,
    transactions,
    filteredTransactions,
    accounts,
    categories,
    entities,
    filters,
    form,
    mode,
    draftTransactionId,
    selectedTransaction,
    selectedTransactionId,
    currentDraftSource,
    selectedIsEditing,
    submitLabel,
    filteredCount,
    totals,
    loading,
    catalogLoading,
    submitting,
    error,
    message,
    updateFilter,
    updateForm,
    startCreateMode,
    startEditMode,
    submitTransaction,
    deleteSelectedTransaction,
    setSelectedTransactionId,
    setMode,
    setDraftTransactionId
  } = controller;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitTransaction();
  }

  return (
    // moved desktop JSX
  );
}
```

In `useFinanceTransactionsController.ts`, export a controller type:

```tsx
export type FinanceTransactionsController = ReturnType<typeof useFinanceTransactionsController>;
```

Make the summary wrapper a region:

```tsx
<div style={summaryGridStyle} role="region" aria-label="Resumo do ledger">
```

- [ ] **Step 4: Replace page body with view selection**

Modify `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`:

```tsx
import { FinanceTransactionsDesktopView } from '../components/FinanceTransactionsDesktopView';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';

export function FinanceTransactionsPage() {
  const controller = useFinanceTransactionsController();
  return <FinanceTransactionsDesktopView controller={controller} />;
}
```

- [ ] **Step 5: Run page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceTransactionsPage.test.tsx src/finance/__tests__/useFinanceTransactionsController.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceTransactionsDesktopView.tsx apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx apps/frontend/src/finance/hooks/useFinanceTransactionsController.ts apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx
git commit -m "refactor: split finance transactions desktop view"
```

---

## Task 7: Add Transactions Mobile View

**Files:**
- Create: `apps/frontend/src/finance/components/FinanceTransactionsMobileView.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Test: `apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx`

- [ ] **Step 1: Add mobile-view tests**

Append this test to `apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx`:

```tsx
test('transactions page exposes a mobile ledger view with filter and detail sheets', async () => {
  const user = (await import('@testing-library/user-event')).default.setup();
  render(<FinanceTransactionsPage forceMobile />);

  await screen.findByRole('list', { name: 'Ledger financeiro mobile' });
  expect(screen.queryByRole('table', { name: 'Ledger financeiro' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /mensalidade de serviços/i }));
  expect(screen.getByRole('dialog', { name: 'Detalhes do lançamento' })).toHaveTextContent('Alpha Serviços');

  await user.click(screen.getByRole('button', { name: /abrir filtros do ledger/i }));
  expect(screen.getByRole('dialog', { name: 'Filtros do ledger' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceTransactionsPage.test.tsx
```

Expected: FAIL because `FinanceTransactionsPage` does not accept `forceMobile` and mobile view does not exist.

- [ ] **Step 3: Create `FinanceTransactionsMobileView.tsx`**

Create `apps/frontend/src/finance/components/FinanceTransactionsMobileView.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { FinanceBottomSheet } from './FinanceBottomSheet';
import { FinanceMobileFilterSheet } from './FinanceMobileFilterSheet';
import { FinanceMobileList, FinanceMobileListCard } from './FinanceMobileList';
import {
  entityName,
  kindOptions,
  statusLabel,
  statusOptions,
  type FinanceTransactionsController,
  type FilterState,
  type TransactionFormState
} from '../hooks/useFinanceTransactionsController';
import { formatCurrency, formatDate, todayIso } from '../utils/financeFormatters';

export function FinanceTransactionsMobileView({ controller }: { controller: FinanceTransactionsController }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    accounts,
    categories,
    entities,
    filters,
    form,
    canWrite,
    selectedTransaction,
    filteredTransactions,
    filteredCount,
    totals,
    loading,
    catalogLoading,
    submitting,
    error,
    message,
    submitLabel,
    selectedIsEditing,
    updateFilter,
    updateForm,
    startCreateMode,
    startEditMode,
    submitTransaction,
    deleteSelectedTransaction,
    setSelectedTransactionId,
    setMode,
    setDraftTransactionId
  } = controller;

  function openTransaction(transactionId: string) {
    setSelectedTransactionId(transactionId);
    setMode('view');
    setDraftTransactionId(null);
    setDetailOpen(true);
  }

  function handleCreate() {
    startCreateMode();
    setDetailOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitTransaction();
  }

  const activeFilterCount = [filters.type !== 'todos', filters.status !== 'todos', Boolean(filters.search.trim())].filter(Boolean).length;
  const editing = selectedIsEditing || controller.mode === 'create';

  return (
    <section className="page finance-page finance-ledger-page finance-ledger-page--mobile">
      <header className="finance-mobile-page-head">
        <div>
          <small>Movimentações</small>
          <h1>Ledger financeiro</h1>
          <p>{filteredCount} lançamentos no filtro atual</p>
        </div>
        <button type="button" className="finance-mobile-primary-action" onClick={handleCreate} disabled={!canWrite}>
          Novo
        </button>
      </header>

      {error ? <div className="finance-mobile-alert finance-mobile-alert--error">{error}</div> : null}
      {message ? <div className="finance-mobile-alert finance-mobile-alert--success">{message}</div> : null}

      <section className="finance-mobile-summary" aria-label="Resumo do ledger">
        <article><span>Total</span><strong>{filteredCount}</strong></article>
        <article><span>Entradas</span><strong>{formatCurrency(totals.in)}</strong></article>
        <article><span>Saídas</span><strong>{formatCurrency(totals.out)}</strong></article>
        <article><span>Saldo</span><strong>{formatCurrency(totals.in - totals.out)}</strong></article>
      </section>

      <div className="finance-mobile-toolbar">
        <FinanceMobileFilterSheet title="Filtros do ledger" activeCount={activeFilterCount}>
          <label className="finance-ledger-field">
            <span>Busca</span>
            <input aria-label="Busca" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} title="Buscar lançamento ou entidade" />
          </label>
          <label className="finance-ledger-field">
            <span>Tipo</span>
            <select aria-label="Tipo" value={filters.type} onChange={(event) => updateFilter('type', event.target.value as FilterState['type'])}>
              {kindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="finance-ledger-field">
            <span>Status</span>
            <select aria-label="Status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value as FilterState['status'])}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </FinanceMobileFilterSheet>
        {loading ? <span className="finance-mobile-loading">Atualizando...</span> : null}
      </div>

      <FinanceMobileList ariaLabel="Ledger financeiro mobile">
        {filteredTransactions.map((transaction) => (
          <FinanceMobileListCard
            key={transaction.id}
            title={transaction.note?.trim() || transaction.financial_entity_name || 'Movimentação financeira'}
            amount={`${transaction.kind === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount_cents)}`}
            amountTone={transaction.kind === 'income' ? 'income' : 'expense'}
            status={statusLabel(transaction.status)}
            date={formatDate(transaction.settlement_date ?? transaction.due_date ?? transaction.competence_date ?? transaction.issue_date)}
            meta={[transaction.financial_entity_name || 'Sem entidade', transaction.financial_category_name || 'Sem categoria']}
            onClick={() => openTransaction(transaction.id)}
          />
        ))}
      </FinanceMobileList>

      <FinanceBottomSheet
        open={detailOpen}
        title={editing ? (selectedIsEditing ? 'Editar lançamento' : 'Novo lançamento') : 'Detalhes do lançamento'}
        dirty={editing && Boolean(form.note || form.amount)}
        confirmClose={() => window.confirm('Fechar sem salvar este lançamento?')}
        onClose={() => {
          setDetailOpen(false);
          setMode('view');
          setDraftTransactionId(null);
        }}
      >
        {editing ? (
          <form className="finance-mobile-transaction-form" onSubmit={handleSubmit}>
            <label><span>Descrição</span><input aria-label="Descrição" value={form.note} onChange={(event) => updateForm('note', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Entidade</span><select aria-label="Entidade" value={form.financial_entity_id} onChange={(event) => updateForm('financial_entity_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem entidade</option>{entities.map((entry) => <option key={entry.id} value={entry.id}>{entityName(entry)}</option>)}</select></label>
            <label><span>Conta</span><select aria-label="Conta" value={form.financial_account_id} onChange={(event) => updateForm('financial_account_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem conta</option>{accounts.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label><span>Categoria</span><select aria-label="Categoria" value={form.financial_category_id} onChange={(event) => updateForm('financial_category_id', event.target.value)} disabled={!canWrite || submitting || catalogLoading}><option value="">Sem categoria</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label><span>Valor</span><input aria-label="Valor" inputMode="decimal" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Tipo</span><select aria-label="Tipo do lançamento" value={form.kind} onChange={(event) => updateForm('kind', event.target.value as TransactionFormState['kind'])} disabled={!canWrite || submitting}><option value="income">Entrada</option><option value="expense">Saída</option></select></label>
            <label><span>Status</span><select aria-label="Status do lançamento" value={form.status} onChange={(event) => updateForm('status', event.target.value as TransactionFormState['status'])} disabled={!canWrite || submitting}>{statusOptions.filter((option) => option.value !== 'todos').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>Emissão</span><input aria-label="Data de emissão" type="date" value={form.issue_date} onChange={(event) => updateForm('issue_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Vencimento</span><input aria-label="Data de vencimento" type="date" value={form.due_date} onChange={(event) => updateForm('due_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Competência</span><input aria-label="Data de competência" type="date" value={form.competence_date} onChange={(event) => updateForm('competence_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <label><span>Baixa</span><input aria-label="Data da baixa" type="date" value={form.settlement_date || (form.status === 'settled' ? todayIso() : '')} onChange={(event) => updateForm('settlement_date', event.target.value)} disabled={!canWrite || submitting} /></label>
            <button type="submit" className="finance-mobile-primary-action" disabled={!canWrite || submitting}>{submitting ? 'Salvando...' : submitLabel}</button>
          </form>
        ) : selectedTransaction ? (
          <div className="finance-mobile-transaction-detail">
            <strong>{selectedTransaction.note || 'Movimentação financeira'}</strong>
            <span>{formatCurrency(selectedTransaction.amount_cents)}</span>
            <dl>
              <div><dt>Entidade</dt><dd>{selectedTransaction.financial_entity_name || 'Sem entidade'}</dd></div>
              <div><dt>Conta</dt><dd>{selectedTransaction.financial_account_name || 'Sem conta'}</dd></div>
              <div><dt>Categoria</dt><dd>{selectedTransaction.financial_category_name || 'Sem categoria'}</dd></div>
              <div><dt>Status</dt><dd>{statusLabel(selectedTransaction.status)}</dd></div>
            </dl>
            <div className="finance-mobile-sheet-actions">
              <button type="button" onClick={startEditMode} disabled={!canWrite}>Editar linha</button>
              <button type="button" onClick={() => void deleteSelectedTransaction()} disabled={submitting}>Excluir</button>
            </div>
          </div>
        ) : null}
      </FinanceBottomSheet>
    </section>
  );
}
```

- [ ] **Step 4: Add optional forced mobile prop to the page**

Modify `apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx`:

```tsx
import { FinanceTransactionsDesktopView } from '../components/FinanceTransactionsDesktopView';
import { FinanceTransactionsMobileView } from '../components/FinanceTransactionsMobileView';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';

export function FinanceTransactionsPage({ forceMobile = false }: { forceMobile?: boolean }) {
  const controller = useFinanceTransactionsController();

  return (
    <>
      <div className={forceMobile ? '' : 'finance-desktop-only'}>
        {!forceMobile ? <FinanceTransactionsDesktopView controller={controller} /> : null}
      </div>
      <div className={forceMobile ? '' : 'finance-mobile-only'}>
        {forceMobile ? <FinanceTransactionsMobileView controller={controller} /> : null}
      </div>
      {!forceMobile ? (
        <>
          <div className="finance-transactions-desktop-runtime"><FinanceTransactionsDesktopView controller={controller} /></div>
          <div className="finance-transactions-mobile-runtime"><FinanceTransactionsMobileView controller={controller} /></div>
        </>
      ) : null}
    </>
  );
}
```

Then simplify the double-render risk before committing by using this final version:

```tsx
import { FinanceTransactionsDesktopView } from '../components/FinanceTransactionsDesktopView';
import { FinanceTransactionsMobileView } from '../components/FinanceTransactionsMobileView';
import { useFinanceTransactionsController } from '../hooks/useFinanceTransactionsController';

export function FinanceTransactionsPage({ forceMobile = false }: { forceMobile?: boolean }) {
  const controller = useFinanceTransactionsController();

  if (forceMobile) {
    return <FinanceTransactionsMobileView controller={controller} />;
  }

  return (
    <>
      <div className="finance-transactions-desktop-runtime">
        <FinanceTransactionsDesktopView controller={controller} />
      </div>
      <div className="finance-transactions-mobile-runtime">
        <FinanceTransactionsMobileView controller={controller} />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Add runtime CSS for desktop/mobile view switching and mobile transaction layout**

Append to `apps/frontend/src/finance/finance-pages.css`:

```css
.finance-transactions-mobile-runtime {
  display: none;
}

@media (max-width: 760px) {
  .finance-transactions-desktop-runtime {
    display: none;
  }

  .finance-transactions-mobile-runtime {
    display: block;
  }

  .finance-ledger-page--mobile {
    padding: 0 0 18px !important;
  }

  .finance-mobile-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .finance-mobile-page-head small {
    display: block;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .finance-mobile-page-head h1 {
    margin: 3px 0 4px;
    color: #0f172a;
    font-size: 23px;
    line-height: 1.1;
  }

  .finance-mobile-page-head p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  .finance-mobile-primary-action {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    background: #1d2830;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
  }

  .finance-mobile-alert {
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.35;
  }

  .finance-mobile-alert--error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }

  .finance-mobile-alert--success {
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    color: #166534;
  }

  .finance-mobile-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .finance-mobile-summary article {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 10px;
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    background: #ffffff;
  }

  .finance-mobile-summary span {
    color: #64748b;
    font-size: 11px;
  }

  .finance-mobile-summary strong {
    color: #0f172a;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .finance-mobile-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .finance-mobile-loading {
    color: #64748b;
    font-size: 12px;
  }

  .finance-mobile-transaction-form {
    display: grid;
    gap: 11px;
  }

  .finance-mobile-transaction-form label {
    display: grid;
    gap: 5px;
  }

  .finance-mobile-transaction-form label span {
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }

  .finance-mobile-transaction-form input,
  .finance-mobile-transaction-form select {
    width: 100%;
    min-height: 40px;
    border: 1px solid #dbe5f0;
    border-radius: 10px;
    padding: 0 10px;
    background: #ffffff;
    color: #0f172a;
    font-size: 14px;
  }

  .finance-mobile-transaction-detail {
    display: grid;
    gap: 12px;
  }

  .finance-mobile-transaction-detail > strong {
    color: #0f172a;
    font-size: 16px;
  }

  .finance-mobile-transaction-detail > span {
    color: #0f172a;
    font-family: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 20px;
    font-weight: 800;
  }

  .finance-mobile-transaction-detail dl {
    display: grid;
    gap: 8px;
    margin: 0;
  }

  .finance-mobile-transaction-detail dl div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid #eef2f7;
  }

  .finance-mobile-transaction-detail dt {
    color: #64748b;
    font-size: 12px;
  }

  .finance-mobile-transaction-detail dd {
    margin: 0;
    color: #0f172a;
    font-size: 13px;
    font-weight: 700;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .finance-mobile-sheet-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .finance-mobile-sheet-actions button {
    min-height: 40px;
    border: 1px solid #dbe5f0;
    border-radius: 10px;
    background: #ffffff;
    color: #0f172a;
    font-size: 13px;
    font-weight: 800;
  }
}
```

- [ ] **Step 6: Run transaction page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceTransactionsPage.test.tsx src/finance/__tests__/useFinanceTransactionsController.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceTransactionsMobileView.tsx apps/frontend/src/finance/pages/FinanceTransactionsPage.tsx apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/__tests__/FinanceTransactionsPage.test.tsx
git commit -m "feat: add mobile transactions view"
```

---

## Task 8: Apply Mobile Patterns To Receivables, Payables, And Reconciliation

**Files:**
- Modify: `apps/frontend/src/finance/pages/FinanceReceivablesPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinancePayablesPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx`
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Test: `apps/frontend/src/finance/__tests__/FinanceReceivablesPage.test.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinancePayablesPage.test.tsx`
- Test: `apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx`

- [ ] **Step 1: Add mobile smoke expectations to existing tests**

In `FinanceReceivablesPage.test.tsx`, add an assertion that the page renders a mobile list region:

```tsx
expect(await screen.findByRole('region', { name: 'Recebíveis mobile' })).toBeInTheDocument();
```

In `FinancePayablesPage.test.tsx`, add:

```tsx
expect(await screen.findByRole('region', { name: 'Contas a pagar mobile' })).toBeInTheDocument();
```

In `FinanceReconciliationPage.test.tsx`, add:

```tsx
expect(await screen.findByRole('region', { name: 'Conciliação mobile' })).toBeInTheDocument();
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceReceivablesPage.test.tsx src/finance/__tests__/FinancePayablesPage.test.tsx src/finance/__tests__/FinanceReconciliationPage.test.tsx
```

Expected: FAIL because these regions are not exposed.

- [ ] **Step 3: Add mobile section wrappers in the pages**

In each page, wrap the existing operational list/table area with a mobile region that uses existing data and controls.

For `FinanceReceivablesPage.tsx`, add near the operational list:

```tsx
<section className="finance-mobile-dense-section" aria-label="Recebíveis mobile">
  <FinanceMobileList ariaLabel="Recebíveis em cards">
    {receivables.map((item) => (
      <FinanceMobileListCard
        key={item.id}
        title={item.note || item.financial_entity_name || 'Conta a receber'}
        amount={formatCurrency(item.amount_cents)}
        amountTone="income"
        status={statusLabel(item.status)}
        date={formatDate(item.due_date || item.settlement_date || item.issue_date)}
        meta={[item.financial_entity_name || 'Sem cliente', item.financial_account_name || 'Sem conta']}
        onClick={() => selectReceivable(item.id)}
      />
    ))}
  </FinanceMobileList>
</section>
```

For `FinancePayablesPage.tsx`, add near the operational list:

```tsx
<section className="finance-mobile-dense-section" aria-label="Contas a pagar mobile">
  <FinanceMobileList ariaLabel="Contas a pagar em cards">
    {payables.map((item) => (
      <FinanceMobileListCard
        key={item.id}
        title={item.note || item.financial_entity_name || 'Conta a pagar'}
        amount={formatCurrency(item.amount_cents)}
        amountTone="expense"
        status={statusLabel(item.status)}
        date={formatDate(item.due_date || item.settlement_date || item.issue_date)}
        meta={[item.financial_entity_name || 'Sem fornecedor', item.financial_account_name || 'Sem conta']}
        onClick={() => selectPayable(item.id)}
      />
    ))}
  </FinanceMobileList>
</section>
```

For `FinanceReconciliationPage.tsx`, add near the review queue:

```tsx
<section className="finance-mobile-dense-section" aria-label="Conciliação mobile">
  <FinanceMobileList ariaLabel="Itens de conciliação em cards">
    {draftItems.map((item) => (
      <FinanceMobileListCard
        key={item.id}
        title={item.memo || item.transaction_note || 'Item de conciliação'}
        amount={formatCurrency(item.amount_cents)}
        amountTone={item.amount_cents >= 0 ? 'income' : 'expense'}
        status={reconciliationStatusLabel(item.status)}
        date={formatDate(item.posted_at || item.due_date)}
        meta={[item.suggested_entity_name || 'Sem entidade sugerida', item.suggested_category_name || 'Sem categoria sugerida']}
        onClick={() => selectDraftItem(item.id)}
      />
    ))}
  </FinanceMobileList>
</section>
```

If the local arrays or handlers use different names, preserve the existing local names and keep the same mapping shape: `key`, `title`, `amount`, `amountTone`, `status`, `date`, `meta`, and `onClick`. Do not introduce new data fetching in these mobile sections.

- [ ] **Step 4: Add CSS for operational mobile sections**

Append to `apps/frontend/src/finance/finance-pages.css`:

```css
.finance-mobile-dense-section {
  display: none;
}

@media (max-width: 760px) {
  .finance-mobile-dense-section {
    display: block;
  }

  .finance-ops-page table,
  .finance-reconciliation-page table {
    display: none;
  }

  .finance-ops-page .finance-page-header,
  .finance-reconciliation-page .finance-page-header {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    margin-bottom: 16px !important;
  }

  .finance-ops-page .finance-page-header__copy h1,
  .finance-reconciliation-page .finance-page-header__copy h1 {
    font-size: 24px !important;
    line-height: 1.12 !important;
  }

  .finance-ops-page .finance-page-header__copy p,
  .finance-reconciliation-page .finance-page-header__copy p {
    font-size: 13px !important;
  }

  .finance-ops-page .finance-panel,
  .finance-reconciliation-page .finance-panel {
    border-radius: 14px !important;
  }
}
```

- [ ] **Step 5: Run operational page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceReceivablesPage.test.tsx src/finance/__tests__/FinancePayablesPage.test.tsx src/finance/__tests__/FinanceReconciliationPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/pages/FinanceReceivablesPage.tsx apps/frontend/src/finance/pages/FinancePayablesPage.tsx apps/frontend/src/finance/pages/FinanceReconciliationPage.tsx apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/__tests__/FinanceReceivablesPage.test.tsx apps/frontend/src/finance/__tests__/FinancePayablesPage.test.tsx apps/frontend/src/finance/__tests__/FinanceReconciliationPage.test.tsx
git commit -m "feat: add mobile finance operations patterns"
```

---

## Task 9: Stabilize Remaining Finance Pages On Mobile

**Files:**
- Modify: `apps/frontend/src/finance/pages/FinanceOverviewPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceCashflowPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceReportsPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceCadastrosPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceSimulationPage.tsx`
- Modify: `apps/frontend/src/finance/pages/FinanceAdvancedPage.tsx`
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Test: existing page tests under `apps/frontend/src/finance/__tests__`

- [ ] **Step 1: Add page-level mobile smoke assertions**

Add one mobile smoke assertion to each existing test file:

```tsx
expect(document.querySelector('.finance-page')).toBeTruthy();
```

For pages with tables, also assert a table wrapper or mobile-safe section exists:

```tsx
expect(document.querySelector('.finance-table-shell, .finance-mobile-dense-section, .finance-report-ref-page')).toBeTruthy();
```

- [ ] **Step 2: Run the finance page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceOverviewPage.test.tsx src/finance/__tests__/FinanceCashflowPage.test.tsx src/finance/__tests__/FinanceReportsPage.test.tsx src/finance/__tests__/FinanceCadastrosPage.test.tsx src/finance/__tests__/FinanceSimulationPage.test.tsx src/finance/__tests__/FinanceAdvancedPage.test.tsx
```

Expected: PASS before CSS changes or FAIL only where a page lacks a stable class hook.

- [ ] **Step 3: Add mobile CSS guardrails**

Append to `apps/frontend/src/finance/finance-pages.css`:

```css
@media (max-width: 760px) {
  .finance-page {
    max-width: 100% !important;
    overflow-x: hidden;
  }

  .finance-page-header,
  .finance-page-header--with-meta {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    margin-bottom: 16px !important;
  }

  .finance-page-header__copy h1 {
    font-size: 24px !important;
    line-height: 1.12 !important;
    letter-spacing: 0 !important;
  }

  .finance-page-header__copy p {
    max-width: 100% !important;
    font-size: 13px !important;
  }

  .finance-page-header__meta {
    min-width: 0 !important;
    width: 100% !important;
    padding: 12px !important;
    border-radius: 12px !important;
  }

  .finance-kpi-grid--overview,
  .finance-overview-page .finance-kpi-grid--overview,
  .finance-cashflow-page__summary,
  .finance-cashflow-window-grid,
  .finance-report-ref__exec-grid,
  .finance-cadastros-grid,
  .finance-advanced__summary,
  .finance-simulation-kpis {
    grid-template-columns: 1fr !important;
  }

  .finance-panel,
  .finance-table-shell,
  .finance-filter-block {
    max-width: 100%;
    border-radius: 14px !important;
  }

  .finance-table-shell__content,
  .finance-panel__content {
    max-width: 100%;
    overflow-x: auto;
  }

  .finance-cadastros-tabs,
  .finance-report-ref__tabs,
  .finance-cashflow-horizon-switcher,
  .finance-advanced-tool-tabs {
    display: flex !important;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;
  }

  .finance-cadastros-tabs::-webkit-scrollbar,
  .finance-report-ref__tabs::-webkit-scrollbar,
  .finance-cashflow-horizon-switcher::-webkit-scrollbar,
  .finance-advanced-tool-tabs::-webkit-scrollbar {
    display: none;
  }

  .finance-cadastros-tabs button,
  .finance-report-ref__tabs button,
  .finance-cashflow-horizon-switcher button,
  .finance-advanced-tool-tabs button {
    flex: 0 0 auto;
    min-height: 38px;
    white-space: nowrap;
  }

  .finance-cashflow-page__chart,
  .finance-overview-page .finance-cashflow-chart--overview {
    min-width: 0;
    overflow-x: auto;
  }

  .finance-simulation-page,
  .finance-advanced-page {
    overflow-x: hidden;
  }
}
```

- [ ] **Step 4: Add class hooks where tests exposed missing anchors**

If a page fails because `finance-page` is absent, update the top-level `<section>` to include both classes:

```tsx
<section className="page finance-page [existing-page-specific-class]">
```

Keep the existing page-specific class in place.

- [ ] **Step 5: Run remaining page tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance/__tests__/FinanceOverviewPage.test.tsx src/finance/__tests__/FinanceCashflowPage.test.tsx src/finance/__tests__/FinanceReportsPage.test.tsx src/finance/__tests__/FinanceCadastrosPage.test.tsx src/finance/__tests__/FinanceSimulationPage.test.tsx src/finance/__tests__/FinanceAdvancedPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/pages/FinanceOverviewPage.tsx apps/frontend/src/finance/pages/FinanceCashflowPage.tsx apps/frontend/src/finance/pages/FinanceReportsPage.tsx apps/frontend/src/finance/pages/FinanceCadastrosPage.tsx apps/frontend/src/finance/pages/FinanceSimulationPage.tsx apps/frontend/src/finance/pages/FinanceAdvancedPage.tsx apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/__tests__
git commit -m "fix: stabilize finance pages on mobile"
```

---

## Task 10: Visual Verification And Build

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run all frontend finance tests**

Run:

```bash
npm --workspace apps/frontend run test -- src/finance
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```bash
npm run build -w apps/frontend
```

Expected: PASS with TypeScript and Vite build output.

- [ ] **Step 3: Start local demo server**

Run:

```bash
npm run demo:reset
npm run demo:prymeira
```

Expected: backend starts on `http://localhost:4000` and frontend starts on `http://localhost:5173`.

- [ ] **Step 4: Verify desktop route**

Open:

```text
http://localhost:5173/financeiro/transactions
```

Viewport: desktop width at least `1280px`.

Expected:

- sidebar is visible;
- mobile bottom bar is hidden;
- ledger table is visible;
- detail panel and editor still work.

- [ ] **Step 5: Verify mobile `390x844`**

Open:

```text
http://localhost:5173/financeiro/transactions
```

Viewport: `390x844`.

Expected:

- mobile header is visible;
- bottom nav is visible;
- desktop sidebar is hidden;
- ledger appears as cards;
- tapping a card opens `Detalhes do lançamento`;
- filters open in `Filtros do ledger`;
- new transaction sheet can be opened without horizontal overflow.

- [ ] **Step 6: Verify mobile `360x780`**

Use the same URL with viewport `360x780`.

Expected:

- no text overlaps in header, bottom nav, cards, or sheets;
- bottom nav labels remain readable;
- sheets stay within viewport height and scroll internally;
- forms remain usable without horizontal scroll.

- [ ] **Step 7: Verify route coverage on mobile**

At viewport `390x844`, open each route:

```text
http://localhost:5173/financeiro/overview
http://localhost:5173/financeiro/transactions
http://localhost:5173/financeiro/receivables
http://localhost:5173/financeiro/payables
http://localhost:5173/financeiro/reconciliation
http://localhost:5173/financeiro/cashflow
http://localhost:5173/financeiro/reports
http://localhost:5173/financeiro/cadastros
http://localhost:5173/financeiro/simulation
http://localhost:5173/financeiro/advanced
```

Expected:

- each route loads;
- page content fits within the viewport width;
- route is reachable through bottom nav or "Mais";
- no route requires zoom to identify main controls.

- [ ] **Step 8: Stop local demo server**

If `npm run demo:prymeira` is still running in the terminal, stop it with `Ctrl+C`.

- [ ] **Step 9: Commit verification fixes**

If verification required code changes:

```bash
git add apps/frontend/src/finance
git commit -m "fix: polish finance mobile verification"
```

If verification required no code changes, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage:
  - Mobile shell: Tasks 1 and 2.
  - Bottom sheets: Task 3.
  - Mobile lists and compact filters: Task 4.
  - Shared transaction controller: Task 5.
  - Desktop preservation for transactions: Task 6.
  - Mobile transactions parity: Task 7.
  - Receber, Pagar, Conciliação: Task 8.
  - Overview, Fluxo, Relatórios, Cadastros, Simulação, Avançado: Task 9.
  - `390x844`, `360x780`, tests, and build: Task 10.

- Completion scan:
  - No unresolved planning markers.
  - No undefined file paths.
  - No unspecified test commands.

- Type consistency:
  - `FinanceTransactionsController` is defined as `ReturnType<typeof useFinanceTransactionsController>`.
  - `FilterState` and `TransactionFormState` are exported from the controller hook and imported by the views.
  - Mobile tests use `forceMobile` only on `FinanceTransactionsPage`, matching Task 7.
