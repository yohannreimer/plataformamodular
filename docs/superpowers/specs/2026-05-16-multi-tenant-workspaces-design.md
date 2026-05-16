# Multi-Tenant Workspaces Design

## Goal

Turn Prymeira Digital from product access by user into product access by workspace, with strict data isolation across every app.

Every customer, including an individual buyer, gets a workspace. Users belong to workspaces. Workspaces own product entitlements and app data. A user can only access data for the workspace selected by the authenticated session.

## Core Decision

Tenant isolation is by workspace, not by individual user.

```txt
Clerk user
-> Account customer
-> Workspace membership
-> Workspace product seat
-> Workspace entitlement
-> App data filtered by workspace/organization
```

This supports both cases:

```txt
Individual client:
- workspace: Joao Silva
- members: joao@email.com
- seats: 1

Company client:
- workspace: Empresa ABC
- members: owner@empresa.com, financeiro@empresa.com, assistente@empresa.com
- seats: 3
```

No app should read or write customer data by email, Clerk user id, or frontend-selected tenant. The backend must derive the tenant from the authenticated Account API workspace context.

## Account API Model

Add workspace-owned access to the Account API.

### workspaces

Fields:

```txt
id
name
slug
type: individual | company | internal
owner_customer_id
status: active | suspended | archived
metadata
created_at
updated_at
```

Behavior:

- Created automatically during first successful `/customers/sync` when the customer has no active workspace.
- Default type is `individual`.
- Default name is the customer name or email prefix.
- The first customer becomes `owner`.
- A customer may belong to multiple workspaces in a post-MVP account switcher. MVP selects the first active workspace returned by the Account API.

### workspace_members

Fields:

```txt
id
workspace_id
customer_id
role: owner | admin | member | billing
status: active | invited | removed | suspended
created_at
updated_at
```

Rules:

- Workspace owner can manage members inside their workspace after member management exists.
- Global/admin operators can manage any workspace.
- A removed/suspended member cannot access products or data.

### workspace_product_members

Fields:

```txt
id
workspace_id
customer_id
product_key
role: owner | admin | member | viewer
status: active | suspended | removed
created_at
updated_at
```

Purpose:

- Seats are product-specific.
- A workspace can buy 3 Financeiro seats and 1 Orquestrador seat without accidentally giving every member access to every product.
- Active rows for a product must not exceed the entitlement `seats_limit`.

MVP behavior:

- When a product entitlement is granted to a workspace, the owner gets an active product seat automatically if one does not exist.
- Manual admin grant can assign seats to specific members.
- Public invitation screens are post-MVP, but the schema supports them from the start.

### invitations

Fields:

```txt
id
workspace_id
email
role
product_keys
status: pending | accepted | expired | revoked
expires_at
created_at
updated_at
```

MVP can skip public invitation screens, but the design must reserve the concept because seats depend on inviting people into a workspace.

### entitlements

Change the entitlement owner from customer to workspace.

Target fields:

```txt
workspace_id
product_key
status: active | trial | expired | blocked | cancelled | internal
plan
source
seats_limit
starts_at
ends_at
trial_ends_at
current_period_ends_at
limits
metadata
```

Rules:

- `workspace_id + product_key` is unique.
- `seats_limit` defaults to `1`.
- Active product seats must be less than or equal to `seats_limit`.
- Existing customer entitlements should be migrated to that customer's default workspace.

## Account API Flows

### First Login

```txt
Frontend gets Clerk token
-> Plataforma calls Account API /customers/sync
-> Account API upserts customer
-> Account API creates default workspace if needed
-> Account API creates workspace_members owner membership
-> Account API returns customer + active workspace
```

### Access Check

`GET /access-check?product_key=financeiro`

The Account API must:

1. Validate Clerk token.
2. Find customer.
3. Resolve active workspace.
4. Verify active workspace membership.
5. Verify workspace entitlement for product.
6. Verify product seat assignment.
7. Validate status and dates.
8. Return an allow/deny decision with workspace context.

Response must include:

```json
{
  "allowed": true,
  "workspace_id": "uuid",
  "workspace_role": "owner",
  "product_key": "financeiro",
  "product_role": "owner",
  "status": "active",
  "plan": "internal",
  "seats_limit": 3,
  "reason": "active_entitlement"
}
```

Additional deny reasons:

```txt
no_workspace
no_workspace_membership
workspace_suspended
no_product_seat
seats_limit_reached
```

### Hub Products

`GET /me/products` should return products for the active workspace, not only for the customer.

Response includes:

```json
{
  "workspace": {
    "id": "uuid",
    "name": "Empresa ABC",
    "type": "company",
    "role": "owner"
  },
  "products": []
}
```

### Admin Grant

Admin should grant access to a workspace, not only to a user.

Minimum admin operations:

- Search customers by email.
- View customer's workspaces.
- Create workspace if necessary.
- Grant product entitlement to workspace.
- Set `seats_limit`.
- Assign product seats to members.
- Block product entitlement.
- Give trial to workspace.

## Plataforma Modular Tenant Mapping

The Plataforma Modular backend uses SQLite and already has `organization` and `internal_user.organization_id`. That should become the local tenant boundary.

Add a stable mapping:

```txt
organization.account_workspace_id unique
organization.name
organization.slug
```

Bootstrap behavior:

```txt
Account API returns workspace_id
-> Plataforma finds organization by account_workspace_id
-> if missing, creates a local organization for that workspace
-> internal_user is created/updated with that organization_id
-> internal session stores organization_id
```

Current local demo:

- Existing `org-holand` can remain as a demo/internal tenant.
- The current Yohann account can stay mapped to `org-holand` during migration so local data is not lost.
- New external users must get new organizations, never `org-holand`.

## Role Model

Separate global admin from workspace admin.

### Global Admin

Global admin means Prymeira operator.

Source:

- `ADMIN_EMAILS` / `PRYMEIRA_BOOTSTRAP_ADMIN_EMAILS` for local MVP.
- Post-MVP, Account API internal role/metadata.

Capabilities:

- See all customers/workspaces.
- Grant/block products.
- Change seats.
- Support customers.

### Workspace Role

Workspace role means admin inside one customer workspace.

Current Plataforma role `supremo` can remain for MVP, but it must be scoped to one `organization_id`.

Important rule:

```txt
supremo != global admin
```

A workspace `supremo` can manage data inside its organization only.

## App Data Isolation

All app data must belong to an organization/workspace.

### Financeiro

Financeiro already has broad `organization_id` support. The main hardening work is:

- Remove fallback behavior that silently uses `org-holand`.
- Require authenticated context with `organization_id`.
- Ensure every service call receives organization id from server auth context.
- Reject requests when context has no organization id.
- Never trust `company_id` or tenant-like values from the frontend as the isolation boundary.

### Orquestrador / Gestão Técnica

Several core tables are still global and must be migrated to include `organization_id`.

Initial table groups to tenant-scope:

```txt
company
technician
cohort
cohort_company
module_template
company_module_progress
company_optional_module
implementation/support/recruitment/license tables
planning workspaces and planning cohorts
calendar activities
docs and generated artifacts
```

Migration rules:

- Add `organization_id` to tenant-owned tables.
- Backfill existing rows to `org-holand`.
- Update unique constraints to include `organization_id`.
- Update foreign keys to use tenant-safe composite relationships where supported.
- Update every query to filter by authenticated `organization_id`.

## Backend Enforcement Rules

Every private API route must follow these rules:

1. Require internal auth/session.
2. Require Account product access for the route product.
3. Resolve tenant from authenticated context.
4. Pass tenant id to service layer.
5. Query with tenant id.
6. Create rows with tenant id.
7. Reject cross-tenant resource ids.

Forbidden patterns:

```txt
where id = ?
```

for tenant-owned resources.

Required pattern:

```txt
where organization_id = ? and id = ?
```

or an equivalent composite lookup.

## Frontend Behavior

The frontend can show workspace and product state, but it is not the security boundary.

Rules:

- Hub displays products from `/me/products`.
- Product cards use Account API allowed state.
- Frontend sends Clerk token and internal session token.
- Backend makes the final decision.
- No frontend-selected `organization_id` is trusted for isolation.

## Testing Strategy

Multi-tenant work is accepted only with tests that prove isolation.

Required test scenarios:

### Account API

- First login creates workspace and owner membership.
- Existing customer login reuses workspace.
- Entitlement belongs to workspace.
- Access check denies no workspace.
- Access check denies no workspace membership.
- Access check denies no product seat.
- Access check enforces trial expiration.
- Seat assignment cannot exceed `seats_limit`.

### Plataforma Modular

- Bootstrap creates local organization for Account workspace.
- Two Clerk users in different workspaces get different local organizations.
- Financeiro user A cannot list/read/create/update/delete user B financial data.
- Orquestrador user A cannot list/read/create/update/delete user B companies, cohorts, technicians, planning data, licenses, or docs.
- Requests with resource ids from another organization return 404 or 403, never data.
- Missing `organization_id` in auth context fails closed.

## Rollout Plan

Recommended order:

1. Add Account API workspace model and access responses.
2. Keep compatibility for existing customer-owned entitlements during migration.
3. Migrate existing entitlements to default workspace.
4. Update Plataforma bootstrap to map Account workspace to local organization.
5. Harden Financeiro by removing `org-holand` fallback.
6. Migrate Orquestrador global tables to `organization_id`.
7. Add cross-tenant regression tests.
8. Add admin UI for workspace grants and seats.
9. Add invitation/member management.

## Acceptance Criteria

The system is multi-tenant-ready when:

- Every login has a workspace.
- Every workspace has one or more members.
- Product access is checked at workspace + product seat level.
- App data is always scoped to authenticated workspace/organization.
- A second customer can be created locally and sees an empty isolated app.
- Cliente A cannot access Cliente B data by changing URLs, ids, payloads, or frontend state.
- Admin can grant Financeiro/Orquestrador to a workspace with a configurable seat limit.
- Current local admin still works and does not lose demo data.
