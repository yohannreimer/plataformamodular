# Design System — Adoção nos Módulos (Fase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar as divergências visuais residuais identificadas na auditoria pós-migração: Inter nos headings do Técnico, acento laranja no Financeiro, tokens legados no CSS da sidebar, sidebar com tamanhos e cores diferentes, e adoção dos shared components (KpiCard, Panel, StatusBadge) nas páginas do Módulo Técnico.

**Architecture:** Mudanças em cascata da mais simples para a mais estrutural: CSS primeiro (impacto imediato sem risco de regressão), depois substituição de componentes página por página. Nenhuma mudança em lógica de negócio ou API.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Lucide React

---

## Mapeamento de arquivos

### Modificar
- `apps/frontend/src/styles.css` — remover Inter override, limpar tokens legados, unificar sidebar
- `apps/frontend/src/finance/finance-shell.css` — corrigir accent color, active state
- `apps/frontend/src/finance/finance-pages.css` — corrigir `--finance-accent`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/TechniciansPage.tsx`
- `apps/frontend/src/pages/CalendarPage.tsx`
- `apps/frontend/src/pages/CohortsPage.tsx`
- `apps/frontend/src/pages/CohortDetailPage.tsx`
- `apps/frontend/src/pages/ClientsPage.tsx`
- `apps/frontend/src/pages/ClientDetailPage.tsx`
- `apps/frontend/src/pages/AdminPage.tsx`
- `apps/frontend/src/pages/ImplementationPage.tsx`
- `apps/frontend/src/pages/LicensesPage.tsx`
- `apps/frontend/src/pages/LicenseProgramsPage.tsx`
- `apps/frontend/src/pages/InternalDocsPage.tsx`
- `apps/frontend/src/pages/RecruitmentPage.tsx`

### Não modificar
- Lógica de API, estado, rotas, permissões
- `apps/frontend/src/finance/components/FinancePrimitives.tsx` — muito acoplado, migrar depois
- `apps/frontend/src/components/KpiCard.tsx`, `Section.tsx`, `StatusChip.tsx` — não deletar (ainda usados pelos testes)

---

## Task 1: Remover Inter dos headings + limpar tipografia legada

**Files:**
- Modify: `apps/frontend/src/styles.css`

Este é o gap de maior impacto visual imediato. Um bloco de CSS faz todos os títulos do Módulo Técnico renderizarem em Inter em vez de DM Sans.

- [ ] **Step 1: Remover o bloco de override Inter**

Em `apps/frontend/src/styles.css`, localizar e remover completamente o bloco das linhas 69–79:

```css
/* REMOVER ESTE BLOCO INTEIRO: */
h1, h2, h3, h4, h5, h6,
.workspace-topbar-copy strong,
.panel-header h2,
.kpi-card strong,
.mini-stat strong,
.month-title,
.calendar-day-number,
.kanban-column-header h2,
.kanban-detail-header h2 {
  font-family: 'Inter', 'Avenir Next', sans-serif;
}
```

Após a remoção, todos esses elementos herdam DM Sans do `body` definido em `shared/tokens.css`.

- [ ] **Step 2: Verificar Manrope residual**

```bash
grep -n "Manrope\|manrope" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/styles.css"
```

Para cada ocorrência encontrada, substituir `'Manrope'` por `'DM Sans'`.

- [ ] **Step 3: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in X.XXs` sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/styles.css
git commit -m "fix: remove Inter override on headings, DM Sans now consistent in Technical module"
```

---

## Task 2: Corrigir tokens legados e sidebar do Módulo Técnico

**Files:**
- Modify: `apps/frontend/src/styles.css`

Substituir tokens legados (`--ink`, `--ink-soft`, `--line`) e hardcodes de cor por tokens do design system. Unificar sidebar com o padrão do Financeiro: largura 224px, fundo sólido, sem blur, cores de item alinhadas.

- [ ] **Step 1: Corrigir a coluna do grid (250px → 224px)**

Em `styles.css`, localizar:
```css
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
}
```

Substituir por:
```css
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
}
```

- [ ] **Step 2: Corrigir sidebar — fundo, padding e borda**

Localizar o bloco `.sidebar { ... }`:
```css
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  color: var(--ink);
  padding: 18px 14px;
  border-right: 1px solid #d5dadd;
}
```

Substituir por:
```css
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: var(--surface);
  color: var(--text-primary);
  padding: 20px 8px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 3: Corrigir logo na sidebar**

Localizar o bloco `.logo { ... }`:
```css
.logo {
  color: var(--brand-ink);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.15px;
  text-decoration: none;
  margin-bottom: 14px;
  display: grid;
  gap: 6px;
  padding: 10px 10px;
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f7f8f9 100%);
  border: 1px solid #d8dde1;
}
```

Substituir por:
```css
.logo {
  color: var(--text-primary);
  text-decoration: none;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  flex-shrink: 0;
}
```

Localizar `.logo small { ... }` e substituir `color: var(--ink-soft)` por `color: var(--text-muted)`.

- [ ] **Step 4: Corrigir nav-item — tamanho, peso, cor, active state**

Localizar o bloco `.nav-item { ... }`:
```css
.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #425160;
  text-decoration: none;
  padding: 9px 10px;
  border-radius: 9px;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 0.92rem;
  border: 1px solid transparent;
}
```

Substituir por:
```css
.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 1px;
  font-weight: 400;
  font-size: 13px;
  border: none;
  width: 100%;
  transition: background-color var(--motion-fast), color var(--motion-fast);
}
```

Localizar `.nav-item.active, .nav-item:hover { ... }`:
```css
.nav-item.active,
.nav-item:hover {
  background: #f6f0ef;
  color: #212d36;
  border-color: #e9d2ce;
}
```

Substituir por:
```css
.nav-item:hover {
  background: var(--surface-muted);
  color: var(--text-secondary);
}

.nav-item.active {
  background: var(--surface-muted);
  color: var(--brand-ink);
  font-weight: 600;
}
```

- [ ] **Step 5: Corrigir sidebar-auth (tokens legados)**

Localizar `.sidebar-auth { ... }` e `.sidebar-auth small`:

```css
/* Substituir: */
.sidebar-auth {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);   /* legado */
  ...
}
.sidebar-auth small {
  color: var(--ink-soft);   /* legado */
}
```

Por:
```css
.sidebar-auth {
  margin-top: auto;
  padding: 12px 8px 0;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 8px;
}
.sidebar-auth small {
  color: var(--text-muted);
}
```

- [ ] **Step 6: Corrigir topbar — fundo, blur e border**

Localizar `.workspace-topbar { ... }`:
```css
.workspace-topbar {
  ...
  border-bottom: 1px solid #d6dbe0;
  background: rgba(247, 249, 250, 0.9);
  backdrop-filter: blur(10px);
}
```

Substituir as três linhas:
```css
  border-bottom: 1px solid var(--border);
  background: var(--surface);
```
(Remover `backdrop-filter: blur(10px)` — sem blur na topbar)

- [ ] **Step 7: Corrigir topbar-copy — tokens legados**

Localizar `.workspace-topbar-copy span { color: var(--ink-soft) }` e substituir por `color: var(--text-muted)`.

- [ ] **Step 8: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -5
```

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/styles.css
git commit -m "fix: unify Technical sidebar with Financial — 224px, solid bg, token-aligned colors"
```

---

## Task 3: Corrigir acento laranja no Módulo Financeiro

**Files:**
- Modify: `apps/frontend/src/finance/finance-pages.css`
- Modify: `apps/frontend/src/finance/finance-shell.css`

`--finance-accent: #ea580c` (laranja) é a divergência de cor mais visível. A cor de ação principal da plataforma é `--brand-ink: #1d2830`. O Financeiro vai adotar ink como cor primária de ação — consistente com o Técnico e o Hub.

- [ ] **Step 1: Alterar --finance-accent em finance-pages.css**

Em `apps/frontend/src/finance/finance-pages.css`, localizar:
```css
--finance-accent: #ea580c;
```

Substituir por:
```css
--finance-accent: #1d2830;
```

- [ ] **Step 2: Corrigir active state da sidebar financeira**

Em `apps/frontend/src/finance/finance-shell.css`, localizar:
```css
.finance-shell .nav-item.active {
  background: #dbeafe;
  color: var(--finance-accent, #ea580c);
  font-weight: 600;
}
```

Substituir por:
```css
.finance-shell .nav-item.active {
  background: var(--surface-muted, #f1f5f9);
  color: var(--brand-ink, #1d2830);
  font-weight: 600;
}
```

Localizar também:
```css
.finance-shell .nav-item.active .finance-sidebar__nav-icon {
  color: var(--finance-accent, #ea580c);
  opacity: 1;
}
```

Substituir por:
```css
.finance-shell .nav-item.active .finance-sidebar__nav-icon {
  color: var(--brand-ink, #1d2830);
  opacity: 1;
}
```

- [ ] **Step 3: Corrigir eyebrow do sidebar financeiro**

Em `apps/frontend/src/finance/finance-shell.css`, localizar:
```css
.finance-sidebar__eyebrow,
.finance-sidebar__label {
  ...
  color: var(--finance-accent, #ea580c);
  ...
}
```

Substituir `color: var(--finance-accent, #ea580c)` por `color: var(--text-soft, #94a3b8)`.

- [ ] **Step 4: Verificar usos de --finance-accent restantes**

```bash
grep -n "finance-accent\|#ea580c" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/finance/finance-pages.css" | head -20
```

Para cada ocorrência onde `--finance-accent` aparece como cor de texto de destaque ou highlight, avaliar se deve virar `var(--brand-ink)` (ações) ou `var(--color-warning)` (alertas financeiros). Não alterar ocorrências em `sparkline` do `FinanceKpiGrid` (cor proprietária OK para gráficos).

- [ ] **Step 5: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/finance/finance-pages.css apps/frontend/src/finance/finance-shell.css
git commit -m "fix: replace finance orange accent (#ea580c) with brand-ink (#1d2830)"
```

---

## Task 4: Migrar KpiCard legado → shared em todas as páginas do Técnico

**Files:**
- Modify: todos os arquivos em `apps/frontend/src/pages/` que importam `KpiCard` de `'../components/KpiCard'`

O KpiCard legado tem 3 props: `{ title, value, helper }`.
O shared KpiCard tem: `{ label, value, hint, tone, sparkSeries, delta, deltaTone, href }`.
Migration map: `title` → `label`, `helper` → `hint`. `value` permanece igual.

- [ ] **Step 1: Identificar todos os arquivos**

```bash
grep -rl "from '../components/KpiCard'" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/pages/"
```

- [ ] **Step 2: Em cada arquivo encontrado, substituir import**

Para cada arquivo, alterar:
```tsx
import { KpiCard } from '../components/KpiCard';
```
Por:
```tsx
import { KpiCard } from '../shared/components';
```

- [ ] **Step 3: Atualizar props em cada uso**

Para cada `<KpiCard title={x} value={y} helper={z} />`, substituir por:
```tsx
<KpiCard label={x} value={y} hint={z} />
```

Se não tiver `helper`, apenas mudar `title` → `label`.

Exemplo em `DashboardPage.tsx` (ajuste ao que encontrar no arquivo):
```tsx
// Antes:
<KpiCard title="Turmas ativas" value={data.active_cohorts} />
<KpiCard title="Técnicos" value={data.technicians} helper="em agenda hoje" />

// Depois:
<KpiCard label="Turmas ativas" value={data.active_cohorts} />
<KpiCard label="Técnicos" value={data.technicians} hint="em agenda hoje" />
```

- [ ] **Step 4: Verificar build com TypeScript**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | grep -E "error|warning|✓"
```

Se aparecer erro de prop desconhecida (`title` não existe no tipo), confirmar que todos os usos foram atualizados.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/
git commit -m "feat: migrate KpiCard to shared component across all Technical module pages"
```

---

## Task 5: Migrar Section legado → Panel shared em todas as páginas do Técnico

**Files:**
- Modify: todos os arquivos em `apps/frontend/src/pages/` que importam `Section` de `'../components/Section'`

As props são compatíveis: `Section` tem `{ title, action, children, className }`. `Panel` tem `{ title, action, children, className, eyebrow, description, collapsible, flush }`. Migração direta sem mudança nas props.

- [ ] **Step 1: Identificar todos os arquivos**

```bash
grep -rl "from '../components/Section'" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/pages/"
```

- [ ] **Step 2: Em cada arquivo, substituir import**

```tsx
// Antes:
import { Section } from '../components/Section';

// Depois:
import { Panel } from '../shared/components';
```

- [ ] **Step 3: Renomear o componente em cada uso**

Substituir todas as ocorrências de `<Section ` por `<Panel ` e `</Section>` por `</Panel>` em cada arquivo afetado.

Em alguns arquivos pode ter `<Section title="..." action={...}>`. Manter as props como estão — `Panel` aceita as mesmas.

- [ ] **Step 4: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/
git commit -m "feat: migrate Section to shared Panel component across Technical module pages"
```

---

## Task 6: Migrar StatusChip → StatusBadge shared em todas as páginas do Técnico

**Files:**
- Modify: todos os arquivos em `apps/frontend/src/pages/` que importam `StatusChip`
- Modify: `apps/frontend/src/utils/labels.ts` (para reutilizar `statusLabel`)

`StatusChip` recebe `{ value: string }` e infere cor via CSS class.
`StatusBadge` recebe `{ value: string, tone: Tone }` — precisa de mapeamento de status → tone.

- [ ] **Step 1: Identificar arquivos**

```bash
grep -rl "StatusChip" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/pages/"
```

- [ ] **Step 2: Criar função de mapeamento em utils/labels.ts**

Abrir `apps/frontend/src/utils/labels.ts`. Adicionar ao final do arquivo:

```ts
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export function statusTone(raw: string | null | undefined): StatusTone {
  const s = (raw ?? '').toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (/confirmad|ativ|concluíd|concluido|aprovad|encerrad/.test(s)) return 'success';
  if (/cancelad|reprovad|erro|falh/.test(s)) return 'danger';
  if (/pendente|aguardando|em andamento|rascunho|parcial/.test(s)) return 'warning';
  if (/informac|info/.test(s)) return 'info';
  return 'neutral';
}
```

- [ ] **Step 3: Em cada arquivo, substituir import e uso**

```tsx
// Antes:
import { StatusChip } from '../components/StatusChip';

// Depois:
import { StatusBadge } from '../shared/components';
import { statusLabel, statusTone } from '../utils/labels';
```

Substituir cada uso:
```tsx
// Antes:
<StatusChip value={item.status} />

// Depois:
<StatusBadge value={statusLabel(item.status)} tone={statusTone(item.status)} />
```

- [ ] **Step 4: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -8
```

Se TypeScript reclamar de `statusTone` não encontrado, confirmar o export em `utils/labels.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/ apps/frontend/src/utils/labels.ts
git commit -m "feat: migrate StatusChip to shared StatusBadge with semantic tone mapping"
```

---

## Task 7: Limpar tokens legados residuais no CSS do workspace

**Files:**
- Modify: `apps/frontend/src/styles.css`

Após as tasks anteriores, `--ink`, `--ink-soft` e `--line` podem ainda aparecer em outros lugares do CSS. Esta task limpa o restante.

- [ ] **Step 1: Listar ocorrências restantes**

```bash
grep -n "var(--ink\|var(--line\|var(--bg-0\|var(--bg-1\|var(--bg-2\|0\.92rem\|Avenir Next" "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/styles.css"
```

- [ ] **Step 2: Substituir token por token**

Para cada ocorrência, usar o mapeamento:

| Token legado | Token novo |
|---|---|
| `var(--ink)` | `var(--text-primary)` |
| `var(--ink-soft)` | `var(--text-muted)` |
| `var(--line)` | `var(--border)` |
| `var(--line-strong)` | `var(--border-strong)` |
| `var(--bg-0)` | `var(--canvas)` |
| `var(--bg-1)` | `var(--canvas)` |
| `var(--bg-2)` | `var(--surface-muted)` |
| `'Avenir Next'` | remover da lista de fallback |

- [ ] **Step 3: Verificar build**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/styles.css
git commit -m "refactor: replace legacy CSS tokens (--ink, --line) with shared design tokens"
```

---

## Task 8: Verificação visual final + build limpo

**Files:**
- Nenhum arquivo novo

- [ ] **Step 1: Build limpo final**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm run build 2>&1
```

Confirmar: zero erros TypeScript, `✓ built in X.XXs`.

- [ ] **Step 2: Rodar testes**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend" && npm test 2>&1 | tail -20
```

Se algum teste falhar por causa de mudança de prop (`title` → `label` no KpiCard), atualizar o test fixture.

- [ ] **Step 3: Checklist visual (abrir no browser)**

Ao logar no app, verificar:
- [ ] Hub `/app` — logo PNG, cards ink, strip
- [ ] Módulo Técnico `/m/tecnico/calendario` — sidebar 224px, fundo sólido, ícones Lucide, nav ativo ink
- [ ] Módulo Financeiro `/m/financeiro/overview` — sidebar sem laranja, eyebrow slate, nav ativo ink
- [ ] Títulos de página no Técnico renderizam em DM Sans (não Inter)
- [ ] Cards KpiCard com fundo branco, border token, layout correto
- [ ] Painéis Panel com cabeçalho fino, border-radius 14px

- [ ] **Step 4: Commit final de summary**

```bash
git add -A
git commit -m "feat: complete design system adoption — unified typography, tokens, sidebar, and shared components"
```

---

## Checklist de cobertura da auditoria

- [x] Inter override nos headings do Técnico — Task 1
- [x] Manrope residual — Task 1
- [x] Tokens legados (--ink, --line) na sidebar — Tasks 2 e 7
- [x] Sidebar 250px → 224px — Task 2
- [x] Sidebar: fundo blur → sólido — Task 2
- [x] Nav-item: cores, peso, tamanho alinhados — Task 2
- [x] Topbar: fundo e border tokenizados — Task 2
- [x] --finance-accent laranja → brand-ink — Task 3
- [x] Sidebar financeira: active state ink — Task 3
- [x] Eyebrow financeiro: laranja → text-soft — Task 3
- [x] KpiCard legado (3 props) → shared (label/hint/tone) — Task 4
- [x] Section → Panel shared — Task 5
- [x] StatusChip → StatusBadge shared — Task 6
