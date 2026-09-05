# DuesPilot — Authorization Model

> Part of `docs/` (Phase 1, TODO-005). Describes role-based access exactly as implemented (`src/lib/server-context.ts` `ROLES` / `ACTION_ROLES` / `MANAGE_ROLES`, `requireRole`, `withAuth`, `src/proxy.ts`).

## 1. Roles

Enum `Role`: `OWNER` · `ADMIN` · `FINANCE_MANAGER` · `COLLECTOR` · `SALES` · `VIEWER`.

Hierarchy for *capabilities* (not privileges): OWNER ≥ ADMIN ≥ FINANCE_MANAGER ≥ COLLECTOR; SALES and VIEWER are read-plus low-touch (SALES may view/contact context but not mutate collections).

## 2. Role groups used by endpoints

| Group | Members | Covers |
| --- | --- | --- |
| `ACTION_ROLES` | OWNER, ADMIN, FINANCE_MANAGER, COLLECTOR | Mutating collection actions: payments (record/reverse/allocate), promises (create/manage), disputes (create/resolve), collection events. |
| `MANAGE_ROLES` | OWNER, ADMIN | Import, settings (org profile/schedule), team management. |
| `OWNER` | OWNER | Account deletion (`DELETE /api/account`). |

## 3. Endpoint matrix

| Endpoint (route) | Allowed | Notes |
| --- | --- | --- |
| `POST /api/register` | Public | IP rate-limited (5/10min). |
| `POST /api/auth/forgot`, `/reset` | Public | Identity-blind forgot. |
| `GET /api/health` | Public | Liveness. |
| `POST /api/jobs/promise-sweep` | Bearer `CRON_SECRET` | `timingSafeEqual`; no session. |
| `GET /api/dashboard`, `/analytics`, `/queue`, `/customers`, `/customers/:id`, `/invoices`, `/invoices/:id`, `/payments`, `/promises`, `/notifications`, `/notifications/preferences`, `/settings`, `/team` | Any authenticated member | Read access to org-scoped data. |
| `POST/PATCH/DELETE` collection mutations (payments, promises, disputes, collection-events, customers edits, contacts) | `ACTION_ROLES` | Non-ACTION (SALES/VIEWER) → 403. |
| `POST /api/import`, `PATCH /api/settings`, `POST/PATCH/DELETE /api/team*` | `MANAGE_ROLES` | OWNER+ADMIN only. |
| `DELETE /api/account` | OWNER only | Plus typed-confirm in UI. |

## 4. Object-level rules

- **Tenant scoping**: every query filters `organizationId` from the session. A 404 is returned for ids outside the org (no cross-tenant existence leak).
- **Last-owner protection**: an OWNER cannot demote/remove themselves if they are the last OWNER in the org (`src/lib/team.ts`).
- **Payment allocation**: server clamps to the payment's unallocated remainder and each invoice's outstanding; rejections are 400/409 with messages.
- **Account deletion**: cascades organization rows (users, customers, invoices, payments, promises, disputes, events, messages, workflows, credentials, audit, tokens, preferences, idempotency keys).
- **Export**: restricted to session-confirmed identity; file responses returned directly (not through `withAuth` envelope).

## 5. Enforcement layers

1. **Route guard** (`src/proxy.ts`): session-cookie presence for `/dashboard/*` (page level); static assets allowlisted.
2. **API enforcement** (`withAuth`): resolves session → requires `userId/organizationId/role` (else 401) → global per-user mutation rate limit (300/min) → handler runs with `ctx`.
3. **Role gate** (`requireRole(ctx, group)`): checked at the top of every mutating handler; returns 403.
4. **Tenant filter** in every repo function: `where: { organizationId }`.

## 6. Session

- JWT strategy; callbacks embed `user.id`, `organizationId`, `role` in the session.
- `session.maxAge = 7 days`; logout available in the Sidebar.
- Cookie names: `authjs.session-token` (dev) / `__Secure-authjs.session-token` (HTTPS).

## 7. Pitfalls & boundaries

- RBAC is **application-level**; DB-level RLS is deferred (TODO-058). All access paths go through the same repo functions, so a missed filter is hard to introduce accidentally — but integration tests are the safety net (TODO-051).
- Invites assign a role at creation; role can be changed by OWNER/ADMIN (last-owner protected).
- Rate limiting: register per-IP; authenticated mutations per-user per-endpoint (300/min).