# Multi-Tenant Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Prymeira Account and Plataforma Modular safely multi-tenant by creating a workspace on first login, granting products to workspaces, enforcing product seats, and scoping every app data operation to the authenticated workspace.

**Architecture:** Account API becomes the source of truth for `customer -> workspace -> product entitlement -> product seat`. Plataforma Modular maps the Account workspace to a local `organization` and uses `organization_id` as the backend-only tenant boundary for Financeiro and Orquestrador. The frontend displays access state but never supplies trusted tenant ids.

**Tech Stack:** Fastify + Prisma + PostgreSQL in `/Users/yohannreimer/Documents/Prymeira Account`; Express + better-sqlite3 + React/Vite in `/Users/yohannreimer/Documents/Plataforma Modular`; Clerk bearer tokens; Vitest/tsx tests.

---

## Scope And Order

This plan intentionally implements the migration in four shippable phases:

1. Account API workspace model and workspace-owned access.
2. Plataforma Modular bootstrap mapping from Account workspace to local organization.
3. Financeiro fail-closed tenant hardening.
4. Orquestrador tenant migration for global tables and routes.

Do not start Phase 3 until Phase 1 and Phase 2 tests pass. Do not start Phase 4 until Financeiro has a passing cross-tenant test.

## Repositories

- Account API root: `/Users/yohannreimer/Documents/Prymeira Account`
- Plataforma Modular root: `/Users/yohannreimer/Documents/Plataforma Modular`

## Task 1: Account API Workspace Schema

**Files:**
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/prisma/schema.prisma`
- Create: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/prisma/migrations/<timestamp>_workspace_entitlements/migration.sql`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/prisma/seed.ts`

- [ ] **Step 1: Update Prisma schema**

Add workspace models and move entitlements to workspace ownership while keeping `customerId` temporarily nullable for migration compatibility.

```prisma
model Customer {
  id                String            @id @default(uuid()) @db.Uuid
  clerkUserId       String            @unique @map("clerk_user_id")
  email             String
  name              String?
  gatewayCustomerId String?           @map("gateway_customer_id")
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")
  ownedWorkspaces   Workspace[]       @relation("WorkspaceOwner")
  workspaceMembers  WorkspaceMember[]
  productSeats      WorkspaceProductMember[]
  entitlements      Entitlement[]
  subscriptions     Subscription[]

  @@map("customers")
}

model Workspace {
  id              String                   @id @default(uuid()) @db.Uuid
  name            String
  slug            String                   @unique
  type            String                   @default("individual")
  status          String                   @default("active")
  ownerCustomerId String                   @map("owner_customer_id") @db.Uuid
  metadata        Json                     @default("{}")
  createdAt       DateTime                 @default(now()) @map("created_at")
  updatedAt       DateTime                 @updatedAt @map("updated_at")
  owner           Customer                 @relation("WorkspaceOwner", fields: [ownerCustomerId], references: [id], onDelete: Restrict)
  members         WorkspaceMember[]
  productMembers  WorkspaceProductMember[]
  entitlements    Entitlement[]
  invitations     Invitation[]

  @@index([ownerCustomerId])
  @@map("workspaces")
}

model WorkspaceMember {
  id          String    @id @default(uuid()) @db.Uuid
  workspaceId String    @map("workspace_id") @db.Uuid
  customerId  String    @map("customer_id") @db.Uuid
  role        String    @default("member")
  status      String    @default("active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, customerId])
  @@index([customerId, status])
  @@map("workspace_members")
}

model WorkspaceProductMember {
  id          String    @id @default(uuid()) @db.Uuid
  workspaceId String    @map("workspace_id") @db.Uuid
  customerId  String    @map("customer_id") @db.Uuid
  productKey  String    @map("product_key")
  role        String    @default("member")
  status      String    @default("active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productKey], references: [productKey], onDelete: Restrict)

  @@unique([workspaceId, customerId, productKey])
  @@index([customerId, productKey, status])
  @@map("workspace_product_members")
}

model Invitation {
  id          String    @id @default(uuid()) @db.Uuid
  workspaceId String    @map("workspace_id") @db.Uuid
  email       String
  role        String    @default("member")
  productKeys Json      @default("[]") @map("product_keys")
  status      String    @default("pending")
  expiresAt   DateTime  @map("expires_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, status])
  @@index([email, status])
  @@map("invitations")
}
```

Update `Product` and `Entitlement`:

```prisma
model Product {
  id             String                   @id @default(uuid()) @db.Uuid
  productKey     String                   @unique @map("product_key")
  name           String
  description    String?
  appUrl         String                   @map("app_url")
  marketingUrl   String?                  @map("marketing_url")
  status         String                   @default("active")
  createdAt      DateTime                 @default(now()) @map("created_at")
  updatedAt      DateTime                 @updatedAt @map("updated_at")
  entitlements   Entitlement[]
  productMembers WorkspaceProductMember[]

  @@map("products")
}

model Entitlement {
  id                  String     @id @default(uuid()) @db.Uuid
  workspaceId         String     @map("workspace_id") @db.Uuid
  customerId          String?    @map("customer_id") @db.Uuid
  productKey          String     @map("product_key")
  status              String
  plan                String     @default("free")
  source              String
  seatsLimit          Int        @default(1) @map("seats_limit")
  startsAt            DateTime   @default(now()) @map("starts_at")
  endsAt              DateTime?  @map("ends_at")
  trialEndsAt         DateTime?  @map("trial_ends_at")
  currentPeriodEndsAt DateTime?  @map("current_period_ends_at")
  limits              Json       @default("{}")
  metadata            Json       @default("{}")
  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")
  workspace           Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  customer            Customer?  @relation(fields: [customerId], references: [id], onDelete: SetNull)
  product             Product    @relation(fields: [productKey], references: [productKey], onDelete: Restrict)

  @@unique([workspaceId, productKey])
  @@index([customerId])
  @@map("entitlements")
}
```

- [ ] **Step 2: Create migration**

Run:

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
DATABASE_URL='postgresql://postgres:postgres@localhost:5433/prymeira_account' PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api prisma migrate dev --name workspace_entitlements
```

Expected:

```txt
Applying migration `*_workspace_entitlements`
Your database is now in sync with your schema.
```

- [ ] **Step 3: Edit generated SQL to migrate existing data safely**

Open the generated migration and make sure it includes this data migration after creating `workspaces` and `workspace_members`, before making `workspace_id` required:

```sql
insert into workspaces (id, name, slug, type, status, owner_customer_id, metadata, created_at, updated_at)
select
  gen_random_uuid(),
  coalesce(nullif(name, ''), split_part(email, '@', 1)),
  lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8),
  'individual',
  'active',
  id,
  '{}'::jsonb,
  now(),
  now()
from customers c
where not exists (
  select 1 from workspaces w where w.owner_customer_id = c.id
);

insert into workspace_members (id, workspace_id, customer_id, role, status, created_at, updated_at)
select gen_random_uuid(), w.id, w.owner_customer_id, 'owner', 'active', now(), now()
from workspaces w
where not exists (
  select 1 from workspace_members wm
  where wm.workspace_id = w.id and wm.customer_id = w.owner_customer_id
);

update entitlements e
set workspace_id = w.id
from workspaces w
where e.customer_id = w.owner_customer_id
  and e.workspace_id is null;

insert into workspace_product_members (id, workspace_id, customer_id, product_key, role, status, created_at, updated_at)
select gen_random_uuid(), e.workspace_id, coalesce(e.customer_id, w.owner_customer_id), e.product_key, 'owner', 'active', now(), now()
from entitlements e
join workspaces w on w.id = e.workspace_id
where not exists (
  select 1 from workspace_product_members wpm
  where wpm.workspace_id = e.workspace_id
    and wpm.customer_id = coalesce(e.customer_id, w.owner_customer_id)
    and wpm.product_key = e.product_key
);
```

Also verify the final SQL has:

```sql
alter table entitlements alter column workspace_id set not null;
create unique index entitlements_workspace_id_product_key_key on entitlements(workspace_id, product_key);
```

- [ ] **Step 4: Regenerate Prisma and run seed**

Run:

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
DATABASE_URL='postgresql://postgres:postgres@localhost:5433/prymeira_account' PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm prisma:generate
DATABASE_URL='postgresql://postgres:postgres@localhost:5433/prymeira_account' PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm prisma:seed
```

Expected:

```txt
Generated Prisma Client
```

- [ ] **Step 5: Verify existing Yohann data migrated**

Run:

```bash
docker exec -i prymeira-account-postgres psql -U postgres -d prymeira_account -c "
select c.email, w.id as workspace_id, w.name, wm.role, e.product_key, e.status, e.seats_limit
from customers c
join workspace_members wm on wm.customer_id = c.id
join workspaces w on w.id = wm.workspace_id
left join entitlements e on e.workspace_id = w.id
where c.email = 'yohannreimer20@gmail.com'
order by e.product_key;"
```

Expected:

```txt
yohannreimer20@gmail.com | <workspace uuid> | Yohann Reimer | owner | financeiro   | active | 1
yohannreimer20@gmail.com | <workspace uuid> | Yohann Reimer | owner | orquestrador | active | 1
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
git add apps/account-api/prisma/schema.prisma apps/account-api/prisma/migrations apps/account-api/prisma/seed.ts pnpm-lock.yaml
git commit -m "feat: add workspace entitlement schema"
```

## Task 2: Account API Workspace Services

**Files:**
- Create: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/workspaces/workspaces.service.ts`
- Create: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/workspaces/workspaces.service.test.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/customers/customers.service.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/customers/customers.routes.ts`

- [ ] **Step 1: Write workspace service tests**

Create `workspaces.service.test.ts` with tests for default workspace creation and reuse:

```ts
import { describe, expect, it, vi } from "vitest";
import { ensureDefaultWorkspaceForCustomer } from "./workspaces.service.js";

function createPrismaMock() {
  return {
    workspaceMember: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    workspace: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  };
}

describe("ensureDefaultWorkspaceForCustomer", () => {
  it("reuses an active owner workspace", async () => {
    const prisma = createPrismaMock();
    prisma.workspaceMember.findFirst.mockResolvedValue({
      role: "owner",
      status: "active",
      workspace: { id: "workspace-1", name: "Acme", type: "individual", status: "active" }
    });

    const result = await ensureDefaultWorkspaceForCustomer(prisma as any, {
      id: "customer-1",
      email: "owner@acme.com",
      name: "Acme Owner"
    });

    expect(result.workspace.id).toBe("workspace-1");
    expect(result.membership.role).toBe("owner");
    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it("creates an individual workspace and owner membership", async () => {
    const prisma = createPrismaMock();
    prisma.workspaceMember.findFirst.mockResolvedValue(null);
    prisma.workspace.create.mockResolvedValue({
      id: "workspace-2",
      name: "Acme Owner",
      type: "individual",
      status: "active",
      members: [{ id: "member-1", role: "owner", status: "active" }]
    });

    const result = await ensureDefaultWorkspaceForCustomer(prisma as any, {
      id: "customer-2",
      email: "owner@acme.com",
      name: "Acme Owner"
    });

    expect(result.workspace.id).toBe("workspace-2");
    expect(result.membership.role).toBe("owner");
    expect(prisma.workspace.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: "Acme Owner",
        type: "individual",
        status: "active",
        ownerCustomerId: "customer-2"
      })
    }));
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test -- src/modules/workspaces/workspaces.service.test.ts
```

Expected failure:

```txt
Cannot find module './workspaces.service.js'
```

- [ ] **Step 3: Implement workspace service**

Create `workspaces.service.ts`:

```ts
import type { Prisma, PrismaClient } from "@prisma/client";

type WorkspacePrisma = PrismaClient | Prisma.TransactionClient;

type CustomerIdentity = {
  id: string;
  email: string;
  name: string | null;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

export function defaultWorkspaceName(customer: CustomerIdentity) {
  return customer.name?.trim() || customer.email.split("@")[0] || "Workspace";
}

export async function ensureDefaultWorkspaceForCustomer(
  prisma: WorkspacePrisma,
  customer: CustomerIdentity
) {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      customerId: customer.id,
      status: "active",
      workspace: { status: "active" }
    },
    include: { workspace: true },
    orderBy: { createdAt: "asc" }
  });

  if (existingMembership) {
    return {
      workspace: existingMembership.workspace,
      membership: existingMembership
    };
  }

  const name = defaultWorkspaceName(customer);
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug: `${slugify(name)}-${customer.id.slice(0, 8)}`,
      type: "individual",
      status: "active",
      ownerCustomerId: customer.id,
      members: {
        create: {
          customerId: customer.id,
          role: "owner",
          status: "active"
        }
      }
    },
    include: { members: true }
  });

  const membership = workspace.members.find((item) => item.customerId === customer.id);
  if (!membership) {
    throw new Error("Default workspace membership was not created.");
  }

  return { workspace, membership };
}
```

- [ ] **Step 4: Update customer sync to ensure workspace**

In `customers.service.ts`, after customer upsert, return both customer and workspace context:

```ts
const customer = await prisma.customer.upsert({
  where: { clerkUserId: user.clerkUserId },
  update,
  create: {
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: nextName ?? null
  }
});

const workspaceContext = await ensureDefaultWorkspaceForCustomer(prisma, customer);

return { customer, workspaceContext };
```

Update imports:

```ts
import { ensureDefaultWorkspaceForCustomer } from "../workspaces/workspaces.service.js";
```

- [ ] **Step 5: Update `/customers/sync` response**

In `customers.routes.ts`, change `const customer = await syncCustomer(...)` to:

```ts
const { customer, workspaceContext } = await syncCustomer(app.prisma, user, input);

return {
  customer_id: customer.id,
  clerk_user_id: customer.clerkUserId,
  email: customer.email,
  workspace: {
    id: workspaceContext.workspace.id,
    name: workspaceContext.workspace.name,
    type: workspaceContext.workspace.type,
    role: workspaceContext.membership.role
  }
};
```

- [ ] **Step 6: Update existing customer service tests**

Where tests expect `syncCustomer` to return a customer directly, update assertions to use `.customer`.

Example:

```ts
const result = await syncCustomer(prisma as any, user, input);
expect(result.customer.email).toBe(user.email);
expect(result.workspaceContext.workspace.id).toBeDefined();
```

- [ ] **Step 7: Run Account API tests**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test
```

Expected:

```txt
Test Files  passed
Tests  passed
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
git add apps/account-api/src/modules/workspaces apps/account-api/src/modules/customers
git commit -m "feat: create default workspace on sync"
```

## Task 3: Account API Workspace Access Checks And Seats

**Files:**
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/access/access.types.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/access/access.service.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/access/access.routes.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/access/access.routes.test.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/access/access.service.test.ts`

- [ ] **Step 1: Extend access types**

Update `AccessReason`:

```ts
export type AccessReason =
  | "no_customer"
  | "no_workspace"
  | "no_workspace_membership"
  | "workspace_suspended"
  | "no_product"
  | "inactive_product"
  | "no_entitlement"
  | "no_product_seat"
  | "seats_limit_reached"
  | "expired"
  | "blocked"
  | "cancelled"
  | "trial_expired"
  | "active_entitlement"
  | "internal_access";
```

Add workspace fields:

```ts
export type AccessWorkspace = {
  id: string;
  status: string;
  role: string;
};

export type AccessProductSeat = {
  role: string;
  status: string;
};

export type AccessEntitlement = {
  workspaceId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit: number;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  limits: unknown;
};

export type AccessDecision = {
  allowed: boolean;
  workspace_id?: string;
  workspace_role?: string;
  product_key: string;
  product_role?: string;
  status: string;
  plan?: string;
  source?: string;
  seats_limit?: number;
  limits?: unknown;
  reason: AccessReason;
  upgrade_url?: string;
};
```

- [ ] **Step 2: Update access service input**

Change input shape in `access.service.ts`:

```ts
type EvaluateAccessInput = {
  hasCustomer: boolean;
  workspace: AccessWorkspace | null;
  productSeat: AccessProductSeat | null;
  product: AccessProduct | null;
  entitlement: AccessEntitlement | null;
  now: Date;
};
```

Add fail-closed workspace checks before product checks:

```ts
if (!input.workspace) {
  return deny(productKey, "locked", "no_workspace", input.product?.marketingUrl);
}

if (input.workspace.status !== "active") {
  return deny(productKey, input.workspace.status, "workspace_suspended", input.product?.marketingUrl);
}

if (!input.productSeat || input.productSeat.status !== "active") {
  return deny(productKey, "locked", "no_product_seat", input.product?.marketingUrl);
}
```

Update `allow` to include workspace and seat fields:

```ts
function allow(
  input: EvaluateAccessInput,
  entitlement: AccessEntitlement,
  reason: AccessDecision["reason"]
): AccessDecision {
  return {
    allowed: true,
    workspace_id: input.workspace?.id,
    workspace_role: input.workspace?.role,
    product_key: entitlement.productKey,
    product_role: input.productSeat?.role,
    status: entitlement.status,
    plan: entitlement.plan,
    source: entitlement.source,
    seats_limit: entitlement.seatsLimit,
    limits: entitlement.limits,
    reason
  };
}
```

- [ ] **Step 3: Update route data loading**

In `/access-check`, after customer lookup:

```ts
const membership = customer
  ? await app.prisma.workspaceMember.findFirst({
      where: {
        customerId: customer.id,
        status: "active",
        workspace: { status: "active" }
      },
      include: { workspace: true },
      orderBy: { createdAt: "asc" }
    })
  : null;

const entitlement = membership
  ? await app.prisma.entitlement.findUnique({
      where: {
        workspaceId_productKey: {
          workspaceId: membership.workspaceId,
          productKey: query.product_key
        }
      }
    })
  : null;

const productSeat = membership
  ? await app.prisma.workspaceProductMember.findUnique({
      where: {
        workspaceId_customerId_productKey: {
          workspaceId: membership.workspaceId,
          customerId: customer!.id,
          productKey: query.product_key
        }
      }
    })
  : null;
```

Pass these to `evaluateEntitlementAccess`.

- [ ] **Step 4: Update `/me/products`**

Return workspace context and product decisions by workspace entitlement:

```ts
workspace: membership
  ? {
      id: membership.workspace.id,
      name: membership.workspace.name,
      type: membership.workspace.type,
      role: membership.role
    }
  : null,
```

For each product, look up both entitlement and product seat by product key. Use `evaluateEntitlementAccess` with the same inputs as `/access-check`.

- [ ] **Step 5: Add tests**

Add route tests for:

```ts
it("allows access only when workspace, entitlement, and product seat are active", async () => {});
it("denies access when the customer has no workspace", async () => {});
it("denies access when the workspace has no product seat", async () => {});
it("returns workspace context in /me/products", async () => {});
```

In each test, seed customer, workspace, membership, entitlement, and seat using Prisma test setup already present in `access.routes.test.ts`.

- [ ] **Step 6: Run Account API tests**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test -- src/modules/access/access.service.test.ts src/modules/access/access.routes.test.ts
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test
```

Expected:

```txt
Test Files  passed
Tests  passed
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
git add apps/account-api/src/modules/access
git commit -m "feat: authorize access by workspace seats"
```

## Task 4: Account API Admin Workspace Grants

**Files:**
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/admin/admin.schemas.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/admin/admin.routes.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/entitlements/entitlements.service.ts`
- Modify: `/Users/yohannreimer/Documents/Prymeira Account/apps/account-api/src/modules/admin/admin.routes.test.ts`

- [ ] **Step 1: Replace customer grant input with workspace grant input**

Change `upsertEntitlementSchema`:

```ts
export const upsertEntitlementSchema = z.object({
  workspace_id: z.string().uuid(),
  product_key: z.string().min(1),
  status: z.enum(["active", "trial", "expired", "blocked", "cancelled", "internal"]),
  plan: z.string().min(1).default("free"),
  source: z.enum(["manual", "trial", "payment", "internal", "admin", "migration"]),
  seats_limit: z.number().int().positive().max(1000).default(1),
  ends_at: z.string().datetime().nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_ends_at: z.string().datetime().nullable().optional(),
  limits: jsonRecordSchema,
  metadata: jsonRecordSchema
});
```

Change block/trial schemas to use `workspace_id`.

- [ ] **Step 2: Update entitlement service input**

Replace `customerId` with `workspaceId` and add `seatsLimit`.

```ts
type UpsertEntitlementInput = {
  workspaceId: string;
  productKey: string;
  status: string;
  plan: string;
  source: string;
  seatsLimit: number;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date | null;
  limits: Prisma.InputJsonValue;
  metadata: Prisma.InputJsonValue;
  auditAction?: string;
};
```

Use:

```ts
const where = {
  workspaceId_productKey: { workspaceId: input.workspaceId, productKey: input.productKey }
};
```

Create/update:

```ts
workspaceId: input.workspaceId,
productKey: input.productKey,
status: input.status,
plan: input.plan,
source: input.source,
seatsLimit: input.seatsLimit,
limits: input.limits,
metadata: input.metadata
```

- [ ] **Step 3: Auto-seat workspace owner on entitlement grant**

Inside the same transaction, after upserting entitlement:

```ts
const workspace = await prisma.workspace.findUnique({
  where: { id: input.workspaceId },
  select: { ownerCustomerId: true }
});

if (!workspace) {
  throw new ApiError(404, "NOT_FOUND", "Workspace not found.");
}

await prisma.workspaceProductMember.upsert({
  where: {
    workspaceId_customerId_productKey: {
      workspaceId: input.workspaceId,
      customerId: workspace.ownerCustomerId,
      productKey: input.productKey
    }
  },
  update: { status: "active", role: "owner" },
  create: {
    workspaceId: input.workspaceId,
    customerId: workspace.ownerCustomerId,
    productKey: input.productKey,
    role: "owner",
    status: "active"
  }
});
```

- [ ] **Step 4: Update admin routes**

In `/admin/customers/:id`, include workspaces:

```ts
include: {
  workspaceMembers: {
    include: {
      workspace: {
        include: {
          entitlements: true,
          members: { include: { customer: true } },
          productMembers: true
        }
      }
    }
  },
  subscriptions: true
}
```

In `/admin/entitlements`, map `workspace_id` and `seats_limit` to service input.

- [ ] **Step 5: Add admin tests**

Add tests:

```ts
it("grants entitlement to a workspace and creates owner product seat", async () => {});
it("blocks a workspace entitlement", async () => {});
it("grants a trial to a workspace", async () => {});
```

Each test should assert `entitlement.workspaceId`, `entitlement.seatsLimit`, and an active `workspaceProductMember`.

- [ ] **Step 6: Run tests**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test -- src/modules/admin/admin.routes.test.ts src/modules/entitlements/entitlements.service.test.ts
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
git add apps/account-api/src/modules/admin apps/account-api/src/modules/entitlements
git commit -m "feat: manage workspace entitlements"
```

## Task 5: Plataforma Account Response Types

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/account/client.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/frontend/src/auth/accountAccess.ts`

- [ ] **Step 1: Update backend Account response types**

In `account/client.ts`, extend types:

```ts
export type AccountWorkspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

export type AccountAccessDecision = {
  allowed: boolean;
  workspace_id?: string;
  workspace_role?: string;
  product_key: string;
  product_role?: string;
  status: string;
  plan?: string;
  source?: string;
  seats_limit?: number;
  limits?: Record<string, unknown>;
  reason: string;
  upgrade_url?: string;
};

export type AccountMeProductsResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  workspace: AccountWorkspace | null;
  products: Array<{
    product_key: string;
    name: string;
    description: string | null;
    app_url: string;
    marketing_url: string | null;
    status: string;
    plan?: string;
    allowed: boolean;
    reason: string;
  }>;
};
```

Update sync response:

```ts
export async function syncAccountCustomer(clerkToken: string, input: AccountSyncCustomerInput) {
  return accountRequest<{
    customer_id: string;
    clerk_user_id: string;
    email: string;
    workspace: AccountWorkspace;
  }>("/customers/sync", clerkToken, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
```

- [ ] **Step 2: Update frontend AccountAccessState**

In `accountAccess.ts`, add workspace:

```ts
export type AccountWorkspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

export type AccountAccessState = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  workspace: AccountWorkspace | null;
  products: AccountProductAccess[];
};
```

Update `normalizeAccountAccessState` to parse `workspace`:

```ts
const workspaceSource = source.workspace && typeof source.workspace === "object" && !Array.isArray(source.workspace)
  ? source.workspace as Record<string, unknown>
  : null;

workspace: workspaceSource && typeof workspaceSource.id === "string" && typeof workspaceSource.name === "string"
  ? {
      id: workspaceSource.id,
      name: workspaceSource.name,
      type: typeof workspaceSource.type === "string" ? workspaceSource.type : "individual",
      role: typeof workspaceSource.role === "string" ? workspaceSource.role : "member"
    }
  : null,
```

- [ ] **Step 3: Run frontend tests**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/frontend test -- src/core/ModuleHubPage.test.tsx src/services/api.test.ts
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/frontend run build
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add apps/backend/src/account/client.ts apps/frontend/src/auth/accountAccess.ts
git commit -m "feat: carry account workspace context"
```

## Task 6: Plataforma Organization Mapping

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/db.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/coreRoutes.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/internalAuth.ts`
- Create: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/account/workspaceMapping.ts`
- Create: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/account/workspaceMapping.test.ts`

- [ ] **Step 1: Add organization mapping columns**

In `initDb`, after `organization` table creation, add:

```ts
ensureColumn("organization", "account_workspace_id", "account_workspace_id text");
```

Then add a unique index:

```ts
db.exec(`
  create unique index if not exists idx_organization_account_workspace_id
    on organization(account_workspace_id)
    where account_workspace_id is not null;
`);
```

- [ ] **Step 2: Create mapping service tests**

Create `workspaceMapping.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { assignTestDbPath } from "../test/testDb.js";
import { initDb } from "../db.js";
import { findOrCreateOrganizationForAccountWorkspace } from "./workspaceMapping.js";

test("findOrCreateOrganizationForAccountWorkspace creates isolated organization", () => {
  assignTestDbPath("account-workspace-org-create");
  initDb();

  const org = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: "workspace-acme",
    workspaceName: "Acme Ltda",
    workspaceType: "company"
  });

  assert.equal(org.account_workspace_id, "workspace-acme");
  assert.equal(org.name, "Acme Ltda");

  const again = findOrCreateOrganizationForAccountWorkspace({
    accountWorkspaceId: "workspace-acme",
    workspaceName: "Acme Renamed",
    workspaceType: "company"
  });

  assert.equal(again.id, org.id);
  assert.equal(again.name, "Acme Ltda");
});
```

- [ ] **Step 3: Implement mapping service**

Create `workspaceMapping.ts`:

```ts
import { db, uuid } from "../db.js";

type AccountWorkspaceInput = {
  accountWorkspaceId: string;
  workspaceName: string;
  workspaceType: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  account_workspace_id: string | null;
  is_active: number;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

export function findOrCreateOrganizationForAccountWorkspace(input: AccountWorkspaceInput): OrganizationRow {
  const existing = db.prepare(`
    select id, name, slug, account_workspace_id, is_active
    from organization
    where account_workspace_id = ?
    limit 1
  `).get(input.accountWorkspaceId) as OrganizationRow | undefined;

  if (existing) return existing;

  const id = uuid("org");
  const nowIso = new Date().toISOString();
  const name = input.workspaceName.trim() || "Workspace";
  const slug = `${slugify(name)}-${input.accountWorkspaceId.slice(0, 8)}`;

  db.prepare(`
    insert into organization (id, name, slug, account_workspace_id, is_active, created_at, updated_at)
    values (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, slug, input.accountWorkspaceId, nowIso, nowIso);

  return db.prepare(`
    select id, name, slug, account_workspace_id, is_active
    from organization
    where id = ?
  `).get(id) as OrganizationRow;
}
```

- [ ] **Step 4: Allow createInternalUser organization override**

In `internalAuth.ts`, extend payload:

```ts
organization_id?: string | null;
```

Change insert value from hardcoded `'org-holand'` to:

```ts
payload.organization_id ?? "org-holand",
```

Add update helper:

```ts
export function updateInternalUserOrganization(userId: string, organizationId: string) {
  const nowIso = new Date().toISOString();
  db.prepare(`
    update internal_user
    set organization_id = ?, updated_at = ?
    where id = ?
  `).run(organizationId, nowIso, userId);
}
```

- [ ] **Step 5: Update bootstrap**

In `coreRoutes.ts`, after `readAccountProducts(clerkToken)`:

```ts
const accountWorkspace = accountProducts.workspace;
if (!accountWorkspace) {
  return res.status(403).json({
    message: "Workspace da Prymeira Account não encontrado.",
    reason: "no_account_workspace"
  });
}

const organization = findOrCreateOrganizationForAccountWorkspace({
  accountWorkspaceId: accountWorkspace.id,
  workspaceName: accountWorkspace.name,
  workspaceType: accountWorkspace.type
});
```

When creating internal user:

```ts
organization_id: organization.id
```

When user already exists and `internalUser.organization_id !== organization.id`, update it:

```ts
if (internalUser.organization_id !== organization.id) {
  updateInternalUserOrganization(internalUser.id, organization.id);
  internalUser = readInternalUserByUsernameForAuth(email);
}
```

- [ ] **Step 6: Preserve current Yohann local data**

Run a one-time SQLite mapping after this task lands:

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
ACCOUNT_WORKSPACE_ID=$(docker exec -i prymeira-account-postgres psql -U postgres -d prymeira_account -t -A -c "select w.id from workspaces w join customers c on c.id = w.owner_customer_id where c.email = 'yohannreimer20@gmail.com' limit 1;")
sqlite3 apps/backend/data/app.db "update organization set account_workspace_id = '$ACCOUNT_WORKSPACE_ID' where id = 'org-holand';"
```

Expected:

```bash
sqlite3 -header -column apps/backend/data/app.db "select id, name, account_workspace_id from organization;"
```

shows `org-holand` with Yohann's Account workspace id.

- [ ] **Step 7: Run backend tests**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/account/workspaceMapping.test.ts
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/backend run build
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add apps/backend/src/db.ts apps/backend/src/coreRoutes.ts apps/backend/src/internalAuth.ts apps/backend/src/account/workspaceMapping.ts apps/backend/src/account/workspaceMapping.test.ts
git commit -m "feat: map account workspaces to organizations"
```

## Task 7: Financeiro Fail-Closed Tenant Context

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/finance/routes.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/finance/finance.test.ts`

- [ ] **Step 1: Add missing-tenant test**

In `finance.test.ts`, add:

```ts
test("Financeiro fails closed when authenticated user has no organization", async () => {
  const dbPath = assignTestDbPath("finance-missing-organization");
  const app = createApp({ forceDbRefresh: true, enforceInternalAuth: true, enforceAccountProductAccess: false });

  createInternalUser({
    username: "no-org@example.com",
    display_name: "No Org",
    password: "secret",
    role: "supremo",
    permissions: ["finance.read"],
    organization_id: null
  });

  db.prepare("update internal_user set organization_id = null where username = ?").run("no-org@example.com");

  const loginRes = await request(app)
    .post("/auth/login")
    .send({ username: "no-org@example.com", password: "secret" });

  const res = await request(app)
    .get("/finance/overview")
    .set("Authorization", `Bearer ${loginRes.body.token}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.reason, "missing_tenant");
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/finance/finance.test.ts --test-name-pattern "missing organization"
```

Expected before implementation:

```txt
expected 403, received 200
```

- [ ] **Step 3: Remove `org-holand` fallback**

In `finance/routes.ts`, replace:

```ts
return context.organization_id ?? "org-holand";
```

with:

```ts
if (!context.organization_id) {
  throw Object.assign(new Error("Tenant obrigatório para acessar o Financeiro."), {
    statusCode: 403,
    reason: "missing_tenant"
  });
}
return context.organization_id;
```

Add finance route error middleware or wrap `readFinanceOrganizationId` call sites so the thrown object returns:

```ts
return res.status(403).json({
  message: "Tenant obrigatório para acessar o Financeiro.",
  reason: "missing_tenant"
});
```

Use a small helper:

```ts
function readFinanceOrganizationIdOrRespond(res: Response): string | null {
  const context = readInternalAuthContext(res);
  if (!context?.organization_id) {
    res.status(403).json({
      message: "Tenant obrigatório para acessar o Financeiro.",
      reason: "missing_tenant"
    });
    return null;
  }
  return context.organization_id;
}
```

For each route, change:

```ts
organization_id: readFinanceOrganizationId(res)
```

to:

```ts
const organizationId = readFinanceOrganizationIdOrRespond(res);
if (!organizationId) return;
// ...
organization_id: organizationId
```

- [ ] **Step 4: Add cross-tenant Financeiro test**

Add test:

```ts
test("Financeiro keeps two organizations isolated", async () => {
  const dbPath = assignTestDbPath("finance-cross-tenant");
  const app = createApp({ forceDbRefresh: true, enforceInternalAuth: true, enforceAccountProductAccess: false });

  db.prepare("insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)").run("org-a", "Org A", "org-a", new Date().toISOString(), new Date().toISOString());
  db.prepare("insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)").run("org-b", "Org B", "org-b", new Date().toISOString(), new Date().toISOString());

  createInternalUser({ username: "a@example.com", display_name: "A", password: "secret", role: "supremo", permissions: ["finance.read", "finance.write"], organization_id: "org-a" });
  createInternalUser({ username: "b@example.com", display_name: "B", password: "secret", role: "supremo", permissions: ["finance.read", "finance.write"], organization_id: "org-b" });

  const loginA = await request(app).post("/auth/login").send({ username: "a@example.com", password: "secret" });
  const loginB = await request(app).post("/auth/login").send({ username: "b@example.com", password: "secret" });

  await request(app)
    .post("/finance/accounts")
    .set("Authorization", `Bearer ${loginA.body.token}`)
    .send({ name: "Conta A", kind: "bank", currency: "BRL", is_active: true })
    .expect(201);

  const accountsA = await request(app).get("/finance/accounts").set("Authorization", `Bearer ${loginA.body.token}`).expect(200);
  const accountsB = await request(app).get("/finance/accounts").set("Authorization", `Bearer ${loginB.body.token}`).expect(200);

  assert.equal(accountsA.body.accounts.some((account: { name: string }) => account.name === "Conta A"), true);
  assert.equal(accountsB.body.accounts.some((account: { name: string }) => account.name === "Conta A"), false);
});
```

- [ ] **Step 5: Run finance tests**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/finance/finance.test.ts --test-name-pattern "Financeiro"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/backend run build
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add apps/backend/src/finance/routes.ts apps/backend/src/finance/finance.test.ts
git commit -m "fix: enforce finance tenant context"
```

## Task 8: Orquestrador Tenant Schema Migration

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/db.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/test/dbIsolation.test.ts`

- [ ] **Step 1: Add organization columns**

In `initDb`, after creating legacy tables and before indexes, call:

```ts
[
  "company",
  "technician",
  "cohort",
  "company_module_progress",
  "company_module_activation",
  "cohort_module_block",
  "cohort_schedule_day",
  "cohort_allocation",
  "cohort_participant",
  "cohort_participant_module",
  "company_optional_progress",
  "company_license",
  "license_program",
  "calendar_activity",
  "planning_workspace",
  "planning_workspace_client",
  "planning_cohort",
  "planning_conflict",
  "planning_recommendation",
  "implementation_kanban_card",
  "support_ticket",
  "recruitment_candidate"
].forEach((table) => {
  ensureColumn(table, "organization_id", "organization_id text");
  db.prepare(`update ${table} set organization_id = ? where organization_id is null`).run(DEFAULT_ORGANIZATION_ID);
});
```

Then rebuild tables that need tenant-safe uniqueness:

```txt
company: unique(organization_id, name), unique(organization_id, id)
technician: unique(organization_id, name), unique(organization_id, id)
cohort: unique(organization_id, code), unique(organization_id, id)
license_program: unique(organization_id, name), unique(organization_id, id)
planning_workspace: unique(organization_id, id)
calendar_activity: unique(organization_id, id)
```

Use the existing rebuild pattern in `db.ts` for financial tables as the template: create `<table>_new`, insert selected columns with `coalesce(organization_id, DEFAULT_ORGANIZATION_ID)`, drop old table, rename new table.

- [ ] **Step 2: Add indexes**

Add:

```ts
db.exec(`
  create index if not exists idx_company_org_status on company(organization_id, status);
  create index if not exists idx_technician_org_name on technician(organization_id, name);
  create index if not exists idx_cohort_org_start on cohort(organization_id, start_date);
  create index if not exists idx_calendar_activity_org_start on calendar_activity(organization_id, start_date);
  create index if not exists idx_planning_workspace_org_status on planning_workspace(organization_id, status, updated_at desc);
  create index if not exists idx_company_license_org_company on company_license(organization_id, company_id);
`);
```

- [ ] **Step 3: Add schema test**

In `dbIsolation.test.ts`, add:

```ts
test("core Orquestrador tables include organization_id", () => {
  assignTestDbPath("orquestrador-tenant-schema");
  initDb();

  const tables = [
    "company",
    "technician",
    "cohort",
    "company_module_progress",
    "company_license",
    "license_program",
    "calendar_activity",
    "planning_workspace"
  ];

  for (const table of tables) {
    const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === "organization_id"), true, `${table} missing organization_id`);
  }
});
```

- [ ] **Step 4: Run schema tests**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/test/dbIsolation.test.ts --test-name-pattern "organization_id"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/backend run build
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add apps/backend/src/db.ts apps/backend/src/test/dbIsolation.test.ts
git commit -m "feat: add tenant columns to orquestrador schema"
```

## Task 9: Orquestrador Route Tenant Enforcement

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/coreRoutes.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/planning/routes.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/planning/service.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/cohortSchedule.test.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/cohortSuggestions.test.ts`
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/src/planning/planning.test.ts`

- [ ] **Step 1: Add core tenant helper**

In `coreRoutes.ts`, add:

```ts
function readRequiredOrganizationId(res: Response) {
  const context = readInternalAuthContext(res);
  if (!context?.organization_id) {
    return null;
  }
  return context.organization_id;
}

function sendMissingTenant(res: Response) {
  return res.status(403).json({
    message: "Tenant obrigatório para acessar a Plataforma Modular.",
    reason: "missing_tenant"
  });
}
```

At the top of each private core route handler:

```ts
const organizationId = readRequiredOrganizationId(res);
if (!organizationId) return sendMissingTenant(res);
```

- [ ] **Step 2: Update list queries**

Change tenant-owned reads from:

```sql
select * from company order by name
```

to:

```sql
select * from company where organization_id = ? order by name
```

and call:

```ts
.all(organizationId)
```

Apply the same pattern to `technician`, `cohort`, `company_module_progress`, `company_license`, `license_program`, and `calendar_activity` queries in `coreRoutes.ts`.

- [ ] **Step 3: Update single-resource queries**

Change:

```sql
select * from company where id = ?
```

to:

```sql
select * from company where organization_id = ? and id = ?
```

and call:

```ts
.get(organizationId, id)
```

Return 404 when not found:

```ts
if (!row) return res.status(404).json({ message: "Recurso não encontrado." });
```

- [ ] **Step 4: Update creates**

Change inserts into tenant-owned tables to include `organization_id`.

Example:

```sql
insert into company (id, organization_id, name, status, notes, priority)
values (?, ?, ?, ?, ?, ?)
```

with:

```ts
.run(id, organizationId, name, status, notes, priority)
```

- [ ] **Step 5: Update planning routes/services**

In `planning/routes.ts`, require organization id from auth context and pass it into service calls:

```ts
const organizationId = readRequiredOrganizationId(res);
if (!organizationId) return sendMissingTenant(res);
const result = listPlanningWorkspaces({ organization_id: organizationId });
```

In `planning/service.ts`, update functions to accept:

```ts
type TenantInput = { organization_id: string };
```

Every planning query must include `organization_id = ?`.

- [ ] **Step 6: Add cross-tenant Orquestrador test**

Add a test that:

1. Creates `org-a` and `org-b`.
2. Creates a `supremo` user in each org.
3. User A creates a company.
4. User B lists companies and does not see A's company.
5. User B tries to read A's company by id and receives 404.

Test skeleton:

```ts
test("Orquestrador keeps companies isolated by organization", async () => {
  assignTestDbPath("orquestrador-company-isolation");
  const app = createApp({ forceDbRefresh: true, enforceInternalAuth: true, enforceAccountProductAccess: false });

  const nowIso = new Date().toISOString();
  db.prepare("insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)").run("org-a", "Org A", "org-a", nowIso, nowIso);
  db.prepare("insert into organization (id, name, slug, is_active, created_at, updated_at) values (?, ?, ?, 1, ?, ?)").run("org-b", "Org B", "org-b", nowIso, nowIso);

  createInternalUser({ username: "a@example.com", display_name: "A", password: "secret", role: "supremo", permissions: INTERNAL_PERMISSION_KEYS, organization_id: "org-a" });
  createInternalUser({ username: "b@example.com", display_name: "B", password: "secret", role: "supremo", permissions: INTERNAL_PERMISSION_KEYS, organization_id: "org-b" });

  const loginA = await request(app).post("/auth/login").send({ username: "a@example.com", password: "secret" });
  const loginB = await request(app).post("/auth/login").send({ username: "b@example.com", password: "secret" });

  const createRes = await request(app)
    .post("/companies")
    .set("Authorization", `Bearer ${loginA.body.token}`)
    .send({ name: "Cliente Org A", status: "Ativo" })
    .expect(201);

  const listB = await request(app)
    .get("/companies")
    .set("Authorization", `Bearer ${loginB.body.token}`)
    .expect(200);

  assert.equal(listB.body.some((client: { id: string }) => client.id === createRes.body.id), false);

  await request(app)
    .get(`/companies/${createRes.body.id}`)
    .set("Authorization", `Bearer ${loginB.body.token}`)
    .expect(404);
});
```

- [ ] **Step 7: Run core tests**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/cohortSchedule.test.ts apps/backend/src/cohortSuggestions.test.ts apps/backend/src/planning/planning.test.ts
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/backend run build
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add apps/backend/src/coreRoutes.ts apps/backend/src/planning apps/backend/src/*test.ts
git commit -m "fix: scope orquestrador data by organization"
```

## Task 10: End-To-End Local Verification

**Files:**
- Modify: `/Users/yohannreimer/Documents/Plataforma Modular/docs/prymeira-account-local-test.md`

- [ ] **Step 1: Update local testing docs**

Add this section:

```md
## Multi-Tenant Local Test

1. Start Account API, Plataforma backend, and frontend.
2. Login with `yohannreimer20@gmail.com`.
3. Confirm hub shows active products.
4. Confirm Account API has a workspace for the user.
5. Create a second Clerk user.
6. Login as the second user.
7. Confirm Account API creates a second workspace.
8. Grant Financeiro to the second workspace.
9. Confirm the second user sees empty/isolated Financeiro data.
10. Confirm changing IDs in the URL never reveals Yohann workspace data.
```

- [ ] **Step 2: Run health checks**

```bash
curl -sS http://localhost:3001/health
curl -sS http://localhost:4000/health
curl -sS http://localhost:5173 >/dev/null && echo frontend_ok
```

Expected:

```txt
{"ok":true}
{"ok":true}
frontend_ok
```

- [ ] **Step 3: Verify database state**

```bash
docker exec -i prymeira-account-postgres psql -U postgres -d prymeira_account -c "
select c.email, w.name, wm.role, e.product_key, e.status, e.seats_limit
from customers c
join workspace_members wm on wm.customer_id = c.id
join workspaces w on w.id = wm.workspace_id
left join entitlements e on e.workspace_id = w.id
order by c.email, e.product_key;"
```

Expected:

```txt
Every customer has a workspace membership.
Entitlements are attached to workspace ids.
```

```bash
sqlite3 -header -column "/Users/yohannreimer/Documents/Plataforma Modular/apps/backend/data/app.db" "
select id, name, account_workspace_id from organization order by name;"
```

Expected:

```txt
Each Account workspace used by Plataforma has one local organization.
```

- [ ] **Step 4: Run focused test suite**

```bash
cd "/Users/yohannreimer/Documents/Prymeira Account"
PATH=/opt/homebrew/opt/node@22/bin:$PATH pnpm --filter @prymeira/account-api test

cd "/Users/yohannreimer/Documents/Plataforma Modular"
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/backend run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm --workspace apps/frontend run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsx --test apps/backend/src/account/workspaceMapping.test.ts apps/backend/src/finance/finance.test.ts apps/backend/src/test/dbIsolation.test.ts
```

- [ ] **Step 5: Commit docs**

```bash
cd "/Users/yohannreimer/Documents/Plataforma Modular"
git add docs/prymeira-account-local-test.md
git commit -m "docs: add multi-tenant local test flow"
```

## Self-Review Notes

- Spec coverage: Account workspaces, seats, workspace entitlements, Plataforma mapping, Financeiro hardening, Orquestrador migration, and local verification are covered.
- Placeholder scan: The plan contains no unfinished markers or undefined post-work placeholders.
- Type consistency: The same terms are used throughout: `workspace_id` in Account API, `account_workspace_id` on local organizations, `organization_id` inside Plataforma app data.
- Risk: Task 9 touches many existing Orquestrador queries. Execute it in small commits and run focused tests after each route group if the implementation becomes larger than expected.
