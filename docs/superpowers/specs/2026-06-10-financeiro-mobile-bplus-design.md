# Financeiro Mobile B+ Design

## Contexto

O módulo financeiro já funciona como um workspace próprio em `/financeiro/*`, com rotas para visão geral, movimentações, recebíveis, contas a pagar, conciliação, fluxo de caixa, relatórios, cadastros, simulação e avançado. Hoje a experiência principal foi desenhada para desktop: sidebar fixa, páginas densas, tabelas, painéis laterais e formulários amplos.

A atualização mobile deve permitir que o usuário abra a mesma URL pelo celular e continue operando o financeiro com conforto. O alvo principal é celular moderno comum, por volta de `390px` de largura, com suporte funcional a `360px`.

## Decisão De Produto

A abordagem aprovada é **B+**:

- criar uma base mobile reutilizável para o financeiro inteiro;
- preservar as mesmas rotas e a mesma lógica de domínio;
- aplicar experiências mobile específicas nas telas críticas;
- evitar duplicação de regras, chamadas de API, validações e permissões.

Essa abordagem segue o padrão de apps grandes: shell mobile próprio, componentes adaptativos e fluxos críticos redesenhados para toque, sem criar um segundo app financeiro dentro do mesmo frontend.

## Objetivos

- Tornar todas as rotas financeiras navegáveis e utilizáveis no celular.
- Manter paridade funcional com desktop para operações principais.
- Preservar a experiência desktop atual, mudando apenas onde o viewport exigir.
- Transformar tabelas densas em listas acionáveis no celular.
- Usar bottom sheets para detalhes, filtros, edição e ações contextuais.
- Compartilhar controllers/hooks entre desktop e mobile sempre que uma tela tiver lógica relevante.

## Fora De Escopo

- Criar um aplicativo nativo.
- Alterar APIs do backend sem necessidade direta do mobile.
- Trocar o sistema de autenticação ou permissões.
- Redesenhar toda a identidade visual do financeiro.
- Reescrever todas as páginas como componentes totalmente separados.

## Arquitetura Responsiva

O financeiro terá um shell responsivo:

- Desktop e telas largas continuam com sidebar fixa.
- Mobile troca a sidebar por header compacto, bottom bar e menu completo.
- As rotas permanecem iguais para preservar links, reloads e acesso direto.
- O breakpoint principal deve atender `390px`, com validação em `360px`.

Componentes base:

- `FinanceResponsiveShell`: decide entre shell desktop e shell mobile.
- `FinanceMobileHeader`: mostra logo/contexto, rota atual, menu e ação principal quando existir.
- `FinanceMobileBottomNav`: expõe as rotas mais frequentes.
- `FinanceMobileMoreMenu`: lista todas as áreas financeiras e ações de conta.
- `FinanceBottomSheet`: base para detalhe, edição, filtros e ações.
- `FinanceMobileList`: lista/card responsivo para substituir tabelas em mobile.
- `FinanceMobileFilterSheet`: filtros compactos para páginas com busca e recorte.

## Navegação Mobile

A navegação aprovada é híbrida:

- Header compacto no topo.
- Bottom bar com atalhos principais.
- Menu "Mais" ou gaveta com o mapa completo do ERP.

A bottom bar inicial deve priorizar:

- Visão Geral;
- Movimentações;
- Receber;
- Pagar;
- Mais.

O menu "Mais" deve incluir:

- Conciliação;
- Fluxo de Caixa;
- Relatórios;
- Cadastros;
- Simulação;
- Avançado;
- Voltar ao Hub;
- Sair, quando houver handler de logout.

A navegação deve respeitar permissões e manter comportamento equivalente ao desktop.

## Padrão Para Telas Densas

O padrão aprovado para telas densas é **lista + bottom sheet**.

Em mobile:

- tabelas viram listas de cards resumidos;
- cada card destaca nome, valor, status, data e contexto mínimo;
- toque no card abre bottom sheet com detalhe completo e ações;
- filtros ficam em bottom sheet ou painel compacto;
- criação e edição usam sheets ou fluxos compactos;
- tabelas completas podem existir como visualização secundária quando útil.

Essa decisão se aplica principalmente a movimentações, contas a receber, contas a pagar, conciliação e cadastros.

## Estratégia Para Evitar Duplicação

As telas críticas devem separar lógica e apresentação.

Exemplo conceitual:

```tsx
const controller = useFinanceTransactionsController();

return isMobile ? (
  <FinanceTransactionsMobileView controller={controller} />
) : (
  <FinanceTransactionsDesktopView controller={controller} />
);
```

O controller concentra:

- carregamento e refresh;
- filtros;
- item selecionado;
- modo `view`, `create` e `edit`;
- permissões;
- mensagens de erro e sucesso;
- chamadas para criar, editar, excluir, baixar, aprovar ou rejeitar.

As views ficam responsáveis apenas por layout, interação visual e apresentação dos mesmos dados.

## Aplicação Por Tela

### Visão Geral

- KPIs empilhados em uma coluna ou grid compacto.
- Fluxo de caixa legível sem exigir zoom.
- Ações rápidas em grade compacta.
- Header com contexto e último refresh sem ocupar muita altura.

### Movimentações

- Lista mobile de lançamentos substitui a tabela principal.
- Card mostra descrição, entidade, status, data e valor.
- Detalhe, edição e exclusão ficam em bottom sheet.
- Novo lançamento pode abrir em sheet ou tela compacta.
- Filtros do ledger ficam em sheet com busca no topo.

### Contas A Receber E Contas A Pagar

- Cards por título com vencimento, status, entidade e valor.
- Baixa, edição e ações contextuais em bottom sheet.
- Novo título em formulário compacto.
- Pulso operacional e resumos aparecem antes da lista.

### Conciliação

- Fila de itens reconciliáveis em cards.
- Aprovar, revisar, rejeitar e editar contexto via bottom sheet.
- Importação OFX deve manter fluxo utilizável no celular, com cuidado especial para upload, prévia e revisão.

### Fluxo De Caixa E Relatórios

- Resumo executivo vem antes das tabelas.
- Gráficos devem ter altura estável e legenda legível.
- Tabelas detalhadas ficam atrás de expansão, tabs ou scroll controlado.
- Relatórios priorizam leitura e comparação, não edição.

### Cadastros

- Abas horizontais ou segmentadas para alternar entidades, contas, categorias, centros, formas, combinações e recorrências.
- Formulários em sheets ou blocos empilhados.
- Listas compactas com ações por item.

### Simulação E Avançado

- Devem ser navegáveis no mobile.
- Podem receber responsividade inicial com empilhamento, filtros compactos e proteção contra overflow.
- Refinos específicos ficam para uma etapa posterior, salvo se bloquearem uso básico.

## Estados E Erros

- Loading deve ocupar pouco espaço e preservar estabilidade visual.
- Erros globais aparecem no topo da página.
- Erros de ação em sheet aparecem dentro da própria sheet.
- Fechar sheet com edição suja deve pedir confirmação ou preservar rascunho.
- Ações destrutivas mantêm confirmação.
- Empty states devem ser curtos e acionáveis.

## Acessibilidade E Toque

- Áreas de toque devem ser confortáveis em `390px` e aceitáveis em `360px`.
- Bottom sheets precisam ter `aria-modal`, título acessível e fechamento por botão claro.
- Navegação por teclado não deve regredir.
- Textos longos devem quebrar linha sem vazar do contêiner.
- Nenhuma ação crítica deve depender apenas de hover.

## Plano De Implementação Esperado

A implementação deve seguir esta ordem:

1. Criar a base responsiva do shell financeiro.
2. Criar componentes mobile reutilizáveis.
3. Extrair controllers/hooks das telas críticas onde houver lógica duplicável.
4. Aplicar a experiência completa primeiro em Movimentações.
5. Aplicar padrões em Receber, Pagar e Conciliação.
6. Ajustar Overview, Fluxo, Relatórios e Cadastros para mobile.
7. Fazer passadas finais em Simulação e Avançado para garantir navegabilidade.
8. Validar visualmente `390x844` e `360x780`.

## Testes E Verificação

- Testes de componente para shell mobile, bottom nav, more menu e bottom sheet.
- Testes das telas críticas validando que dados e ações continuam disponíveis.
- Testes de controllers/hooks quando a extração concentrar regra relevante.
- Smoke manual ou automatizado em viewport `390x844`.
- Smoke manual ou automatizado em viewport `360x780`.
- `npm run build -w apps/frontend`.

## Critérios De Aceite

- Abrir `/financeiro/*` no celular não quebra layout nem exige zoom.
- Todas as rotas financeiras são alcançáveis pela navegação mobile.
- Movimentações permite consultar, filtrar, criar, editar e excluir usando padrões mobile.
- Receber e Pagar permitem consultar e operar títulos em celular.
- Conciliação permanece utilizável, inclusive com revisão em cards/sheets.
- Tabelas densas não são a experiência principal em telas de `390px`.
- A experiência desktop existente continua funcional.
- A lógica de domínio não é duplicada entre views desktop e mobile.
