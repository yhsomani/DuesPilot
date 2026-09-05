# DuesPilot — Architecture

> Companion to `README.md` and `docs/API.md`. Accurate as of the current implementation (see `docs/MASTER_TODO.md`).

## 1. System overview

DuesPilot is a server-rendered Next.js 16 app that follows the **App Router** model: React Server Components for static/auth-scaffold pages and client components for interactive surfaces, backed by route handlers (`app/api/**`) that are the only path to the database. Database access is centralized in `src/lib/` modules; there is no access from UI components.

```
Browser ─► Next.js (App Router, Turbopack)
                ├─ page components  (src/app/**/page.tsx) — fetch via /api/* using api() helper
                ├─ route handlers   (src/app/api/**/route.ts) — every /api/* request
                │     └─ withAuth (src/lib/server-context.ts) — session + tenant + RBAC + rate limit + logging
                │           └─ business logic (src/lib/repo.ts, collections.ts, metrics.ts, team.ts, …)
                │                 └─ Prisma Client via @prisma/adapter-pg ──► PostgreSQL
                └─ proxy (src/proxy.ts) — session-cookie guard for /dashboard/*
```

## 2. Request lifecycle

1. **Middleware (`src/proxy.ts`)** — screens unauthenticated `/dashboard/*` (redirects to `/login?callbackUrl=…`). Static assets are allowlisted by extension; the old `pathname.includes(".")` bypass was removed.
2. **Route handler** — each `/api/*` handler either calls `withAuth(...)` (authenticated, tenant-scoped) or is public by design (auth routes, `/api/health`, `/api/register`, `/api/jobs/promise-sweep`).
3. **`withAuth`** resolves the NextAuth session (`auth()` from `src/lib/auth.ts`), rejects 401 if absent, requires the fields `userId / organizationId / role`, runs the global per-user mutation rate limit (300/min for POST/PATCH/PUT/DELETE), invokes the handler, and wraps the result in the response envelope. It assigns an `x-request-id` (correlating an inbound one if present) and emits a structured JSONL log line per request (`rid`, `method`, `path`, `status`, `durationMs`, `orgId`, `userId`, `role`).
4. **Handlers** delegate to the libraries in `src/lib/`, which always scope queries by `organizationId`.

## 3. Tenancy & authorization

- **Tenancy:** every query in `src/lib/` filters on `organizationId` (`where: { organizationId }`), and every create sets it from the session context. No cross-org read path exists in application code. (PostgreSQL RLS is planned for production hardening, `docs/MASTER_TODO.md` TODO-058.)
- **Roles:** `OWNER | ADMIN | FINANCE_MANAGER | COLLECTOR | SALES | VIEWER` (`src/lib/server-context.ts`).
- **Role gates:**
  - `ACTION_ROLES` (OWNER/ADMIN/FINANCE_MANAGER/COLLECTOR) — creating payments, promises, disputes, collection events.
  - `MANAGE_ROLES` (OWNER/ADMIN) — import, settings, team.
  - `OWNER` only — account deletion.
  - Team role assignment — `OWNER`/`ADMIN`; last owner is protected from removal.
- **Rate limiting** (`src/lib/rate-limit.ts`): in-memory token bucket (per-instance; multi-instance deployments require an external store such as Redis). Public register is IP-based (5/10 min); all authenticated mutations are 300/min per user per endpoint.

## 4. Domain model

21 models + 6 enums (`prisma/schema.prisma`). Core entities:

- `Organization` — tenant root; profile fields + schedule fields (`businessHoursStart/End`, `workingDays`, `holidays`, `automationsPaused`; columns pending migration).
- `User` / `NotificationPreference` — member + per-user notification toggles.
- `Customer` / `Contact` — customer record + contacts (primary flag).
- `Invoice` / `InvoiceItem` — receivable + line items; `InvoiceStatus` enum (`DRAFT/OPEN/DUE_SOON/OVERDUE/DISPUTED/PROMISED/PROMISE_BROKEN/PARTIALLY_PAID/PAID/CANCELLED`); **DUE_SOON/OVERDUE are derived**, never stored.
- `Payment` / `PaymentAllocation` — payment + allocation rows onto invoices.
- `PromiseToPay` — `PromiseStatus` (`ACTIVE/KEPT/BROKEN/RENEGOTIATED`).
- `Dispute` — dispute with `category` and `status`.
- `CollectionEvent` — timeline/audit-style activity on a customer (+ optional invoice).
- `Message` / `CollectionWorkflow` / `WorkflowAction` / `IntegrationCredential` — **schema-only** (email/provider workflows blocked, TODOs 042/044/049).
- `AuditLog` — audit trail for import/settings/register and other sensitive actions.
- NextAuth support: `Account`, `Session`, `VerificationToken` (unused at runtime — JWT strategy).

## 5. Business logic modules

| Module | Responsibility |
| --- | --- |
| `src/lib/repo.ts` | Tenant-scoped DB access: customers, invoices, queue, dashboard aggregates, export, notification feed, import writes. Queue rows computed via `computeQueueItem`. |
| `src/lib/collections.ts` | Payment recording: FIFO/explicit allocation (`allocatePayment`), invoice status transitions (`nextInvoiceStatus`), promise auto-keep, reversal, duplicate guards, refresh totals. |
| `src/lib/payment-allocation.ts` | **Pure** FIFO/explicit allocation + status derivation (unit-tested). |
| `src/lib/queue-item.ts` | **Pure** queue-priority computation + status views (unit-tested). |
| `src/lib/risk-score.ts` | Debt-profile risk scoring (integrated into totals refresh). |
| `src/lib/invoice-status.ts` | Derived status metadata/labels. |
| `src/lib/metrics.ts` | DSO, CEI, promise adherence, overdue ratio, collections series. |
| `src/lib/team.ts` | Invite + role assignment + `syncUsersCount`. |
| `src/lib/transactions.ts` | `withTx()` wrapper for multi-model mutations. |
| `src/lib/idempotency.ts` | `consumeIdempotencyKey(tx, …)` — records an `IdempotencyKey` inside the mutation's transaction (unique `[organizationId, key]`; P2002 → 409; rollback on failure allows retry). Wired into payment/promise/import creation. |
| `src/lib/audit.ts` | Audit-log helper. |
| `src/lib/rate-limit.ts` | Token-bucket rate limiting. |
| `src/lib/errors.ts` | Typed domain errors (`DomainError` + subclasses, zod adapter). |
| `src/lib/dates.ts` / `utils.ts` | Date helpers (relative days, overdue calc) / `cn` + formatting. |
| `src/lib/server-context.ts` | `withAuth`, roles, `getSessionContext`, `ok/err/noContent`, `readJson`, structured logger. |
| `src/lib/auth.ts` | NextAuth config (Credentials, JWT session, `user.id`/`organizationId`/`role` in session, maxAge 7d). |

## 6. Frontend

- **Layouts:** `src/app/(dashboard)/dashboard/layout.tsx` — authenticated layout with `Sidebar` + `NotificationBell`.
- **Server pages (static at build):** landing `/`, auth screens (`/login`, `/register`, `/forgot-password`, `/reset-password`).
- **Client data pages:** each dashboard page is a client component using the `api()/apiPost/apiPatch` helpers (`src/lib/api.ts`) with loading / error (`role="alert"` + retry) / empty states.
- **Accessibility:** dialogs use `role=dialog`/`aria-modal`/`aria-labelledby` + Escape-to-close + initial focus; status pills are color+text dual.

## 7. Observability & security

- Structured JSONL logs with `x-request-id` correlation (see §2); `/api/health` does a live `SELECT 1` (200/503).
- CSP + security headers in `next.config.ts`; `frame-ancestors 'none'`; no cross-origin endpoints (CSRF mitigated by SameSite cookies).
- `CRON_SECRET` bearer compared via `crypto.timingSafeEqual` on `/api/jobs/promise-sweep`.

## 8. Testing & CI

- Unit: `npm test` — 65 tests across 9 files in `src/lib/__tests__` + `rbac.test.ts` (Vitest; pure modules).
- Integration: `npm run test:integration` — harness + config ready (`vitest.integration.config.ts`), specs authored (`src/**/*.integration.test.ts`), Postgres-17-backed in CI; execution against local DB is pending live Postgres (TODO-051).
- CI: `.github/workflows/ci.yml` — quality → integration → build.

## 9. Deployment

See `docs/DEPLOYMENT.md`. In short: static/SSR pages deploy anywhere Next.js runs; the DB must be reachable (managed Postgres recommended). The following are **not** provisioned: scheduled sweep, external providers, backups/RLS, staging/prod.

## 10. Future / deferred

Billing & entitlements (TODO-049), email/WhatsApp/SMS providers (042/044), managed infra + cron + RLS (058), Sentry/APM (057), integration + E2E tests (051/052). Tracked in `docs/MASTER_TODO.md`.