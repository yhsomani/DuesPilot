# DuesPilot — Changelog

All notable changes, tracked against the implementation TODO (see `docs/MASTER_TODO.md` for full item statuses and verification notes).

## [0.1.0] — 2026-09-04 (work-in-progress baseline, uncommitted beyond `83e6ebd`)

### Added — Phase 1: Target domain
- `docs/MASTER_TODO.md` tracker (63 TODOs, Phases 0–15, ND register).
- `docs/product/*` — PRD, BRD, requirement traceability, feature status, page/component inventory, gap register, production-readiness checklist, credentials & integrations matrix (reconciled to current state).

### Added — Phase 2: Code foundation
- `src/lib/errors.ts` — typed `DomainError` hierarchy + zod adapter.
- `src/lib/audit.ts` — audit logging wired into register/import/settings.
- `src/lib/rate-limit.ts` — token bucket (register IP 5/10min; authenticated mutations 300/min/user).
- `src/lib/invoice-status.ts`, `src/lib/risk-score.ts` — derived status + debt-profile risk scoring.
- `src/lib/transactions.ts` — `withTx()` transaction wrapper.
- `proxy.ts` — removed dot-path bypass; explicit static-extension allowlist; role-aware redirect target.
- RBAC enforcement across all endpoints (ACTION_ROLES / MANAGE_ROLES / OWNER-only).

### Added — Phase 3/4/5/6: P0 collections loop
- Promises: create, edit/renegotiate/mark-kept, ACTIVE→BROKEN auto-sweep endpoint (idempotent, CRON_SECRET bearer, `timingSafeEqual`), promises UI.
- Payments: FIFO/explicit allocation, partial/multi/overpay/unmatched, reversal, duplicate guard, promise auto-KEPT, invoice status transitions, payments UI.
- Collection events + queue "Log outcome" modal + customer-detail actions.
- Disputes: create/resolve with categories; disputed-only balances excluded from queue.

### Added — Phase 7–9: Customers, import, search
- Customer CRUD, contacts CRUD, dedupe warnings + manual merge (transactional, audited).
- Transactional CSV import with per-row validation, duplicate detection, honest counts.
- Server-side search + cursor pagination for customers/invoices; invoice detail page (items, allocations, timeline); first-run onboarding CTAs.

### Added — Phase 10–11: Trust, notifications
- CSV/JSON full-data export; account deletion (purge + cascade, OWNER-only, typed confirm); password reset (hashed 15-min tokens, identity-blind response); logout.
- In-app notification feed + bell + broken-promise dashboard banner + preference toggles (schema pending migration).

### Added — Phase 12–13: Analytics, settings/team
- Metrics service: DSO, CEI, promise adherence, overdue ratio, 6-month collections series; analytics page (KPI cards, chart, pipeline health, top overdue).
- Team invites + role assignment + `syncUsersCount` + last-owner protection.
- Org settings: profile + business hours / holidays / working days / automation pause (columns pending migration).

### Added — Phase 14: Quality, security, observability
- Vitest 3.2.7; 51 unit tests for dates/risk-score/invoice-status/utils/payment-allocation/queue-item; pure modules extracted and wired (`payment-allocation.ts`, `queue-item.ts`).
- CI: `.github/workflows/ci.yml` (quality → integration[postgres:17] → build).
- Accessibility: dialog semantics, Escape-to-close, initial focus, aria labels, dual-color status.
- UX states: loading/error `role=alert`/empty/retry with `retryKey` pattern; destructive confirmations.
- Security: CSP + security headers (`next.config.ts`), session maxAge 7d, `timingSafeEqual` CRON check, `.env.example` → `AUTH_SECRET`/`AUTH_URL`/`CRON_SECRET`.
- Payments reconciliation: **unallocated filter + manual allocation** (`POST /api/payments/:id/allocate`, allocation modal, `PAYMENT_ALLOCATE` audit).
- Idempotency: `IdempotencyKey` model + `consumeIdempotencyKey` (atomic in-tx, 409 on replay, rollback-on-failure enables retry) wired into payment, promise, and import creation; clients send `Idempotency-Key`. *(table migration pending — DB down)*.
- Observability: `x-request-id` + structured JSONL logs in `withAuth` and `/api/export`.
- Dependency hygiene: removed `date-fns`, `@auth/prisma-adapter`, `pg`; moved `dotenv` (Prisma-config-only) to devDependencies; upgraded vitest (critical advisory GHSA-5xrq-8626-4rwp).

### Added — Phase 15: Documentation & marketing sync
- `docs/AUDIT.md` rewritten to current state.
- New root/docs docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/TEST_STRATEGY.md`, `docs/CHANGELOG.md`.
- `docs/product/*` reconciled against live code.
- Marketing-claims reconciliation (gate unbuilt features) — see TODO-062.
- Phase-1 specs (previously missing): `docs/PRODUCT_SPEC.md`, `docs/DOMAIN_MODEL.md`, `docs/AUTHORIZATION.md`, `docs/METRICS.md` (TODO-003..006).

### Added — Integration test suite (TODO-051)
- RBAC extracted to `src/lib/rbac.ts` (pure: `ROLES`/`ACTION_ROLES`/`MANAGE_ROLES`/`requireRole`); `server-context.ts` re-exports it. Enables DB-free policy unit tests — now **55/55** under `npm test` (`rbac.test.ts` adds 4).
- `vitest.config.ts` excludes `*.integration.test.ts` from the unit run; `vitest.integration.config.ts` sets `fileParallelism: false`.
- Specs authored (CI-ready, run under `npm run test:integration` with postgres:17): `import-receivables`, `payments-receivables`, `queue-tenancy` (tenant isolation). Verification pending a reachable DB (blocked).

### Blocked / deferred
- Email/WhatsApp/SMS providers (042/044), billing (049), managed-prod infra + DB RLS + backups (058), Sentry (057), E2E tests (052), integration-suite *execution* (051).
- Pending migrations: `NotificationPreference`, org schedule columns, `IdempotencyKey`.
- Known: `npm audit` 4 high via Prisma (`@prisma/config`); local Postgres down (blocks migrations + integration test runs).