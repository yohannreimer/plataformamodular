# Teste Local: Plataforma Modular + Prymeira Account

## Chaves Clerk

Use o painel do Clerk em ambiente Development.

- Frontend da Plataforma Modular: precisa da Publishable key.
- Prymeira Account API: precisa da Secret key.
- A Secret key nunca deve ir no frontend.

## Plataforma Modular

Crie `apps/frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_colar_aqui
```

Crie `.env.local` na raiz da Plataforma Modular:

```env
PRYMEIRA_ACCOUNT_API_URL=http://localhost:3001
PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS=yohannreimer20@gmail.com
```

## Prymeira Account

No app `/Users/yohannreimer/Documents/Prymeira Account`, configure a Account API com a Secret key do Clerk:

```env
CLERK_SECRET_KEY=sk_test_colar_aqui
CORS_ORIGINS=http://localhost:5173
```

## Ordem para rodar

1. Subir banco e Account API em `/Users/yohannreimer/Documents/Prymeira Account`.
2. Criar/confirmar produtos `orquestrador` e `financeiro` na Account API.
3. Liberar entitlement para `yohannreimer20@gmail.com`.
4. Subir backend da Plataforma Modular:

```bash
npm --workspace apps/backend run dev
```

5. Subir frontend da Plataforma Modular:

```bash
npm --workspace apps/frontend run dev
```

6. Abrir `http://localhost:5173`.

## O que validar

- Clerk abre a tela de login.
- Depois do login, o backend chama `/customers/sync` na Account API.
- O hub mostra `Gestão Técnica` ativo quando `orquestrador` estiver liberado.
- O hub mostra `Financeiro` ativo quando `financeiro` estiver liberado.
- A rota `/m/tecnico` bloqueia se `orquestrador` não estiver liberado.
- A rota `/m/financeiro` bloqueia se `financeiro` não estiver liberado.
- As APIs do backend também retornam bloqueio sem `X-Clerk-Token` ou sem entitlement.
