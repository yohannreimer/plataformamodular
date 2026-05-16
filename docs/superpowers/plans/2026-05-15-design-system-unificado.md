# Design System Unificado — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a linguagem visual entre o Módulo Técnico e o Módulo Financeiro da Plataforma Prymeira criando uma camada de tokens CSS compartilhados, componentes React reutilizáveis, e redesenhando o Hub de módulos.

**Architecture:** Tokens centralizados em `shared/tokens.css` importado por ambos os módulos. Componentes compartilhados em `shared/components/` substituem variantes divergentes. O Hub `/app` é reconstruído com a identidade visual premium acordada.

**Tech Stack:** React 18 + TypeScript, Vite, CSS custom properties, Lucide React (a instalar), DM Sans + DM Mono (Google Fonts)

---

## Mapeamento de arquivos

### Criar
- `apps/frontend/src/shared/tokens.css` — tokens de design (paleta, tipografia, espaçamento, sombras, raios, movimento)
- `apps/frontend/src/shared/components/PageHeader.tsx` — substitui header do Técnico e `FinancePageHeader`
- `apps/frontend/src/shared/components/PageHeader.css`
- `apps/frontend/src/shared/components/Panel.tsx` — substitui `Section.tsx` e `FinancePanel`
- `apps/frontend/src/shared/components/Panel.css`
- `apps/frontend/src/shared/components/KpiCard.tsx` — substitui `KpiCard.tsx` e `FinanceKpiCard`
- `apps/frontend/src/shared/components/KpiCard.css`
- `apps/frontend/src/shared/components/DataTable.tsx` — substitui tabelas HTML cruas do Técnico
- `apps/frontend/src/shared/components/DataTable.css`
- `apps/frontend/src/shared/components/StatusBadge.tsx` — substitui `StatusChip.tsx`
- `apps/frontend/src/shared/components/StatusBadge.css`
- `apps/frontend/src/shared/components/Toast.tsx` — substitui `state.message` / `state.error`
- `apps/frontend/src/shared/components/Toast.css`
- `apps/frontend/src/shared/components/ConfirmDialog.tsx` — substitui `window.confirm`
- `apps/frontend/src/shared/components/ConfirmDialog.css`
- `apps/frontend/src/shared/components/index.ts` — re-exporta tudo

### Modificar
- `apps/frontend/index.html` — adicionar link Google Fonts (DM Sans + DM Mono)
- `apps/frontend/src/styles.css` — remover `font-family: Inter`, aplicar `font-family: 'DM Sans'`, trocar gradiente radial por `var(--canvas)`; importar `shared/tokens.css`
- `apps/frontend/src/components/Layout.tsx` — adicionar ícones Lucide nos navItems da sidebar
- `apps/frontend/src/auth/navigation.ts` (ou onde `AppNavItem` e os navItems são definidos) — adicionar campo `icon` em cada rota
- `apps/frontend/src/core/ModuleHubPage.tsx` — reescrever completamente com novo design
- `apps/frontend/src/finance/finance-shell.css` — importar `shared/tokens.css` como primeira linha
- `apps/frontend/src/finance/components/FinanceSidebar.tsx` — migrar `NavigationGlyph` de SVG inline para Lucide

### Não modificar
- Lógica de negócio, API calls, estado
- Estrutura de rotas e permissões
- `apps/frontend/src/finance/components/FinanceKpiGrid.tsx`, `FinanceLedgerTable.tsx`, `FinanceWhisperFlow.tsx`
- `apps/frontend/src/finance/finance-pages.css`, `finance-whisper.css`

---

## Task 1: Tokens CSS e tipografia global

**Files:**
- Create: `apps/frontend/src/shared/tokens.css`
- Modify: `apps/frontend/index.html`
- Modify: `apps/frontend/src/styles.css`

- [ ] **Step 1: Criar o arquivo de tokens**

```css
/* apps/frontend/src/shared/tokens.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..800&family=DM+Mono:wght@400;500&display=swap');

:root {
  /* ── Brand ──────────────────────────────────── */
  --brand-ink:          #1d2830;
  --brand-accent:       #F5B700;
  --brand-accent-soft:  #FFF8DB;

  /* ── Superfícies ────────────────────────────── */
  --canvas:             #f1f5f9;
  --surface:            #ffffff;
  --surface-soft:       #f8fafc;
  --surface-muted:      #f1f5f9;

  /* ── Texto ──────────────────────────────────── */
  --text-primary:       #0f172a;
  --text-secondary:     #475569;
  --text-muted:         #64748b;
  --text-soft:          #94a3b8;

  /* ── Bordas ─────────────────────────────────── */
  --border:             #e2e8f0;
  --border-strong:      #cbd5e1;

  /* ── Semânticas ─────────────────────────────── */
  --color-success:      #059669;
  --color-success-soft: #dcfce7;
  --color-danger:       #dc2626;
  --color-danger-soft:  #fee2e2;
  --color-warning:      #d97706;
  --color-warning-soft: #fffbeb;
  --color-info:         #2563eb;
  --color-info-soft:    #dbeafe;

  /* ── Radius ─────────────────────────────────── */
  --radius-sm:          7px;
  --radius-md:          10px;
  --radius-lg:          14px;
  --radius-xl:          16px;

  /* ── Sombras ────────────────────────────────── */
  --shadow-none:        none;
  --shadow-soft:        0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
  --shadow-md:          0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04);
  --shadow-lg:          0 12px 32px rgba(15,23,42,.10), 0 4px 8px rgba(15,23,42,.06);

  /* ── Espaçamento ────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;

  /* ── Movimento ──────────────────────────────── */
  --motion-fast:  120ms ease-out;
  --motion-base:  180ms ease-out;
  --motion-slow:  280ms ease-out;

  /* ── Focus ──────────────────────────────────── */
  --focus-ring: 0 0 0 3px rgba(29,40,48,.18);
}

body {
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  background: var(--canvas);
}

.mono {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 2: Importar tokens.css em styles.css e remover Inter/gradiente**

Abrir `apps/frontend/src/styles.css`. Remover as três linhas `@import url(...)` existentes (DM Sans, Inter, Fraunces/Manrope). Adicionar no topo:

```css
@import './shared/tokens.css';
```

Localizar e substituir o bloco `body { ... }` existente (linhas ~70–78) por:

```css
/* body typography e background vêm de shared/tokens.css */
```

(O `body` já fica definido em `tokens.css`. Remover o `body { font-family: 'Inter'... background: radial-gradient... }` do `styles.css` completamente para não colidir.)

- [ ] **Step 3: Importar tokens.css no finance-shell.css**

Abrir `apps/frontend/src/finance/finance-shell.css`. Inserir como **primeira linha**:

```css
@import '../shared/tokens.css';
```

- [ ] **Step 4: Verificar que a app inicia sem erros**

```bash
cd "apps/frontend" && npm run dev
```

Acessar `http://localhost:5173`. Confirmar que a fonte mudou para DM Sans e o fundo é `#f1f5f9` (slate-100 flat, sem gradiente radial).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/shared/tokens.css apps/frontend/src/styles.css apps/frontend/src/finance/finance-shell.css
git commit -m "feat: add shared design tokens, switch body to DM Sans + flat canvas"
```

---

## Task 2: Instalar Lucide React

**Files:**
- Modify: `apps/frontend/package.json` (via npm)

- [ ] **Step 1: Instalar a dependência**

```bash
cd "apps/frontend" && npm install lucide-react
```

Saída esperada: `added X packages` sem erros.

- [ ] **Step 2: Verificar importação**

Criar um arquivo temporário de teste `apps/frontend/src/shared/lucide-check.ts`:

```ts
import { LayoutDashboard } from 'lucide-react';
console.log(LayoutDashboard);
```

Rodar `npm run build` no workspace de frontend. Se compilar sem erros, remover o arquivo.

```bash
cd "apps/frontend" && npm run build && rm src/shared/lucide-check.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat: install lucide-react icon library"
```

---

## Task 3: Ícones na sidebar do Módulo Técnico

**Files:**
- Modify: `apps/frontend/src/auth/navigation.ts` (verificar caminho exato com `find apps/frontend/src -name "navigation.ts"`)
- Modify: `apps/frontend/src/components/Layout.tsx`

- [ ] **Step 1: Verificar o tipo AppNavItem e onde os navItems são montados**

```bash
grep -rn "AppNavItem" "apps/frontend/src/" --include="*.ts" --include="*.tsx"
```

Localizar o arquivo que define `AppNavItem` e onde o array de navItems do Técnico é criado. A task pressupõe que está em `apps/frontend/src/auth/navigation.ts`.

- [ ] **Step 2: Adicionar campo icon ao tipo AppNavItem**

Abrir o arquivo encontrado. Alterar o tipo de `AppNavItem`:

```ts
import type { LucideIcon } from 'lucide-react';

export type AppNavItem = {
  to: string;
  label: string;
  icon?: LucideIcon;
  badgeCount?: number;
};
```

- [ ] **Step 3: Adicionar ícones aos navItems do Módulo Técnico**

No array de navItems do Técnico (onde `AppNavItem[]` é construído), importar os ícones e atribuir:

```ts
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Building2,
  Wrench,
  Kanban,
  LifeBuoy,
  UserSearch,
  KeyRound,
  BookOpen,
  Settings
} from 'lucide-react';

// Mapeamento por rota (ajustar os `to` ao array existente):
// Dashboard       → LayoutDashboard
// Calendário      → CalendarDays
// Planejamento    → ClipboardList
// Turmas          → GraduationCap
// Clientes        → Building2
// Técnicos        → Wrench
// Implementação   → Kanban
// Suporte         → LifeBuoy
// Proc. Seletivos → UserSearch
// Licenças        → KeyRound
// Documentação    → BookOpen
// Admin           → Settings
```

- [ ] **Step 4: Renderizar ícones em Layout.tsx**

Em `apps/frontend/src/components/Layout.tsx`, no bloco `navItems.map(...)`, alterar o `<NavLink>`:

```tsx
<NavLink
  key={item.to}
  to={item.to}
  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`.trim()}
>
  {item.icon ? (
    <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
  ) : null}
  <span>{item.label}</span>
  {item.badgeCount && item.badgeCount > 0 ? (
    <strong className="nav-item-alert-badge" aria-label={`${item.badgeCount} pendência(s)`}>
      {item.badgeCount > 99 ? '99+' : item.badgeCount}
    </strong>
  ) : null}
</NavLink>
```

- [ ] **Step 5: Adicionar CSS para o ícone no nav-item**

Em `apps/frontend/src/styles.css` (ou no CSS da sidebar), garantir que `.nav-item` é flex e alinha ícone + label:

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.nav-item svg {
  flex-shrink: 0;
  color: currentColor;
}
```

- [ ] **Step 6: Verificar visualmente**

Iniciar dev server e navegar para qualquer rota do Módulo Técnico. Confirmar que todos os itens de nav têm ícones Lucide visíveis, alinhados, com `strokeWidth` fino.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/auth/navigation.ts apps/frontend/src/components/Layout.tsx apps/frontend/src/styles.css
git commit -m "feat: add Lucide icons to technical module sidebar nav"
```

---

## Task 4: Componente `<PageHeader>`

**Files:**
- Create: `apps/frontend/src/shared/components/PageHeader.tsx`
- Create: `apps/frontend/src/shared/components/PageHeader.css`

- [ ] **Step 1: Criar PageHeader.css**

```css
/* apps/frontend/src/shared/components/PageHeader.css */
.page-header-shared {
  margin-bottom: var(--space-6);
}

.page-header-shared__eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: var(--space-1);
}

.page-header-shared__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.page-header-shared__description {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: var(--space-1);
  line-height: 1.5;
}

.page-header-shared__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header-shared__action {
  flex-shrink: 0;
  padding-top: 2px;
}
```

- [ ] **Step 2: Criar PageHeader.tsx**

```tsx
// apps/frontend/src/shared/components/PageHeader.tsx
import type { ReactNode } from 'react';
import './PageHeader.css';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header-shared">
      <div className="page-header-shared__row">
        <div>
          <p className="page-header-shared__eyebrow">{eyebrow}</p>
          <h1 className="page-header-shared__title">{title}</h1>
          {description ? (
            <p className="page-header-shared__description">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="page-header-shared__action">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

Esperado: sem erros TypeScript.

- [ ] **Step 4: Substituir um uso existente para validar**

No `apps/frontend/src/technical/` (ou onde estiver a primeira tela do Técnico que usa `<header className="page-header">`), importar e usar `<PageHeader>`:

```tsx
import { PageHeader } from '../../shared/components/PageHeader';

// Substituir:
// <header className="page-header">
//   <h1>Calendário</h1>
// </header>

// Por:
<PageHeader eyebrow="Gestão Técnica" title="Calendário" />
```

Navegar até a tela. Confirmar que o header renderiza com DM Sans, eyebrow em uppercase, h1 em 22px.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/shared/components/PageHeader.tsx apps/frontend/src/shared/components/PageHeader.css
git commit -m "feat: add shared PageHeader component"
```

---

## Task 5: Componente `<Panel>`

**Files:**
- Create: `apps/frontend/src/shared/components/Panel.tsx`
- Create: `apps/frontend/src/shared/components/Panel.css`

- [ ] **Step 1: Criar Panel.css**

```css
/* apps/frontend/src/shared/components/Panel.css */
.panel-shared {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-shared__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.panel-shared__header--no-divider {
  border-bottom: none;
}

.panel-shared__eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 2px;
}

.panel-shared__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.panel-shared__description {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.45;
}

.panel-shared__action {
  flex-shrink: 0;
}

.panel-shared__body {
  padding: var(--space-5);
}

.panel-shared__body--flush {
  padding: 0;
}
```

- [ ] **Step 2: Criar Panel.tsx**

```tsx
// apps/frontend/src/shared/components/Panel.tsx
import { useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './Panel.css';

type PanelProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  flush?: boolean;
  className?: string;
}>;

export function Panel({
  eyebrow,
  title,
  description,
  action,
  collapsible = false,
  defaultCollapsed = false,
  flush = false,
  className,
  children
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasHeader = eyebrow || title || description || action || collapsible;

  return (
    <section className={`panel-shared ${className ?? ''}`.trim()}>
      {hasHeader ? (
        <div className={`panel-shared__header ${!title ? 'panel-shared__header--no-divider' : ''}`.trim()}>
          <div>
            {eyebrow ? <p className="panel-shared__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="panel-shared__title">{title}</h2> : null}
            {description ? <p className="panel-shared__description">{description}</p> : null}
          </div>
          <div className="panel-shared__action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {action}
            {collapsible ? (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expandir' : 'Recolher'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-soft)', display: 'flex' }}
              >
                {collapsed
                  ? <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                  : <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
                }
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!collapsed ? (
        <div className={`panel-shared__body ${flush ? 'panel-shared__body--flush' : ''}`.trim()}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Substituir um `<Section>` do Técnico por `<Panel>`**

Encontrar um uso de `<Section>` no Módulo Técnico:

```bash
grep -rn "<Section" "apps/frontend/src/" --include="*.tsx" | head -5
```

Substituir um deles:

```tsx
import { Panel } from '../../shared/components/Panel';

// Substituir:
// <Section title="Resumo operacional">...</Section>

// Por:
<Panel title="Resumo operacional">...</Panel>
```

Navegar até a tela. Confirmar que o panel renderiza com fundo branco, borda `#e2e8f0`, border-radius correto.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/shared/components/Panel.tsx apps/frontend/src/shared/components/Panel.css
git commit -m "feat: add shared Panel component (replaces Section)"
```

---

## Task 6: Componente `<KpiCard>`

**Files:**
- Create: `apps/frontend/src/shared/components/KpiCard.tsx`
- Create: `apps/frontend/src/shared/components/KpiCard.css`

- [ ] **Step 1: Criar KpiCard.css**

```css
/* apps/frontend/src/shared/components/KpiCard.css */
.kpi-card-shared {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.kpi-card-shared__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-card-shared__value {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 22px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1;
}

.kpi-card-shared__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-1);
}

.kpi-card-shared__hint {
  font-size: 11px;
  color: var(--text-muted);
}

.kpi-card-shared__delta {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
}

.kpi-card-shared__delta--positive {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.kpi-card-shared__delta--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.kpi-card-shared__delta--critical {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.kpi-card-shared__sparkline {
  margin-top: var(--space-2);
}

/* Tons de card */
.kpi-card-shared--success { border-color: var(--color-success); }
.kpi-card-shared--warning { border-color: var(--color-warning); }
.kpi-card-shared--danger  { border-color: var(--color-danger); }

/* Link variant */
a.kpi-card-shared {
  text-decoration: none;
  transition: box-shadow var(--motion-base);
  cursor: pointer;
}
a.kpi-card-shared:hover {
  box-shadow: var(--shadow-md);
}
a.kpi-card-shared:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

- [ ] **Step 2: Criar KpiCard.tsx**

```tsx
// apps/frontend/src/shared/components/KpiCard.tsx
import type { ReactNode } from 'react';
import './KpiCard.css';

type SparklineProps = { series: number[]; accentColor?: string };

function Sparkline({ series, accentColor = 'var(--brand-ink)' }: SparklineProps) {
  const max = Math.max(...series, 1);
  const w = 80;
  const h = 28;
  const step = w / (series.length - 1);
  const points = series
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ');
  return (
    <svg
      className="kpi-card-shared__sparkline"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  accentColor?: string;
  sparkSeries?: number[];
  delta?: string;
  deltaTone?: 'positive' | 'warning' | 'critical';
  href?: string;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
  accentColor,
  sparkSeries,
  delta,
  deltaTone,
  href
}: KpiCardProps) {
  const toneClass = tone !== 'neutral' ? ` kpi-card-shared--${tone}` : '';
  const className = `kpi-card-shared${toneClass}`;

  const inner = (
    <>
      <p className="kpi-card-shared__label">{label}</p>
      <p className="kpi-card-shared__value">{value}</p>
      {sparkSeries && sparkSeries.length > 1 ? (
        <Sparkline series={sparkSeries} accentColor={accentColor} />
      ) : null}
      {(hint || delta) ? (
        <div className="kpi-card-shared__footer">
          {hint ? <span className="kpi-card-shared__hint">{hint}</span> : <span />}
          {delta ? (
            <span className={`kpi-card-shared__delta kpi-card-shared__delta--${deltaTone ?? 'positive'}`}>
              {delta}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return <a href={href} className={className}>{inner}</a>;
  }
  return <article className={className}>{inner}</article>;
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Substituir KpiCard do Técnico em um arquivo**

Encontrar onde o `KpiCard` do Técnico é usado:

```bash
grep -rn "KpiCard" "apps/frontend/src/" --include="*.tsx" | grep -v "shared" | head -5
```

Em um arquivo de dashboard do Técnico, alterar o import:

```tsx
// Antes:
import { KpiCard } from '../../components/KpiCard';

// Depois:
import { KpiCard } from '../../shared/components/KpiCard';
```

Atualizar as props: `title` → `label`, `value` permanece, `helper` → `hint`.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/shared/components/KpiCard.tsx apps/frontend/src/shared/components/KpiCard.css
git commit -m "feat: add shared KpiCard component with sparkline and delta support"
```

---

## Task 7: Componente `<DataTable>`

**Files:**
- Create: `apps/frontend/src/shared/components/DataTable.tsx`
- Create: `apps/frontend/src/shared/components/DataTable.css`

- [ ] **Step 1: Criar DataTable.css**

```css
/* apps/frontend/src/shared/components/DataTable.css */
.data-table-shared {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--text-primary);
}

.data-table-shared th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
  white-space: nowrap;
}

.data-table-shared th[data-align="right"] { text-align: right; }
.data-table-shared th[data-align="center"] { text-align: center; }

.data-table-shared th button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table-shared th button:hover { color: var(--text-secondary); }

.data-table-shared th button svg {
  color: var(--text-soft);
  flex-shrink: 0;
}

.data-table-shared th button[data-active="true"] svg {
  color: var(--text-primary);
}

.data-table-shared td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.data-table-shared td[data-align="right"] { text-align: right; }
.data-table-shared td[data-align="center"] { text-align: center; }

.data-table-shared tbody tr:hover td {
  background: var(--surface-soft);
}

.data-table-shared tbody tr:last-child td {
  border-bottom: none;
}

.data-table-shared__empty {
  text-align: center;
  color: var(--text-muted);
  padding: var(--space-8);
  font-size: 13px;
}
```

- [ ] **Step 2: Criar DataTable.tsx**

```tsx
// apps/frontend/src/shared/components/DataTable.tsx
import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import './DataTable.css';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  sortKey,
  sortDir = 'asc',
  onSort,
  emptyMessage = 'Nenhum registro encontrado.',
  loading = false
}: DataTableProps<T>) {
  return (
    <table className="data-table-shared">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} data-align={col.align ?? 'left'}>
              {col.sortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  data-active={sortKey === col.key ? 'true' : 'false'}
                >
                  {col.label}
                  {sortKey === col.key
                    ? sortDir === 'asc'
                      ? <ArrowUp size={12} strokeWidth={2} aria-hidden="true" />
                      : <ArrowDown size={12} strokeWidth={2} aria-hidden="true" />
                    : <ArrowUpDown size={12} strokeWidth={2} aria-hidden="true" />
                  }
                </button>
              ) : col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className="data-table-shared__empty">
              Carregando...
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="data-table-shared__empty">
              {emptyMessage}
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key} data-align={col.align ?? 'left'}>
                {col.render ? col.render(row) : (row[col.key] as ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/shared/components/DataTable.tsx apps/frontend/src/shared/components/DataTable.css
git commit -m "feat: add shared DataTable component with sortable columns"
```

---

## Task 8: Componente `<StatusBadge>`

**Files:**
- Create: `apps/frontend/src/shared/components/StatusBadge.tsx`
- Create: `apps/frontend/src/shared/components/StatusBadge.css`

- [ ] **Step 1: Criar StatusBadge.css**

```css
/* apps/frontend/src/shared/components/StatusBadge.css */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.status-badge--sm {
  font-size: 10px;
  padding: 2px 6px;
}

.status-badge--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}
.status-badge--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.status-badge--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}
.status-badge--info {
  background: var(--color-info-soft);
  color: var(--color-info);
}
.status-badge--neutral {
  background: var(--surface-muted);
  color: var(--text-muted);
}
```

- [ ] **Step 2: Criar StatusBadge.tsx**

```tsx
// apps/frontend/src/shared/components/StatusBadge.tsx
import type { LucideIcon } from 'lucide-react';
import './StatusBadge.css';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

type StatusBadgeProps = {
  value: string;
  tone?: Tone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
};

export function StatusBadge({ value, tone = 'neutral', icon: Icon, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone} ${size === 'sm' ? 'status-badge--sm' : ''}`.trim()}>
      {Icon ? <Icon size={10} strokeWidth={2} aria-hidden="true" /> : null}
      {value}
    </span>
  );
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Substituir um uso de StatusChip**

```bash
grep -rn "StatusChip" "apps/frontend/src/" --include="*.tsx" | head -5
```

Em um arquivo que usa `<StatusChip value={...} />`, substituir por `<StatusBadge>`. A lógica de mapeamento `statusLabel()` de `StatusChip` precisa ser replicada ao determinar o `tone`:

```tsx
import { StatusBadge } from '../../shared/components/StatusBadge';
import { statusLabel } from '../../utils/labels';

// Criar função de mapeamento status → tone (ou inline):
function tonePorStatus(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const s = status.toLowerCase();
  if (['confirmada', 'ativa', 'concluida', 'aprovada'].some(k => s.includes(k))) return 'success';
  if (['cancelada', 'reprovada', 'erro'].some(k => s.includes(k))) return 'danger';
  if (['pendente', 'em andamento', 'aguardando'].some(k => s.includes(k))) return 'warning';
  return 'neutral';
}

// Substituir:
// <StatusChip value={turma.status} />
// Por:
<StatusBadge value={statusLabel(turma.status)} tone={tonePorStatus(turma.status)} />
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/shared/components/StatusBadge.tsx apps/frontend/src/shared/components/StatusBadge.css
git commit -m "feat: add shared StatusBadge component with semantic tone"
```

---

## Task 9: Componentes de feedback — `<Toast>` e `<ConfirmDialog>`

**Files:**
- Create: `apps/frontend/src/shared/components/Toast.tsx`
- Create: `apps/frontend/src/shared/components/Toast.css`
- Create: `apps/frontend/src/shared/components/ConfirmDialog.tsx`
- Create: `apps/frontend/src/shared/components/ConfirmDialog.css`

- [ ] **Step 1: Criar Toast.css**

```css
/* apps/frontend/src/shared/components/Toast.css */
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-md);
  pointer-events: all;
  max-width: 360px;
  animation: toast-in var(--motion-base) ease-out;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.toast__icon { flex-shrink: 0; margin-top: 1px; }
.toast__body { flex: 1; }
.toast__title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.toast__message { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.toast__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: var(--text-soft);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.toast__close:hover { color: var(--text-secondary); }

.toast--success .toast__icon { color: var(--color-success); }
.toast--error   .toast__icon { color: var(--color-danger); }
.toast--warning .toast__icon { color: var(--color-warning); }
```

- [ ] **Step 2: Criar Toast.tsx (com hook useToast)**

```tsx
// apps/frontend/src/shared/components/Toast.tsx
import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

type ToastTone = 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (item: Omit<ToastItem, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = TONE_ICON[item.tone];

  useEffect(() => {
    if (item.tone !== 'error') {
      const t = setTimeout(() => onDismiss(item.id), 4000);
      return () => clearTimeout(t);
    }
  }, [item.id, item.tone, onDismiss]);

  return (
    <div className={`toast toast--${item.tone}`} role="alert" aria-live="polite">
      <span className="toast__icon">
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="toast__body">
        <p className="toast__title">{item.title}</p>
        {item.message ? <p className="toast__message">{item.message}</p> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-container" aria-label="Notificações">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 3: Criar ConfirmDialog.css**

```css
/* apps/frontend/src/shared/components/ConfirmDialog.css */
.confirm-dialog::backdrop {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
}

.confirm-dialog {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0;
  width: min(420px, 90vw);
  box-shadow: var(--shadow-lg);
  background: var(--surface);
}

.confirm-dialog__header {
  padding: var(--space-5) var(--space-5) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.confirm-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.confirm-dialog__description {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: var(--space-2);
  line-height: 1.5;
}

.confirm-dialog__body {
  padding: var(--space-4) var(--space-5);
}

.confirm-dialog__label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.confirm-dialog__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
}

.confirm-dialog__input:focus {
  border-color: var(--brand-ink);
  box-shadow: var(--focus-ring);
}

.confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
}

.confirm-dialog__btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  transition: background var(--motion-fast), color var(--motion-fast);
}

.confirm-dialog__btn:hover {
  background: var(--surface-muted);
}

.confirm-dialog__btn--danger {
  background: var(--color-danger);
  color: #fff;
  border-color: var(--color-danger);
}

.confirm-dialog__btn--danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

.confirm-dialog__btn--danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 4: Criar ConfirmDialog.tsx**

```tsx
// apps/frontend/src/shared/components/ConfirmDialog.tsx
import { useEffect, useRef, useState } from 'react';
import './ConfirmDialog.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmWord,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
      setTyped('');
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      if ((e as MouseEvent).target === el) onCancel();
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onCancel]);

  const canConfirm = !confirmWord || typed.trim() === confirmWord;

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onClose={onCancel}>
      <div className="confirm-dialog__header">
        <h2 className="confirm-dialog__title">{title}</h2>
        {description ? <p className="confirm-dialog__description">{description}</p> : null}
      </div>
      {confirmWord ? (
        <div className="confirm-dialog__body">
          <label className="confirm-dialog__label" htmlFor="confirm-word-input">
            Digite <strong>{confirmWord}</strong> para confirmar:
          </label>
          <input
            id="confirm-word-input"
            type="text"
            className="confirm-dialog__input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}
      <div className="confirm-dialog__footer">
        <button type="button" className="confirm-dialog__btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="confirm-dialog__btn confirm-dialog__btn--danger"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 5: Adicionar ToastProvider em main.tsx ou App.tsx**

Encontrar o entry point da aplicação:

```bash
grep -rn "ReactDOM.createRoot\|<App" "apps/frontend/src/main.tsx" "apps/frontend/src/App.tsx" 2>/dev/null | head -5
```

Envolver o `<App>` (ou `<RouterProvider>`) com `<ToastProvider>`:

```tsx
import { ToastProvider } from './shared/components/Toast';

// Antes:
root.render(<App />);

// Depois:
root.render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
```

- [ ] **Step 6: Verificar compilação**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/shared/components/Toast.tsx apps/frontend/src/shared/components/Toast.css apps/frontend/src/shared/components/ConfirmDialog.tsx apps/frontend/src/shared/components/ConfirmDialog.css
git commit -m "feat: add Toast and ConfirmDialog shared feedback components"
```

---

## Task 10: Hub de módulos — reescrever `/app`

**Files:**
- Modify: `apps/frontend/src/core/ModuleHubPage.tsx` (reescrever)
- Create: `apps/frontend/src/core/ModuleHubPage.css`
- Modify: `apps/frontend/src/core/modules.ts` — adicionar campo `icon` e `stat` em `PlatformModule`

- [ ] **Step 1: Adicionar campos opcionais em PlatformModule**

Em `apps/frontend/src/core/modules.ts`, alterar o tipo:

```ts
import type { LucideIcon } from 'lucide-react';

export type PlatformModule = {
  id: PlatformModuleId;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  entryPath: string;
  defaultPath: string;
  permissions: InternalPermission[];
  roles?: InternalRole[];
  accent: string;
  icon?: LucideIcon;       // ícone Lucide para o card do hub
  hubStat?: string;        // ex: "12 turmas", "R$ 284k"
  comingSoon?: boolean;    // exibe card bloqueado no hub
};
```

Atualizar `PLATFORM_MODULES` com ícones e stats:

```ts
import { CalendarCheck, TrendingUp } from 'lucide-react';

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: 'technical',
    slug: 'tecnico',
    name: 'Gestão Técnica',
    eyebrow: 'Operação',
    description: 'Clientes, turmas, agenda, técnicos, implantação, suporte e portal.',
    entryPath: TECHNICAL_BASE_PATH,
    defaultPath: `${TECHNICAL_BASE_PATH}/calendario`,
    permissions: TECHNICAL_PERMISSIONS,
    accent: '#1c8b61',
    icon: CalendarCheck,
    hubStat: '12 turmas'
  },
  {
    id: 'finance',
    slug: 'financeiro',
    name: 'Financeiro ERP',
    eyebrow: 'ERP',
    description: 'Caixa, contas, conciliação, relatórios, cadastros e simulações.',
    entryPath: FINANCE_BASE_PATH,
    defaultPath: `${FINANCE_BASE_PATH}/overview`,
    permissions: FINANCE_PERMISSIONS,
    roles: ['supremo'],
    accent: '#4f46e5',
    icon: TrendingUp,
    hubStat: 'R$ 284k'
  }
];
```

- [ ] **Step 2: Criar ModuleHubPage.css**

```css
/* apps/frontend/src/core/ModuleHubPage.css */
.hub {
  min-height: 100vh;
  background: var(--canvas);
  font-family: 'DM Sans', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ───────────────────────────────── */
.hub-topbar {
  height: 52px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  flex-shrink: 0;
}

.hub-topbar__logo img {
  height: 26px;
  width: auto;
  display: block;
}

.hub-topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.hub-topbar__date {
  font-size: 11px;
  color: var(--text-soft);
}

.hub-topbar__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.hub-topbar__avatar {
  width: 30px;
  height: 30px;
  background: var(--brand-ink);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-accent);
  letter-spacing: 0.02em;
}

/* ── Body ─────────────────────────────────── */
.hub-body {
  flex: 1;
  padding: var(--space-7) var(--space-6) var(--space-8);
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.hub-body__eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: var(--space-1);
}

.hub-body__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.025em;
  margin-bottom: var(--space-6);
}

/* ── Module grid ──────────────────────────── */
.hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.hub-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 16px 14px;
  position: relative;
  cursor: pointer;
  transition: box-shadow var(--motion-base);
  text-decoration: none;
  display: block;
  color: inherit;
}

.hub-card:hover { box-shadow: var(--shadow-md); }
.hub-card:focus-visible { outline: none; box-shadow: var(--focus-ring); }

.hub-card--active { border-color: var(--brand-ink); }
.hub-card--locked { opacity: 0.5; cursor: default; pointer-events: none; }

.hub-card__arrow {
  position: absolute;
  top: 16px;
  right: 16px;
  color: var(--border-strong);
}
.hub-card--active .hub-card__arrow { color: var(--brand-ink); }

.hub-card__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  color: var(--brand-ink);
}

.hub-card--locked .hub-card__icon-wrap { color: var(--text-soft); }

.hub-card__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 5px;
  letter-spacing: -0.01em;
}

.hub-card__desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.45;
  margin-bottom: 14px;
}

.hub-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hub-card__badge {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--color-success-soft);
  color: var(--color-success);
}

.hub-card__badge--locked {
  background: var(--surface-muted);
  color: var(--text-soft);
}

.hub-card__stat {
  font-size: 10px;
  color: var(--text-soft);
  font-family: 'DM Mono', monospace;
}

/* ── Strip ────────────────────────────────── */
.hub-strip {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: var(--space-3) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.hub-strip__metrics {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.hub-strip__metric {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.hub-strip__metric svg {
  color: var(--text-soft);
  flex-shrink: 0;
}

.hub-strip__metric strong {
  color: var(--text-primary);
  font-family: 'DM Mono', monospace;
  font-size: 12px;
}

.hub-strip__logout {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--text-soft);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.hub-strip__logout:hover { color: var(--text-secondary); }
```

- [ ] **Step 3: Reescrever ModuleHubPage.tsx**

```tsx
// apps/frontend/src/core/ModuleHubPage.tsx
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Users, CreditCard } from 'lucide-react';
import prymeiraLogo from '../assets/prymeira-logo.png';
import type { InternalSessionUser } from '../auth/session';
import { visibleModulesForUser, PLATFORM_MODULES, canAccessModule } from './modules';
import './ModuleHubPage.css';

type ModuleHubPageProps = {
  user: InternalSessionUser;
  onLogout: () => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function ModuleHubPage({ user, onLogout }: ModuleHubPageProps) {
  const userLabel = user.display_name || user.username;
  const accessibleModules = visibleModulesForUser(user);
  const accessibleIds = new Set(accessibleModules.map((m) => m.id));

  const todayLong = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const todayShort = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="hub">
      <header className="hub-topbar">
        <div className="hub-topbar__logo">
          <Link to="/app" aria-label="Prymeira — módulos">
            <img src={prymeiraLogo} alt="Prymeira" />
          </Link>
        </div>
        <div className="hub-topbar__right">
          <span className="hub-topbar__date">{todayShort}</span>
          <div className="hub-topbar__user">
            <div className="hub-topbar__avatar" aria-hidden="true">
              {initials(userLabel)}
            </div>
            <span>{userLabel}</span>
          </div>
        </div>
      </header>

      <main className="hub-body">
        <p className="hub-body__eyebrow">{todayLong}</p>
        <h1 className="hub-body__title">Seus módulos ativos</h1>

        <section className="hub-grid" aria-label="Módulos da plataforma">
          {PLATFORM_MODULES.map((mod) => {
            const accessible = accessibleIds.has(mod.id);
            const locked = mod.comingSoon || !accessible;
            const Icon = mod.icon;

            const cardInner = (
              <>
                <div className="hub-card__arrow" aria-hidden="true">
                  {locked
                    ? <Lock size={13} strokeWidth={1.75} />
                    : <ArrowRight size={14} strokeWidth={2} />
                  }
                </div>
                <div className="hub-card__icon-wrap">
                  {Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
                </div>
                <p className="hub-card__name">{mod.name}</p>
                <p className="hub-card__desc">{mod.description}</p>
                <div className="hub-card__footer">
                  <span className={`hub-card__badge ${locked ? 'hub-card__badge--locked' : ''}`.trim()}>
                    {locked ? (mod.comingSoon ? 'Em breve' : 'Sem acesso') : 'Ativo'}
                  </span>
                  {mod.hubStat && !locked ? (
                    <span className="hub-card__stat">{mod.hubStat}</span>
                  ) : null}
                </div>
              </>
            );

            if (!locked) {
              return (
                <Link
                  key={mod.id}
                  to={mod.entryPath}
                  className="hub-card hub-card--active"
                  aria-label={`Abrir ${mod.name}`}
                >
                  {cardInner}
                </Link>
              );
            }

            return (
              <div key={mod.id} className="hub-card hub-card--locked" aria-label={mod.name}>
                {cardInner}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="hub-strip">
        <div className="hub-strip__metrics">
          <div className="hub-strip__metric">
            <Users size={13} strokeWidth={1.75} aria-hidden="true" />
            <span><strong>4</strong> técnicos em agenda hoje</span>
          </div>
          <div className="hub-strip__metric">
            <CreditCard size={13} strokeWidth={1.75} aria-hidden="true" />
            <span><strong>R$ 4.800</strong> a receber esta semana</span>
          </div>
        </div>
        <button type="button" className="hub-strip__logout" onClick={onLogout}>
          Sair
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Verificar compilação e abrir o hub**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -20
```

Iniciar dev server, navegar até `http://localhost:5173/app`. Verificar: logo PNG, cards com ícones Lucide, cards bloqueados com opacity, strip inferior.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/core/modules.ts apps/frontend/src/core/ModuleHubPage.tsx apps/frontend/src/core/ModuleHubPage.css
git commit -m "feat: redesign ModuleHub page with Lucide icons, locked cards, and metrics strip"
```

---

## Task 11: Skeleton loading

**Files:**
- Create: `apps/frontend/src/shared/components/Skeleton.tsx`
- Create: `apps/frontend/src/shared/components/Skeleton.css`

- [ ] **Step 1: Criar Skeleton.css**

```css
/* apps/frontend/src/shared/components/Skeleton.css */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

.skeleton-block {
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
  display: block;
}
```

- [ ] **Step 2: Criar Skeleton.tsx**

```tsx
// apps/frontend/src/shared/components/Skeleton.tsx
import './Skeleton.css';

type SkeletonBlockProps = {
  height?: number | string;
  width?: number | string;
  className?: string;
};

export function SkeletonBlock({ height = 16, width = '100%', className }: SkeletonBlockProps) {
  return (
    <span
      className={`skeleton-block ${className ?? ''}`.trim()}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: typeof width === 'number' ? `${width}px` : width }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 3: Usar skeleton em uma tela do Técnico**

Encontrar uma tela que exibe `<p>Carregando...</p>`:

```bash
grep -rn "Carregando" "apps/frontend/src/" --include="*.tsx" | head -5
```

Substituir:

```tsx
import { SkeletonBlock } from '../../shared/components/Skeleton';

// Antes:
if (loading) return <p>Carregando...</p>;

// Depois:
if (loading) return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <SkeletonBlock height={20} width="40%" />
    <SkeletonBlock height={80} />
    <SkeletonBlock height={80} />
    <SkeletonBlock height={80} />
  </div>
);
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/shared/components/Skeleton.tsx apps/frontend/src/shared/components/Skeleton.css
git commit -m "feat: add SkeletonBlock component for loading states"
```

---

## Task 12: Migrar sidebar do Financeiro para Lucide

**Files:**
- Modify: `apps/frontend/src/finance/components/FinanceSidebar.tsx`

- [ ] **Step 1: Mapear os ícones existentes**

A `FinanceSidebar.tsx` usa `NavigationGlyph` com SVGs inline para os routes:
`overview`, `transactions`, `receivables`, `payables`, `reconciliation`, `cashflow`, `reports`, `cadastros`, `simulation`, `advanced`

Mapeamento para Lucide:

| Rota | Ícone Lucide |
|---|---|
| overview | `LayoutGrid` |
| transactions | `ArrowLeftRight` |
| receivables | `ArrowDownToLine` |
| payables | `ArrowUpFromLine` |
| reconciliation | `GitCompare` |
| cashflow | `BarChart3` |
| reports | `FileText` |
| cadastros | `Database` |
| simulation | `Calculator` |
| advanced | `Settings2` |

- [ ] **Step 2: Substituir NavigationGlyph por ícones Lucide em FinanceSidebar.tsx**

```tsx
import {
  LayoutGrid,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  GitCompare,
  BarChart3,
  FileText,
  Database,
  Calculator,
  Settings2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  transactions: ArrowLeftRight,
  receivables: ArrowDownToLine,
  payables: ArrowUpFromLine,
  reconciliation: GitCompare,
  cashflow: BarChart3,
  reports: FileText,
  cadastros: Database,
  simulation: Calculator,
  advanced: Settings2
};

// Substituir o componente NavigationGlyph por:
function NavigationGlyph({ name }: { name: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
}
```

Remover todo o switch/case de SVGs inline.

- [ ] **Step 3: Verificar visualmente o módulo financeiro**

Iniciar dev server e navegar para `http://localhost:5173/m/financeiro`. Verificar que todos os itens da sidebar têm ícones Lucide, mesma aparência visual da sidebar técnica.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/finance/components/FinanceSidebar.tsx
git commit -m "feat: migrate FinanceSidebar icons from inline SVG to Lucide"
```

---

## Task 13: Criar index.ts de re-exportação e limpar

**Files:**
- Create: `apps/frontend/src/shared/components/index.ts`

- [ ] **Step 1: Criar o barrel de exportações**

```ts
// apps/frontend/src/shared/components/index.ts
export { PageHeader } from './PageHeader';
export { Panel } from './Panel';
export { KpiCard } from './KpiCard';
export { DataTable } from './DataTable';
export type { DataTableColumn } from './DataTable';
export { StatusBadge } from './StatusBadge';
export { Toast, ToastProvider, useToast } from './Toast';
export { ConfirmDialog } from './ConfirmDialog';
export { SkeletonBlock } from './Skeleton';
```

- [ ] **Step 2: Verificar compilação final**

```bash
cd "apps/frontend" && npm run build 2>&1 | tail -30
```

Confirmar zero erros TypeScript.

- [ ] **Step 3: Commit final**

```bash
git add apps/frontend/src/shared/components/index.ts
git commit -m "feat: add shared components barrel export"
```

---

## Checklist de cobertura da spec

- [x] `shared/tokens.css` com paleta, tipografia, espaçamento, movimento, shadows, radius — Task 1
- [x] Google Fonts import DM Sans + DM Mono — Task 1 (via tokens.css)
- [x] `body` → DM Sans, background → `var(--canvas)` — Task 1
- [x] `lucide-react` instalado — Task 2
- [x] Ícones na sidebar do Técnico — Task 3
- [x] `<PageHeader>` compartilhado — Task 4
- [x] `<Panel>` compartilhado — Task 5
- [x] `<KpiCard>` com sparkline, delta, tone — Task 6
- [x] `<DataTable>` com sort — Task 7
- [x] `<StatusBadge>` com tone — Task 8
- [x] `<Toast>` com ToastProvider + useToast — Task 9
- [x] `<ConfirmDialog>` com campo de confirmação — Task 9
- [x] Hub `/app` — Concept A, logo PNG, ícones Lucide, strip de métricas — Task 10
- [x] Skeleton loading — Task 11
- [x] Sidebar financeiro → Lucide (passo 10 da spec) — Task 12
- [x] finance-shell.css importa tokens — Task 1 (Step 3)
