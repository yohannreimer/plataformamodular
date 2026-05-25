# Design: Financeiro Conciliação OFX Inteligente

## Status
Aprovado em conversa em 2026-05-25. Esta spec detalha o primeiro ciclo de conciliação automática por extrato OFX.

## Contexto Atual
O módulo financeiro já possui base para conciliação:

- `financial_import_job` registra importações financeiras.
- `financial_bank_statement_entry` registra linhas de extrato.
- `financial_reconciliation_match` registra vínculos entre extrato e transações.
- A tela `FinanceReconciliationPage` já exibe inbox, sugestões, matches recentes e criação de lançamento a partir de extrato.
- O backend já calcula sugestões por valor, data, direção, descrição e regras aprendidas derivadas de matches anteriores.

O novo trabalho deve evoluir essa base para uma experiência de importação OFX com pré-conciliação inteligente, aprovação em lote e memória operacional explícita.

## Objetivo
Permitir que o usuário importe um arquivo OFX, revise uma pré-conciliação em um modal e aprove um lote que:

- baixa contas a pagar ou receber quando houver correspondência;
- vincula linhas de extrato a lançamentos existentes no ledger quando houver match;
- cria lançamentos liquidados prontos para aprovação quando não houver registro existente;
- salva padrões aprendidos para que próximos OFX tragam sugestões mais fortes.

O primeiro ciclo prioriza controle humano: nada é efetivado antes da aprovação em lote.

## Escopo
Incluído:

- Upload manual de arquivo OFX.
- Seleção da conta bancária antes ou durante o upload.
- Parser OFX para linhas normalizadas.
- Prévia de conciliação em modal sobre a tela financeira.
- Aprovação em lote com operação transacional.
- Memória aprendida a partir de decisões aprovadas pelo usuário.
- Detecção de duplicidade de arquivo e de linha bancária.
- Testes de parser, motor, aprovação, duplicidade, memória e fluxo principal de UI.

Fora deste primeiro ciclo:

- PDF de extrato.
- CSV/Excel de banco.
- Open Finance ou integração bancária automática.
- Autopilot que efetiva sem revisão humana.
- Treinamento externo de modelo ou dependência de IA remota para classificar transações.

## Fluxo Operacional
1. O usuário clica em `Importar OFX` na área de conciliação.
2. O sistema abre um modal com seleção de conta bancária e upload do arquivo.
3. O backend cria ou prepara um job de importação e lê o OFX.
4. O motor monta uma pré-conciliação para cada linha.
5. O modal mostra resumo, itens prontos, itens para revisar e exceções.
6. O usuário ajusta campos necessários e aprova o lote.
7. O backend efetiva o lote em uma transação.
8. O sistema atualiza inbox, matches recentes, indicadores e memória aprendida.

## Ordem de Decisão do Motor
Para cada linha do OFX, o motor tenta resolver nesta ordem:

1. **Contas a receber ou pagar em aberto**
   - Usa valor, direção, data, entidade e descrição.
   - Ao aprovar, marca como recebido ou pago e cria/vincula a transação liquidada.

2. **Ledger financeiro existente**
   - Busca transações já criadas e ainda não conciliadas.
   - Ao aprovar, registra o match de conciliação.

3. **Novo lançamento liquidado**
   - Usa memória aprendida e sinais da descrição para preencher entidade, categoria, centro de custo, forma de pagamento e conta bancária.
   - O lançamento nasce liquidado, com datas ancoradas na data do extrato.

4. **Revisão manual**
   - Usado quando a confiança é baixa, há campos críticos ausentes ou a linha parece duplicada/ambígua.

## Arquitetura Proposta
### `ofxParser`
Responsável por ler o arquivo OFX e devolver linhas normalizadas:

- data do extrato;
- data de compensação quando existir;
- valor em centavos com direção;
- descrição original;
- descrição normalizada;
- saldo quando existir;
- identificador bancário quando existir;
- hash de deduplicação.

### `reconciliationDraft`
Modelo de pré-conciliação antes da aprovação. Cada item deve ter um tipo:

- `payable_match`;
- `receivable_match`;
- `ledger_match`;
- `new_transaction`;
- `needs_review`;
- `duplicate`;
- `invalid`.

Cada item guarda a linha OFX, decisão sugerida, campos financeiros propostos, confiança, motivos do score e status de revisão.

### `reconciliationEngine`
Calcula sugestões e justificativas. Sinais usados:

- valor exato ou próximo;
- direção compatível;
- distância entre data do extrato e vencimento/baixa/competência;
- semelhança textual da descrição;
- entidade mencionada na descrição;
- conta bancária selecionada;
- memória aprendida;
- histórico de matches anteriores;
- risco de duplicidade.

### `reconciliationMemory`
Armazena padrões aprovados pelo usuário. A memória deve capturar:

- descrição normalizada ou padrão textual;
- conta bancária;
- entidade financeira;
- categoria;
- centro de custo;
- forma de pagamento;
- direção esperada;
- contagem de uso;
- última aprovação;
- confiança derivada do histórico.

A primeira versão aprende apenas com aprovações humanas. Rejeições e sugestões não aprovadas não atualizam memória.

### `bulkApproval`
Efetiva o lote de forma transacional:

- persiste job de importação;
- persiste linhas de extrato ainda não existentes;
- baixa contas a pagar/receber quando aplicável;
- cria lançamentos liquidados quando necessário;
- registra matches;
- atualiza memória;
- registra auditoria do lote.

Se qualquer item aprovado falhar, o lote deve falhar sem aplicar alterações parciais.

## Interface do Modal
O modal tem quatro áreas:

### Resumo
Mostra arquivo, conta bancária, período, total de linhas, entradas, saídas, duplicadas, itens prontos e itens que exigem revisão.

### Prontos
Mostra itens com confiança a partir de 80%. Cada item pode ser removido do lote antes da aprovação. Itens entre 80% e 94% aparecem destacados para conferência.

### Revisar
Mostra itens entre 60% e 79% ou com campos críticos ausentes. O usuário pode escolher entidade, categoria, centro de custo, forma de pagamento e se aquela decisão deve salvar memória.

### Exceções
Mostra duplicadas, linhas inválidas, transferências ambíguas e itens abaixo de 60%. Esses itens não entram no lote sem ação explícita.

O botão final é `Aprovar lote`. Depois da aprovação, a tela de conciliação recarrega a inbox e os matches recentes.

## Níveis de Confiança
- `95-100%`: pronto para aprovar em lote.
- `80-94%`: pronto, mas destacado para conferência.
- `60-79%`: revisão obrigatória antes de entrar no lote.
- `0-59%`: sem decisão automática.

Esses limites podem virar constantes internas no primeiro ciclo. Não precisam de configuração na UI agora.

## Dados e Auditoria
Cada aprovação de lote deve registrar:

- usuário aprovador;
- data/hora de aprovação;
- arquivo OFX;
- conta bancária;
- totais de entrada e saída;
- total de linhas;
- quantidade por tipo de decisão;
- linhas ignoradas ou duplicadas;
- IDs de transações, pagar/receber e matches criados ou atualizados.

## Duplicidade
O sistema deve evitar duas duplicidades:

- **Arquivo duplicado:** mesmo nome, tamanho e hash de conteúdo.
- **Linha duplicada:** mesma conta, data, valor, identificador bancário quando existir e hash de descrição normalizada.

Linhas duplicadas aparecem em `Exceções` e não entram na aprovação em lote por padrão.

## Compatibilidade com a Base Atual
A implementação deve preservar os endpoints atuais de conciliação e a inbox existente. A nova experiência pode usar novos endpoints de draft/aprovação, mas deve continuar alimentando `financial_bank_statement_entry` e `financial_reconciliation_match`, para que relatórios e telas atuais sigam funcionando.

Quando uma linha vira novo lançamento, o comportamento deve ser compatível com a ação atual de criar lançamento a partir de extrato: transação liquidada, valores absolutos e datas ancoradas no extrato.

## Erros e Estados
- OFX inválido: modal mostra erro e não cria lote aprovável.
- Conta bancária ausente: upload não prossegue.
- Linha sem data, valor ou descrição: item vai para `Exceções`.
- Duplicidade: item vai para `Exceções`.
- Falha na aprovação: nenhuma alteração parcial deve permanecer.
- Permissão insuficiente: usuário pode visualizar prévia se tiver leitura, mas só aprova com permissão de conciliação/escrita.

## Critérios de Aceite
- Usuário consegue importar OFX para uma conta bancária.
- Sistema apresenta pré-conciliação em modal antes de efetivar alterações.
- Motor prioriza pagar/receber em aberto, depois ledger, depois novo lançamento liquidado.
- Lançamentos novos são preparados como liquidados para aprovação em lote.
- Aprovação em lote persiste extrato, transações, matches e memória de forma transacional.
- Memória salva descrição, entidade, categoria, centro de custo, forma de pagamento e conta bancária.
- Próxima importação usa a memória para melhorar sugestões.
- Duplicidades são detectadas e separadas em exceções.
- Nenhuma linha é efetivada antes da aprovação humana.

## Plano de Testes
- Parser OFX normaliza data, valor, descrição, saldo e identificador bancário.
- Parser OFX rejeita arquivo inválido com erro legível.
- Deduplicação bloqueia arquivo já importado.
- Deduplicação separa linha bancária repetida.
- Motor escolhe pagar/receber antes de ledger quando ambos parecem possíveis.
- Motor cria decisão `new_transaction` quando não há match existente e há memória suficiente.
- Itens abaixo de 60% entram como revisão ou exceção.
- Aprovação em lote é transacional em caso de erro.
- Memória aprendida aumenta a confiança em importação posterior.
- UI permite revisar campos, remover item do lote e aprovar lote.
