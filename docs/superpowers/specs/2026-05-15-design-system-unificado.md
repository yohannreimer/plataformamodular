# Design System Unificado — Plataforma Prymeira

**Data:** 2026-05-15  
**Status:** Aprovado para implementação  
**Escopo:** Módulo Técnico + Módulo Financeiro + Hub de módulos + base para módulos futuros

---

## Contexto e decisões tomadas

A plataforma é vendida em módulos separados, mas precisa parecer um produto coeso. O Módulo Financeiro está visualmente mais maduro (DM Sans, ícones SVG, skeleton loading, componentes ricos). O Módulo Técnico herda de um app-mãe e usa Inter, sem ícones na sidebar, sem skeleton, componentes simples.

**Direção aprovada:** o Módulo Técnico evolui para o nível do Financeiro. Nenhum módulo é descartado — os componentes existentes do Financeiro são o padrão de referência.

**Fluxo de sync com app-mãe:** mudanças de design são seguras. O operador controla o sync e instrui explicitamente a trazer apenas funções, sem tocar em design.

---

## 1. Tokens de design

Arquivo a criar: `apps/frontend/src/shared/tokens.css`  
Importado por ambos os módulos como primeira linha de seus CSS principais.

### 1.1 Paleta

```css
:root {
  /* ── Brand ────────────────────────────── */
  --brand-ink:        #1d2830;   /* ação primária: botões, nav ativo, borders fortes */
  --brand-accent:     #F5B700;   /* ênfase pontual: badges, dots, highlights */
  --brand-accent-soft:#FFF8DB;   /* fundo de elementos com acento amarelo */

  /* ── Superfícies ──────────────────────── */
  --canvas:           #f1f5f9;   /* fundo de página (slate-100) */
  --surface:          #ffffff;   /* cards, painéis, sidebar */
  --surface-soft:     #f8fafc;   /* fundo alternativo dentro de cards */
  --surface-muted:    #f1f5f9;   /* áreas de baixa ênfase */

  /* ── Texto ────────────────────────────── */
  --text-primary:     #0f172a;   /* títulos, valores, conteúdo principal */
  --text-secondary:   #475569;   /* labels, subtítulos */
  --text-muted:       #64748b;   /* hints, metadados, placeholders */
  --text-soft:        #94a3b8;   /* texto muito secundário, ícones inativos */

  /* ── Bordas ───────────────────────────── */
  --border:           #e2e8f0;   /* borda padrão */
  --border-strong:    #cbd5e1;   /* borda com mais presença */

  /* ── Semânticas ───────────────────────── */
  --color-success:    #059669;
  --color-success-soft: #dcfce7;
  --color-danger:     #dc2626;
  --color-danger-soft: #fee2e2;
  --color-warning:    #d97706;
  --color-warning-soft: #fffbeb;
  --color-info:       #2563eb;
  --color-info-soft:  #dbeafe;

  /* ── Radius ───────────────────────────── */
  --radius-sm:        7px;
  --radius-md:        10px;
  --radius-lg:        14px;
  --radius-xl:        16px;

  /* ── Sombras ──────────────────────────── */
  --shadow-none:      none;
  --shadow-soft:      0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md:        0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04);
  --shadow-lg:        0 12px 32px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.06);

  /* ── Espaçamento ──────────────────────── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-7:  28px;
  --space-8:  32px;

  /* ── Movimento ────────────────────────── */
  --motion-fast:  120ms ease-out;
  --motion-base:  180ms ease-out;
  --motion-slow:  280ms ease-out;

  /* ── Focus ────────────────────────────── */
  --focus-ring: 0 0 0 3px rgba(29, 40, 48, 0.18);
}
```

### 1.2 Tipografia

**Família principal:** DM Sans (opsz 9–40, pesos 300–800)  
**Família numérica/mono:** DM Mono (pesos 400, 500)

```css
/* Import no index.html ou no tokens.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..800&family=DM+Mono:wght@400;500&display=swap');

body {
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  background: var(--canvas);
}

/* Classe utilitária para valores numéricos */
.mono {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

**Escala tipográfica:**

| Uso | Tamanho | Peso | Tracking |
|---|---|---|---|
| `h1` — título de página | 22px | 700 | -0.025em |
| `h2` — título de painel | 16px | 700 | -0.02em |
| `h3` — título de seção | 14px | 600 | -0.01em |
| Body | 13px | 400 | 0 |
| Body small | 12px | 400 | 0 |
| Label | 11px | 500 | 0 |
| Eyebrow | 9–10px | 700 | 0.08–0.12em uppercase |
| Mono (valores) | 13–20px | 400–500 | -0.01em |

---

## 2. Biblioteca de ícones

**Biblioteca:** Lucide React  
**Instalação:** `npm i lucide-react` no workspace `apps/frontend`

**Regras de uso:**
- Tamanho padrão: `size={16}` em listas e tabelas, `size={18}` em cards e headers
- `strokeWidth={1.75}` em todos os ícones (padrão do Lucide é 2, mas 1.75 fica mais elegante em DM Sans)
- Cor via `currentColor` — nunca hardcoded
- Sempre com `aria-hidden="true"` quando decorativo

**Ícones para a sidebar do Módulo Técnico** (equivalentes aos já existentes no Financeiro):

| Rota | Ícone Lucide |
|---|---|
| Dashboard | `LayoutDashboard` |
| Calendário | `CalendarDays` |
| Planejamento | `ClipboardList` |
| Turmas | `GraduationCap` |
| Clientes | `Building2` |
| Técnicos | `Wrench` |
| Implementação | `Kanban` |
| Suporte | `LifeBuoy` |
| Processos Seletivos | `UserSearch` |
| Licenças | `KeyRound` |
| Documentação | `BookOpen` |
| Admin | `Settings` |

---

## 3. Componentes compartilhados

Pasta a criar: `apps/frontend/src/shared/components/`  
Estes componentes substituem as variantes divergentes existentes nos dois módulos.

### 3.1 `<PageHeader>`

Substitui o `<header className="page-header">` do Técnico e o `<FinancePageHeader>` do Financeiro.

```tsx
// Props
{
  eyebrow: string          // "Dashboard operacional"
  title: string            // "Turmas"
  description?: string     // linha de suporte opcional
  action?: ReactNode       // slot para filtro ou botão à direita
}
```

Estrutura visual: eyebrow em uppercase 9px muted → h1 22px → description 13px muted. Ação alinhada ao topo direito.

### 3.2 `<Panel>`

Substitui o `<Section>` do Técnico e o `<FinancePanel>` do Financeiro.

```tsx
{
  eyebrow?: string
  title?: string
  description?: string
  action?: ReactNode        // filtros, toggles, collapse button
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
  children: ReactNode
}
```

Visual: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`. Header com `border-bottom` quando tem título.

### 3.3 `<KpiCard>`

Substitui o `<KpiCard>` do Técnico e o `<FinanceKpiCard>` do Financeiro.

```tsx
{
  label: string
  value: ReactNode
  hint?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  accentColor?: string     // para sparkline e dot (financeiro)
  sparkSeries?: number[]   // opcional: renderiza sparkline SVG
  delta?: string           // "↑ 8,2%"
  deltaTone?: 'positive' | 'warning' | 'critical'
  href?: string            // se informado, card vira link
}
```

O KpiCard do Técnico é mais simples (sem sparkline) — mas o componente unificado suporta ambos os casos via props opcionais.

### 3.4 `<DataTable>`

Substitui as tabelas cruas do Técnico (`<table className="table table-hover table-tight">`) com um componente que encapsula sort, empty state e densidade.

```tsx
{
  columns: Array<{
    key: string
    label: string
    sortable?: boolean
    align?: 'left' | 'right' | 'center'
    render?: (row: T) => ReactNode
  }>
  rows: T[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  emptyMessage?: string
  loading?: boolean
}
```

Sort indicators: ícone Lucide `<ArrowUp>` / `<ArrowDown>` ao lado do label, `--text-soft` quando inativo, `--text-primary` quando ativo. Sem layout shift no texto do header.

### 3.5 `<StatusBadge>`

Substitui o `<StatusChip>` do Técnico com suporte a ícone e tone semântico.

```tsx
{
  value: string            // "Confirmada", "Cancelada", etc.
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  icon?: LucideIcon        // opcional
  size?: 'sm' | 'md'
}
```

### 3.6 `<Sidebar>` (unificada)

O Módulo Técnico passa a usar um `<Sidebar>` idêntico em estrutura ao do Financeiro, com ícones Lucide, logo Prymeira (PNG) e o mesmo padrão visual.

```tsx
{
  module: 'technical' | 'financial' | string  // define qual nav renderizar
  navItems: AppNavItem[]
  loggedUser: string
  onLogout: () => void
}
```

A sidebar do Financeiro já tem ícones SVG inline — migrar para `lucide-react` nos dois módulos. A sidebar do Técnico ganha ícones conforme a tabela do item 2.

---

## 4. Estados de feedback

Padrão unificado para substituir `<p>Carregando...</p>` e `<p className="error">`.

### 4.1 Loading skeleton
```tsx
<SkeletonBlock height={20} width="60%" />   // linha de texto
<SkeletonBlock height={80} />               // card ou tabela
```
Animação: `opacity` pulsando de `0.5` a `1` em `1.2s ease-in-out infinite`.

### 4.2 Toast / feedback de ação
Substituir os `{message ? <p className="info">...` por um `<Toast>` com:
- Auto-dismiss em 4s para sucesso
- Botão X para erros (permanecem até dispensados)
- Posição: canto inferior direito, fora do fluxo
- Tons: success (verde), error (vermelho), warning (âmbar)

### 4.3 Ações destrutivas
Substituir `window.confirm` / `window.prompt` por um `<ConfirmDialog>` component:
- `<dialog>` nativo com `showModal()`
- Título + descrição + campo de confirmação por digitação (quando necessário)
- Botão de confirmar: `background: var(--color-danger)`
- Botão de cancelar: secondary

---

## 5. Hub de módulos (`/app`)

### 5.1 Estrutura

```
/app
├── Topbar
│   ├── Logo Prymeira (PNG: prymeira-logo.png)
│   ├── Data atual
│   └── Avatar do usuário + menu dropdown
├── Body
│   ├── Eyebrow (data por extenso)
│   ├── Título "Seus módulos ativos"
│   └── Grid de módulos (3 colunas)
│       ├── Card ativo: border #1d2830, arrow-right visível
│       ├── Card bloqueado: opacity 0.5, lock icon, badge "Em breve"
│       └── Card futuro: igual ao bloqueado + "Solicitar acesso"
└── Strip inferior
    ├── Métricas cross-módulo (técnico + financeiro)
    └── Alert de atenção (turmas sem quórum, pagamentos atrasados)
```

### 5.2 Comportamento dos cards de módulo

- **Ativo e acessível:** borda `var(--brand-ink)`, ícone de seta, badge verde "Ativo", métrica em DM Mono
- **Ativo mas sem permissão:** visível com opacity 0.5, badge "Sem acesso"
- **Bloqueado/Em breve:** opacity 0.5, ícone de cadeado, badge cinza, cursor não permitido
- **Hover (ativos):** `box-shadow: var(--shadow-md)`, transição suave

### 5.3 Ícones de módulo

Cada módulo tem um ícone Lucide com fundo neutro:

| Módulo | Ícone | Fundo |
|---|---|---|
| Gestão Técnica | `CalendarCheck` | `var(--surface-muted)` |
| Financeiro ERP | `TrendingUp` | `#fafaf9` |
| Estoque | `Package` | `var(--surface-muted)` |
| BI & Relatórios | `BarChart3` | `var(--surface-muted)` |

---

## 6. Migração do Módulo Técnico

### O que mudar

| Item | Estado atual | Estado alvo |
|---|---|---|
| Fonte | `Inter` em `body` | `DM Sans` via `tokens.css` |
| Fundo de página | Gradiente radial | `var(--canvas)` = `#f1f5f9` |
| Sidebar | Texto puro, sem ícones | Ícones Lucide, padrão Financeiro |
| `<Section>` | Componente simples | `<Panel>` unificado |
| `<KpiCard>` | Sem tone, sem sparkline | `<KpiCard>` unificado com tone |
| `<StatusChip>` | Mapeia status para cor | `<StatusBadge>` com tone semântico |
| Tabelas | HTML puro | `<DataTable>` com sort icons |
| Loading | `<p>Carregando...` | Skeleton por seção |
| Feedback | `state.message` / `state.error` | `<Toast>` global |
| Ações destrutivas | `window.confirm` | `<ConfirmDialog>` |
| `styles.css` imports | DM Sans + Inter + Fraunces | Apenas DM Sans + DM Mono |

### O que não mudar

- Lógica de negócio, API calls, estado local
- Estrutura de rotas e permissões
- Componentes específicos sem equivalente no Financeiro (CalendarPage, PlanningPage, KanbanBoard)

### Ordem de implementação recomendada

1. Criar `shared/tokens.css` + importar nos dois módulos
2. Instalar `lucide-react`
3. Migrar sidebar do Técnico (ícones + visual)
4. Criar `<PageHeader>`, `<Panel>`, `<KpiCard>` compartilhados
5. Criar `<DataTable>` com sort icons
6. Migrar `<StatusChip>` → `<StatusBadge>`
7. Implementar `<Toast>` e `<ConfirmDialog>`
8. Implementar Hub `/app`
9. Criar skeleton loading para as telas mais usadas
10. Migrar sidebar do Financeiro de SVG inline para Lucide

---

## 7. Guia para módulos futuros

Qualquer novo módulo integrado à plataforma deve:

1. **Importar `shared/tokens.css`** como primeira linha do CSS
2. **Instalar `lucide-react`** (já presente no workspace)
3. **Usar `<PageHeader>`, `<Panel>`, `<KpiCard>`, `<DataTable>`, `<StatusBadge>`** da pasta `shared/components/`
4. **Usar DM Sans + DM Mono** — não instalar nova fonte
5. **Registrar no Hub** com um card na `ModuleHubPage` (ativo ou "em breve")
6. **Não usar emojis como ícones** — sempre Lucide, `strokeWidth={1.75}`
7. **Sidebar própria** seguindo o padrão do Financeiro: ícones Lucide + eyebrow + back link para `/app`

---

## 8. O que o Financeiro mantém sem mudança

- Componentes próprios (`FinanceKpiGrid`, `FinanceLedgerTable`, `FinanceWhisperFlow`, etc.)
- CSS específico (`finance-pages.css`, `finance-whisper.css`)
- Lógica de negócio e API
- `FinanceSidebar` — apenas migrar SVGs inline para Lucide (passo 10)
- Accent color `--finance-accent: #ea580c` pode ser mantido para uso interno enquanto a migração de tokens não cobre os componentes ricos do financeiro

---

## Resumo das decisões

| Decisão | Escolha |
|---|---|
| Direção | Técnico evolui para o nível do Financeiro |
| Cor primária de ação | `#1d2830` (brand ink) |
| Cor de ênfase | `#F5B700` (amarelo Prymeira) |
| Fonte | DM Sans + DM Mono |
| Ícones | Lucide React, `strokeWidth 1.75` |
| Hub | Conceito A — light, cards por módulo, strip de métricas |
| Logo no hub | `prymeira-logo.png` (PNG) |
| Escopo | Tokens + componentes compartilhados + hub premium |
| Sync com app-mãe | Design isolado, sync traz apenas funções |
