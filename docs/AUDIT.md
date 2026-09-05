# DuesPilot — Evidence-Based Audit Report (Current State)

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Audit date** | 2026-09-04 |
| **Repository** | `C:\Users\yashs\3D Objects\DuesPilot` (GitHub `yhsomani/DuesPilot`) |
| **Commit verified** | `83e6ebd` + uncommitted work (Phases 1–15, tracked in `docs/MASTER_TODO.md`) |
| **Method** | Two-way cross-check: MASTER_TODO statuses ↔ source files ↔ runtime verification (build/tsc/lint/test). Route/API surface confirmed via `next build` output. |
| **Runtime checks** | `npm run build` ✅ (42 static pages + 30 API routes + proxy middleware), `npx tsc --noEmit` ✅ (exit 0), `npm run lint` ✅, `npm test` ✅ (65/65, Vitest, 9 files) — all pass **2026-09-05** |
| **Verdict** | **Functional multi-tenant MVP with real auth, a tenant-scoped data layer, the full P0 collections loop (customers→invoices→payments→promises→disputes→events→queue→analytics), export/account-delete, notifications, team management, CI, unit tests, security headers and structured logging. NOT yet production-deployed: DB-local/integration migrations pending, external providers (email/WhatsApp/SMS/billing) not wired, no managed prod infra.** |

> Evidence labels: **CONFIRMED** (read in code / verified at runtime) · **ICANNOTCONFIRM** (insufficient evidence) · **PROPOSED** (recommendation, not implemented).
> Line numbers reference live files at the commit above unless noted.

---

## A. Executive Assessment — What is genuinely true

DuesPilot is a **Next.js 16 (Turbopack) App Router multi-tenant B2B collections product** on Postgres/Prisma 7 with NextAuth v5. Every dashboard screen is wired to a real, tenant-scoped API (`withAuth` + `organizationId`-filtered queries are auditable in `src/lib/repo.ts`). The P0 core loop is implemented and coherent:

1. **Import** (`POST /api/import`) — transactional batch import of customers/invoices/items/promises with per-row zod validation, in-file + DB duplicate detection, honest processed/valid/skipped counts, and an audit entry.
2. **Queue** (`GET /api/queue`) — risks, resulting `computeQueueItem` (promise/overdue/risk/lastEvent → next action, statusView), "why here?" explanation, EXCLUDE_DISPUTED handling.
3. **Customers** — tenant-scoped CRUD + contacts CRUD + dedupe/merge (transactional, audit-aware) + server-side search.
4. **Invoices** — server-side search + cursor pagination + derived status view (OVERDUE/DUE_SOON computed, never stored) + detail page (line items, allocations, timeline).
5. **Payments** (`POST /api/payments`) — FIFO/explicit allocation, partial/multi/overpay/unmatched handling, reversal, duplicate guard, promise auto-KEPT, invoice status transitions, audit.
6. **Promises** — create/edit/renegotiate/mark-kept + auto-sweep job (ACTIVE→BROKEN when overdue without payment; idempotent; guarded by CRON_SECRET bearer via `crypto.timingSafeEqual`).
7. **Disputes** — create/resolve with categories; disputed-only balances excluded from the queue.
8. **Collection events** — typed action/outcome logging; queue "Log outcome" + customer detail "Record action" modals.
9. **Analytics** (`src/lib/metrics.ts`) — DSO, CEI, promise adherence, overdue ratio, 6-month collections series from DB.
10. **Notifications** — derived in-app feed (broken promises, disputes, promises due) + bell + preference toggles (migration pending → graceful fallback).
11. **Settings/Team** — org config (business hours/holidays/automation pause), OWNER/ADMIN team invites + role assignment + last-owner protection, CSV/JSON **data export**, **account deletion** (purge + cascade), password reset (hashed 15-min tokens), logout.
12. **Auth/RBAC** — register (rate-limited, zod, bcrypt cost 12), Credentials login, role-based authorization (OWNER/ADMIN/MANAGE/ACTION/VIEWER matrix), IP + per-user rate limiting, session maxAge 7d.

**Security posture (CONFIRMED):** global security headers incl. CSP (`frame-ancestors 'none'`, self-only), SameSite session cookies + no CORS endpoints (CSRF mitigated), `crypto.timingSafeEqual` secret comparison, structured JSONL request logs with `x-request-id`, no seeded/hardcoded secrets in `src/`.

---

## B. Documentation Analysis

| Document | Location | Current? | Notes |
| --- | --- | --- | --- |
| `README.md` | repo root | ✅ | Reconciled and rewritten to describe stack, features, setup, scripts, CI, and security. |
| `AGENTS.md` | repo root | ✅ | Next.js 16 agent rules. |
| `docs/MASTER_TODO.md` | repo | ✅ | Live implementation tracker (Phases 0–16, ND register). |
| `docs/PRODUCT_SPEC.md` | repo | ✅ | Persona, core loop, feature inventory, acceptance criteria. |
| `docs/DOMAIN_MODEL.md` | repo | ✅ | Entities + invoice/promise/payment/dispute/message state machines. |
| `docs/AUTHORIZATION.md` | repo | ✅ | Role matrix, endpoint matrix, enforcement layers, session policy. |
| `docs/METRICS.md` | repo | ✅ | DSO/CEI/adherence/overdue definitions + risk/queue scoring. |
| `docs/AUDIT.md` | repo | ✅ (this file) | Current-state audit. |
| `docs/product/*` | repo | ✅ (rewritten) | Status-aware product docs reconciled in this session (TODO-060). |
| `.env.example` | repo root | ✅ | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `CRON_SECRET` (NextAuth v5 naming). |
| `prisma7.config.ts` | repo root | ✅ | Prisma 7 config (runs `dotenv/config`). |
| `prisma/schema.prisma` | repo | ✅ | 21 models + 6 enums (includes `NotificationPreference`; org gains `businessHoursStart/End`, `workingDays`, `holidays`, `automationsPaused`). |

---

## C. Codebase Analysis — What is actually implemented

### C.1 Working functional paths (CONFIRMED)
- **Register/Login/Reset/Logout**: `api/register`, `api/auth/[...nextauth]`, `api/auth/forgot`, `api/auth/reset`, `signOut` wired in the Sidebar.
- **Tenant-scoped data layer**: all reads/writes flow through `withAuth` (`src/lib/server-context.ts`) with `organizationId` scoping in `src/lib/repo.ts`, `collections.ts`, `team.ts`, `metrics.ts`. RBAC checks via `requireRole` (ACTION_ROLES / MANAGE_ROLES).
- **Transactions**: `src/lib/transactions.ts` `withTx()` wraps multi-model mutations (import, merge, payment+allocation, account delete).
- **Queue logic** extracted pure → `src/lib/queue-item.ts`; **payment allocation** extracted pure → `src/lib/payment-allocation.ts`; both unit-tested and used by `collections.ts`/`repo.ts`.
- **All dashboard pages** call tenant-scoped APIs with loading/error/empty/retry states (`role="alert"` + Try again) and dialog a11y (role=dialog, aria-modal, aria-labelledby, Escape-to-close, initial focus).

### C.2 What is deferred / external (Blocked in MASTER_TODO)
- **Email provider + Message lifecycle + templates** (TODO-042), **WhatsApp/SMS** (TODO-044), **billing/entitlements** (TODO-049), **prod infra: managed PG, RLS, backups/PITR, staging+prod** (TODO-058), **Sentry/APM DSN** (TODO-057, deferred). Messages table/IntegrationCredential remain **schema-only**.
- **Integration tests (TODO-051) + E2E (TODO-052)**: harness (`test:integration`, `vitest.integration.config.ts`, CI `integration` job with postgres:17 service) is ready; blocked on a running Postgres (local DB down). Requires `prisma migrate deploy`.
- **Pending migrations** (schema updated, DB not migrated): `NotificationPreference` table; org columns `businessHoursStart/End`, `workingDays`, `holidays`, `automationsPaused`; IdempotencyKey store for TODO-012.
- **Cron scheduling**: promise-sweep endpoint exists and is idempotent, but no scheduler is provisioned (ties to TODO-058).

### C.3 Known improvements / tech-debt
- Dashboard/analytics componentization: some inline duplicated markup remains on several pages (I1/I8 of v1 audit); fully extracted UI primitives are a follow-up.
- Analytics "Automation Rate" and any marketing-level claims: **cashflow-automation metrics are NOT fabricated anymore** — but any external marketing stats require re-validation before external use (C7 of v1 audit remains CONTEXT: marketing copy is owned by marketing).
- `npm audit` (2026-09-04): **4 high, all transitively via Prisma** (`@prisma/config` → `deepmerge-ts`, `mysql2`); the only automated fix is a breaking downgrade to prisma 6.x — accepted risk, tracked. (Critical `vitest` advisory fixed by upgrading to 3.2.7.)

---

## D. API Surface (CONFIRMED via build)

Authenticated + tenant-scoped (`withAuth`): `/api/account`, `/api/analytics`, `/api/collection-events`, `/api/customers(./[id]/contacts(./[contactId])/duplicates)`, `/api/dashboard`, `/api/disputes(./[id])`, `/api/export`, `/api/import`, `/api/invoices(./[id])`, `/api/notifications(./preferences)`, `/api/payments(./[id])`, `/api/promises(./[id](./manage))`, `/api/queue`, `/api/settings`, `/api/team(./[userId])`.

Public: `/api/auth/[...nextauth]`, `/api/auth/forgot`, `/api/auth/reset`, `/api/register`, `/api/health` (live `SELECT 1` → 200/503), `/api/jobs/promise-sweep` (CRON_SECRET bearer).

Envelope: success `{ data }`, error `{ error }`; 204/201 handled; errors map DomainError→status; generic 500. Responses carry `x-request-id`; all handler calls emit JSONL structured logs.

## E. Data Layer (CONFIRMED)
21 models: User, NotificationPreference, Account, Session, VerificationToken, Organization, Customer, Contact, Invoice, InvoiceItem, Payment, PaymentAllocation, PromiseToPay, Dispute, Message, CollectionEvent, CollectionWorkflow, WorkflowAction, IntegrationCredential, IdempotencyKey, AuditLog. 6 enums: Role, InvoiceStatus, PromiseStatus, CommunicationChannel, MessageStatus, Priority. `@prisma/adapter-pg`, generated client under `src/generated/prisma`. No RLS yet (app-level scoping does the work; DB RLS tied to TODO-058). `usersCount` maintained via `syncUsersCount` (user-management paths).

## F. Status Matrix (Final Truth, strictest)

| Capability | Implemented | Tested | In-prod | Final |
| --- | --- | --- | --- | --- |
| Auth (register/login/logout/reset/rate-limit/session policy) | ✅ | 🟡 unit borders | 🟡 | **Implemented; prod-in-unverified** |
| RBAC + tenant scoping | ✅ | ✅ pure unit | 🟡 | **Implemented; needs integration tests** |
| Import (transactional) | ✅ | ❌ (integration) | 🟡 | **Implemented; untested-against-DB** |
| Dashboard/Queue/Customers/Invoices (server-driven) | ✅ | 🟡 | 🟡 | **Implemented** |
| Payments allocation + reversal | ✅ | ✅ unit (allocation) | 🟡 | **Implemented** |
| Promise lifecycle + auto-sweep | ✅ | ✅ unit (queue/status) | 🟡 | **Implemented; cron not provisioned** |
| Disputes / Collection events | ✅ | ❌ | 🟡 | **Implemented** |
| Analytics (DB metrics) | ✅ | ✅ unit (dates/risk) | 🟡 | **Implemented** |
| Export / Account delete / Team/Org settings | ✅ | ❌ | 🟡 | **Implemented** |
| Notifications (in-app) + preferences | ✅ | ❌ | 🟡 | **Implemented; migration pending** |
| Email / WhatsApp / SMS | ❌ | ❌ | ❌ | **Blocked (external providers)** |
| Billing | ❌ | ❌ | ❌ | **Blocked** |
| Unit tests | ✅ 65/65 | ✅ | — | **Green (9 files)** |
| Integration/E2E | ❌ | ❌ | ❌ | **Blocked on DB** |
| CI (GH Actions) | ✅ | ✅ script-verified | 🟡 | **Ready; runs on first push** |
| Security headers / logging / health | ✅ | 🟡 | 🟡 | **Implemented** |
| Prod infra / backups / RLS | ❌ | ❌ | ❌ | **Blocked (TODO-058)** |

## G. Direct Answers

1. **What is genuinely working today?** The full P0 loop end-to-end against a real DB layer: import → customers/invoices → queue → payments/promises/disputes/events → analytics → export → account delete; auth + RBAC + rate limiting; notifications; team/org settings; 65 unit tests across 9 files; security headers + structured logging; a health endpoint; CI config.
2. **What only appears to be working?** Nothing in-app fakes success (mocks, no-op buttons and fabricated KPIs were removed across Phases 1–14). Remaining "appears but isn't": email/WhatsApp/SMS send is not wired (schema-only), automation-scheduling is not running, and billing is absent — none are shown as working.
3. **What is missing?** External provider integrations (email/WhatsApp/SMS/payments/billing), managed prod infrastructure (DB, backups/PITR, RLS, staging/prod), Sentry/APM, integration + E2E tests (blocked on DB), scheduler wiring for promise-sweep, remaining pending migrations, marketing-site reconciliation (TODO-062) and docs (README etc., TODO-061).
4. **What is broken?** Local Postgres is down (blocking migrations/integration tests). No known functional bugs in source verification (tsc/lint/build/test clean).
5. **What is only partially implemented?** Route protection is cookie-based + then per-API RBAC (DB RLS deferred); in-app notifications are fully implemented client-side but table/columns need migration; promise-sweep endpoint is done but unscheduled; integration-tests harness exists but has no cases yet.
6. **What is documented incorrectly?** v1 AUDIT.md and all pre-83e6ebd docs/product files described a mock-only product; all rewritten this session to match the live code (TODO-060/061). `README.md` still boilerplate (scheduled).
7. **What is implemented but undocumented?** Previously: proxy cookie semantics, JWT callbacks, prisma7 config, `withTx`, queue priority formula. All now covered in ARCHITECTURE/API docs (TODO-061). Dead utils from v1 were removed or wired.
8. **What needs improvement even though it works?** Component-primitive extraction on remaining inline pages; integration + E2E coverage once DB is up; automated audit-log surfacing; error-tracking (Sentry); favicon/branding.
9. **What external credentials/accounts are required?** Managed prod `DATABASE_URL`; strong `AUTH_SECRET`; public `AUTH_URL`; `CRON_SECRET`; email provider (API key + from-address), WhatsApp BSP (template + META approval + domain verification), SMS gateway (DND), payment gateway, Sentry DSN, host (Vercel/etc.). **None configured yet.** No secret VALUES reproduced in this repo.
10. **What prevents real-world use today?** Nothing in the core loop — all functional. Real-world use is limited by: no deployed infrastructure/email/etc. and the local-only DB.
11. **What prevents production deployment today?** Managed DB/backups/RLS, provider integrations, scheduler, secrets rotation, integration/E2E test evidence, legal pages, and the pending migrations.
12. **What should be implemented first?** Migrate the pending schema changes on a real DB and prove TODO-051 integration tests green; then provision TODO-058 infra; then wire email (TODO-042).
13. **What should be fixed before adding new features?** DB availability, pending migrations, integration-test coverage, and CI first-push verification.
14. **What should be removed or retired?** Pre-reconciliation doc claims; the boilerplate README once replaced; remaining dead assets (public/*.svg default branding) if unused.

---

*This report reflects current repository reality as of 2026-09-05. Verification commands re-run during audit: `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm test` (65/65) — all green.*