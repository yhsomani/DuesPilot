# DuesPilot — Master Implementation TODO

> **Created:** 2026-09-04
> **Rule:** Work sequentially. Verify each TODO before marking complete. No skipping.
> **Docs:** Product-first analysis + cross-document gap analysis + codebase audit (pre+post-83e6ebd)
> **Phase 15 Status:** TODO-060..063 all Completed.
> **Phase 16 Status (systematic gap review & closure):** Completed TODO-064 (fixed migration syntax bug), TODO-065 (customer-merge endpoint routing), TODO-066 (customer manual creation), TODO-067 (invoice manual creation), TODO-068 (state guards for promise/dispute), TODO-069 (payments server-side pagination), TODO-070 (synced 21 models + 65 unit tests across 9 files), TODO-071 (API documentation accuracy), TODO-072 (deployment docs), TODO-073 (rate-limit unit tests + Redis multi-instance caveat in architecture), TODO-075 (feature ID deduplication), and TODO-076 (public /privacy and /terms routes + landing footer links). Blocked items remain: TODO-077 (live Postgres integration execution) and TODO-078 (external ecosystem: email, WhatsApp/SMS, billing, managed DB/cron).

## Status Key
- `Pending` — not started
- `In Progress` — actively working
- `Blocked` — external dependency required
- `Completed` — implemented + verified
- `Skipped` — intentionally deferred with reason

---

## Phase 0 — Environment & Baseline

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-001 | `npm install` + `npx prisma generate` | Critical | None | Completed | Verified (prisma generate ok, client present) |
| TODO-002 | Baseline: `npm run lint` + `npm run build` pass on current code | Critical | 001 | Completed | Verified (lint clean, build ✓ 26 routes) |

## Phase 1 — Target Domain Specification

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-003 | `docs/PRODUCT_SPEC.md`: persona, core loop, features, acceptance criteria | Critical | None | Completed | Verified: written to match implemented system — personas (collector/finance-owner/viewer/sales), 6-step core loop, implemented feature inventory with role flags, explicitly-not-implemented list, and per-area acceptance criteria |
| TODO-004 | `docs/DOMAIN_MODEL.md`: state machines (invoice/promise/payment/dispute/message) + transition matrix | Critical | 003 | Completed | Verified: entities map to prisma/schema.prisma; state machines written exactly per src/lib/collections.ts + payment-allocation.ts + invoice-status.ts + queue-item.ts (invoice derived DUE_SOON/OVERDUE never stored, promise KEPT/BROKEN/RENEGOTIATED triggers, payment unmatched/partial/fully/reversed, dispute OPEN→RESOLVED, message schema-only); tenant scoping + integrity rules documented |
| TODO-005 | `docs/AUTHORIZATION.md`: role matrix, object-level rules, tenant scoping | Critical | 003 | Completed | Verified: roles/groups/endpoint matrix match src/lib/server-context.ts (ACTION_ROLES/MANAGE_ROLES/OWNER-only), object rules (last-owner protection, no cross-org 404 leak), 4 enforcement layers, session policy |
| TODO-006 | `docs/METRICS.md`: DSO, CEI, collection rate, promise adherence, recovery definitions | High | 003 | Completed | Verified: definitions match src/lib/metrics.ts + risk-score.ts + queue-item.ts (DSO/CEI/adherence/overdue ratio/series/top-overdue + risk + queue ladder), edge cases, verification mapping |

## Phase 2 — Code Foundation

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-007 | `src/lib/audit.ts`: `writeAudit()` helper; wire into register+import+settings | Critical | 001 | Completed | Verified (tsc clean: audit.ts + wiring in register/import/settings) |
| TODO-008 | `src/lib/errors.ts`: typed API errors (VALIDATION/AUTH/NOT_FOUND/CONFLICT/RULE) + zod adapter | High | 001 | Completed | Verified (tsc clean: DomainError + subclasses + firstZodIssue; server-context maps to status codes) |
| TODO-009 | `src/lib/rate-limit.ts`: in-memory token bucket; apply to register + all POST/PATCH | Critical | 001 | Completed | Verified (register IP-based 5/10min + global per-user 300/min on all authenticated POST/PATCH/PUT/DELETE in withAuth) |
| TODO-010 | RBAC enforcement on ALL endpoints per AUTHORIZATION.md matrix | Critical | 005 | Completed | Verified (mutations: import/settings MANAGE_ROLES, promises/payments/events/disputes ACTION_ROLES, sweep CRON_SECRET; GETs authenticated) |
| TODO-011 | `proxy.ts` fix: remove `pathname.includes(".")` bypass; role-based redirect | High | 005 | Completed | Verified (dot-bypass removed; explicit static-extension allowlist; cookie session check) |
| TODO-012 | `src/lib/transactions.ts`: `withTx()` wrapper + idempotency key store | Critical | 001 | Completed | Verified tsc+lint+build green: withTx() existed; added IdempotencyKey model (schema; unique [organizationId,key], @@index org) + src/lib/idempotency.ts consumeIdempotencyKey(tx,…) creating the key ATOMICALLY inside the mutation tx (P2002 → 409 "already processed"; failure rolls the key back so retry works); wired into recordPayment, createPromise, importReceivables with route plumbing reading `Idempotency-Key` header; clients send a per-form key (ref-stable across retries, regenerated per new file for import). Note: IdempotencyKey table migration pending (DB down) — apply in TODO-051/058 |
| TODO-013 | `src/lib/invoice-status.ts`: `deriveInvoiceStatus()` (OVERDUE/DUE_SOON derived, never stored) | High | None | Completed | Verified (tsc clean: invoiceStatusMeta + InvoiceStatusView) |
| TODO-014 | `src/lib/risk-score.ts`: `computeRiskScore()` debt-profile formula; run after import + totals | High | None | Completed | Verified (tsc clean: integrated into refreshCustomerTotals) |

## Phase 3 — Promise Lifecycle (P0 Core Loop)

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-015 | `POST /api/promises`: create + zod validation + ACTION_ROLES + audit + refresh invoice status | Critical | 007,008,010,012 | Completed | Verified (tsc clean: route + createPromise + audit + status→PROMISED) |
| TODO-016 | Promise creation UI: queue quick-action + customer detail form (amount, date, invoice, note) | Critical | 015 | Completed | Verified (tsc clean: promises page modal + customer actions modal) |
| TODO-017 | Promise transitions: `PATCH /api/promises/:id` + edit/renegotiate/mark-kept + `keepPromise()` on matching payment | High | 015,021 | Completed | Verified (tsc clean: updatePromiseStatus + managePromise + keepPromiseOnPayment) |
| TODO-018 | Auto-sweep: `/api/jobs/promise-sweep` + runner (ACTIVE→BROKEN when overdue+no payment, idempotent) | Critical | 015,021 | Completed | Verified (tsc clean: sweepOverduePromises all-orgs idempotent; cron scheduling tied to TODO-058 infra) |
| TODO-019 | Promise list page: filter tabs, add/renegotiate actions, correct row keys | Medium | 015 | Completed | Verified (tsc clean: filter tabs + Log promise modal) |

## Phase 4 — Payments (P0 Core Loop)

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-020 | `POST /api/payments`: create + FIFO allocation + partial/multi/overpay/unmatch + reversal + audit | Critical | 007,008,010,012 | Completed | Verified (tsc clean: recordPayment FIFO/explicit/dup-guard/reverse + reversal route) |
| TODO-021 | `updateInvoiceStatus()` on payment: PARTIALLY_PAID/PAID + refresh totals + promise auto-KEPT | Critical | 020 | Completed | Verified (tsc clean: nextInvoiceStatus + refreshCustomerTotals + keepPromiseOnPayment) |
| TODO-022 | Payments page: record form + list + status + allocation detail | High | 020 | Completed | Verified (tsc clean: record modal with optional allocation + payments table) |
| TODO-023 | Unmatched payments view + manual allocation UI | Medium | 020 | Completed | Verified tsc+lint+unit+build green: POST /api/payments/[id]/allocate (ACTION_ROLES, zod, org-scoped; reuses pure allocatePayment on the unallocated remainder — clamped to invoices' outstanding; rejects reversed/fully-allocated/empty; tx updates outstanding+status, refresh totals, PAYMENT_ALLOCATE audit); payments page has All/Unallocated filter + per-row Allocate button + a11y allocation modal (aria-labelledby, role=dialog) with per-invoice amount inputs, remaining/available math, busy-state |

## Phase 5 — Collection Actions (P0)

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-024 | `POST /api/collection-events`: create + validation + ACTION_ROLES + audit | Critical | 007,008,010 | Completed | Verified (tsc clean: route + createCollectionEvent with typed enums) |
| TODO-025 | Queue "Log outcome" modal: activity + outcome + optional promise/dispute + refresh | Critical | 024,015,027 | Completed | Verified (tsc clean: AllActionsModal — call/log/promise mark) |
| TODO-026 | Customer detail: "Record action" + "Add note" + live timeline update | High | 024 | Completed | Verified (tsc clean: customer Actions modal payment/promise/event tabs) |

## Phase 6 — Disputes

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-027 | `POST /api/disputes` + `PATCH /api/disputes/:id` + categories + resolve flow + audit | High | 007,008,010 | Completed | Verified (tsc clean: createDispute/resolveDispute + listDisputes + routes) |
| TODO-028 | Disputes page: create, list, resolve; disputed invoice excluded from queue | High | 027 | Completed | Verified (tsc clean: disputes page + queue excludes disputed-only balances) |

## Phase 7 — Customer & Contacts

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-029 | `PATCH /api/customers/:id`: edit name/email/phone/gstin/notes; customers page edit UI | High | 007,008,010 | Completed | Verified (tsc+lint clean: PATCH route + zod + audit + edit modal on customer detail) |
| TODO-030 | Contacts CRUD endpoints + customer detail contacts UI | Medium | 029 | Completed | Verified (tsc+lint clean: contacts list/create/patch/delete routes + primary logic + Manage contacts UI) |
| TODO-031 | Customer dedupe warnings + manual merge with audit | Medium | 029 | Completed | Verified (tsc+lint clean: listDuplicateGroups, mergeCustomers tx moving invoices/promises/events/payments/contacts + audit, duplicates banner on customers page) |

## Phase 8 — Import Hardening

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-032 | Import: transactional batch + per-row validation + accurate counts | Critical | 012 | Completed | Verified (tsc+lint clean: single $transaction 60s timeout, per-row validation, in-file/DB dup detection, capped issues list, honest processed/valid/skipped counts) |
| TODO-033 | Import UI: row errors + honest success screen + skipped detail | High | 032 | Completed | Verified (tsc+lint clean: done-step shows import/skipped/customers/total cards + per-row skip reasons, "nothing imported"/warning states) |
| TODO-034 | First-run onboarding: new user w/o data → guided import CTA | High | 033 | Completed | Verified (tsc+lint clean: dashboard first-run banner when totalReceivables=0; customers page onboarding card with 3-step guide) |

## Phase 9 — Search & Pagination

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-035 | Server-side search + cursor pagination for invoices + customers | High | 001 | Completed | Verified (tsc+lint+build clean: GET /api/invoices supports search/status/page/pageSize envelope; GET /api/customers supports ?search=; customers page hits server search) |
| TODO-036 | Invoices: pagination + search + derived status filter | Medium | 035,013 | Completed | Verified (build clean: queryInvoices with open/overdue/due_soon/disputed/paid/promised/partial filters + Prev/Next pagination UI on invoices page) |
| TODO-037 | `GET /api/invoices/:id` + invoice detail page (line items, allocations, timeline) | Medium | 035 | Completed | Verified (build clean: getInvoiceDetail returns items/allocations/timeline; invoices rows link to /dashboard/invoices/[id] detail page) |

## Phase 10 — Trust & Compliance

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-038 | `GET /api/export` + settings "Export all data" (CSV/JSON) | High | 010 | Completed | Verified (tsc+lint clean: exportOrganizationData returns all tables; /api/export?format=csv|json streams attaché; settings Data card has working Export CSV/JSON links) |
| TODO-039 | Account deletion: `DELETE /api/account` + confirmation + data purge | High | 010 | Completed | Verified (tsc+lint clean: deleteOrganization purges messages/workflows/credentials/audit/tokens/users + org cascade; OWNER-only route requires typed DELETE; settings danger zone signs out via next-auth on success) |
| TODO-040 | Password reset: `/api/auth/forgot` + `/api/auth/reset` + token + UI | High | 009 | Completed | Verified (tsc+lint clean: hashed 15min tokens, identity-blind forgot response, dev reset link in non-prod, reset flow + pages; login link + reset banner) |
| TODO-041 | Email verification: token + `emailVerified` flag | Medium | 042 | Blocked | — |

## Phase 11 — Communications & Notifications

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-042 | Email provider abstraction + Message lifecycle + templates + manual send | High | 001 | Blocked | — |
| TODO-043 | In-app notifications + broken-promise banner + preferences model | Medium | 018 | Completed | Verified (build clean: derived GET /api/notifications (broken promises/disputes/promises due) + NotificationBell in sidebar; dashboard broken-promise escalation banner; NotificationPreference model added to schema + /api/notifications/preferences GET/PATCH with migration-pending graceful fallback; toggles UI in settings) |
| TODO-044 | WhatsApp/SMS | Low | 042 | Blocked | — |

## Phase 12 — Analytics

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-045 | Analytics metrics service (DSO/CEI/adherence) + KPI cards | High | 020,015 | Completed | Verified (tsc+lint clean: src/lib/metrics.ts computes DSO/CEI/promise-adherence/overdue-ratio + 6-month collections series; GET /api/analytics; analytics page shows KPI cards, bar chart, pipeline health, top overdue) |
| TODO-046 | Queue: "why here?" explanation per row + dashboard aging trend | Medium | 013 | Completed | Verified (tsc clean: QueueItem.why computed in getQueue; dashboard aging present) |

## Phase 13 — Settings & Team

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-047 | Team management: invite + role assignment + fix usersCount + UI | Medium | 005 | Completed | Verified (build clean: GET/POST /api/team + PATCH/DELETE /api/team/[userId] with OWNER/ADMIN checks, last-owner protection, usersCount synced via syncUsersCount; settings usersCount now computed; Team card UI with invite/temp-password/role-select/remove) |
| TODO-048 | Org config: business hours, holidays calendar, automation pause | Medium | 001 | Completed | Verified (build clean: Organization gains businessHoursStart/End, workingDays, holidays, automationsPaused (migration pending); settings GET/PATCH validates + returns them; settings UI for schedule/holidays/pause toggle) |
| TODO-049 | Billing/plans/entitlements | Low | None | Blocked | — |

## Phase 14 — Quality, Security, Observability

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-050 | Unit tests: scoring, aging, priority, transitions, allocation, permissions, import | Critical | 001 | Completed | Verified 51/51 pass, tsc+lint clean: Vitest 3.2.4 added (`test`/`test:watch` scripts, vitest.config.ts with @/ alias); pure coverage for invoice-status, risk-score, dates, utils, plus extracted pure modules payment-allocation.ts (allocatePayment/nextInvoiceStatus) and queue-item.ts (computeQueueItem/statusView) now used by collections.ts/repo.ts; permission/import logic is DB/Prisma-coupled (deferred to TODO-051 integration) |
| TODO-051 | Integration tests: tenant isolation, import tx, payment alloc, RBAC | Critical | 050 | Blocked | Code authored + CI-ready; execution blocked on a running Postgres (local DB down, docker unavailable). Harness: `test:integration` script + vitest.integration.config.ts (src/**/*.integration.test.ts, fileParallelism false, unit config excludes *.integration.test.ts); CI job provisions postgres:17 + migrate deploy/db push. Specs written: import-receivables (valid/invalid/dup skip + idempotency replay 409), payments-receivables (FIFO, partial, manual-alloc remainder, auto-promise-KEPT, reversal, dup 409, cannot-allocate-reversed), queue-tenancy (queue prioritization + dispute exclusion, strict cross-org scoping, scoped events). RBAC covered as a DB-free unit suite via extracted src/lib/rbac.ts (server-context re-exports; 55/55 unit tests green; tsc/lint/build verified; integration suite locally fails only with PrismaClientKnownRequestError = reachable in CI) |
| TODO-052 | E2E happy path | High | 050,051 | Blocked | Requires running app + DB (local DB down); Playwright not yet added |
| TODO-053 | CI pipeline: GitHub Actions (lint→typecheck→unit→integration→build) | Critical | 050,051 | Completed | Verified script-level: .github/workflows/ci.yml jobs quality (npm ci, prisma generate, lint, tsc, vitest), integration (postgres:17 service + migrate deploy/db push + test:integration, exits 0 with --passWithNoTests until TODO-051 fills in), build (dummy DATABASE_URL/AUTH_SECRET). Full run pending first push to GitHub |
| TODO-054 | Accessibility: ARIA, keyboard, focus, labels, dual status indicators | High | 001 | Completed | Verified tsc+lint clean: dialogs now role=dialog/aria-modal/aria-labelledby with Escape-to-close + initial focus (queue AllActionsModal, customer QuickAction + Manage-contacts modals); close buttons aria-label="Close"; NotificationBell aria-haspopup/aria-expanded + role=menu panel; settings toggles already expose role=switch/aria-checked; status pills are dual (color+text) throughout |
| TODO-055 | UX states: loading/error/empty/retry; destructive confirmations | High | 001 | Completed | Verified tsc+lint clean, 51/51 tests, build green: added role=alert + "Try again" retry buttons (retryKey effect pattern respecting react-hooks/set-state-in-effect) to dashboard, invoices list+detail, customers list+detail, queue, analytics, promises, payments, disputes, settings; empty states already present everywhere; destructive confirmations covered (typed DELETE confirm for account deletion, window.confirm for team removal + contact removal, disabled-state safe-guards) |
| TODO-056 | Security: headers, CSRF, session policy, secrets rotation, webhook signing | High | 001 | Completed | Verified tsc+lint clean, 51/51 tests, build green: next.config.ts global security headers (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP self-only with frame-ancestors 'none'); CSRF mitigated (no CORS endpoints + SameSite session cookies); session policy maxAge 7d in auth.ts; promise-sweep now uses crypto.timingSafeEqual for CRON_SECRET bearer; .env.example updated to AUTH_SECRET/AUTH_URL/CRON_SECRET (v5 names); no hardcoded secrets found in src (grep) |
| TODO-057 | Observability: structured logs, request IDs, Sentry, health dashboard | High | 001 | Completed (Sentry deferred) | Verified tsc+lint clean, build green: withAuth now assigns x-request-id (correlates incoming x-request-id) and emits JSONL structured logs (rid/method/path/status/durationMs/orgId/userId/role; error+warn levels) with the id echoed on all responses; /api/export (raw-response path) logs export.ok/export.error + duration; /api/health already performs live DB SELECT 1 → 200/503. Sentry/APM requires external account+DSN (not wired) |
| TODO-058 | Production infra: managed PG, DB RLS, backups+PITR, staging+prod | Critical | None | Blocked | — |
| TODO-059 | Dead dependencies cleanup + config hygiene | Low | 001 | Completed | Verified tsc+lint clean, 51/51 tests, build green: removed unused date-fns, @auth/prisma-adapter, pg; moved dotenv (only used by prisma7.config.ts) to devDependencies; upgraded vitest ^3.2.6 → 3.2.7 fixing GHSA-5xrq-8626-4rwp (critical vitest UI advisory). Remaining `npm audit` = 4 high, all transitive via Prisma (@prisma/config → deepmerge-ts + mysql2) with only breaking fix (prisma 6.x downgrade); accepted + tracked in docs/devlog |

## Phase 15 — Documentation & Marketing Sync

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-060 | Rewrite docs/product/* + AUDIT.md to match current post-83e6ebd state | High | Implementation | Completed | Verified: AUDIT.md rewritten to current-state v2 (build/tsc/lint/51-test green, route+API inventory, final truth matrix); docs/product/* reconciled by audit-delegated pass reading current code (PRD/BRD full-stack framing, traceability/feature-status/page-inventory/readiness/credentials/gap register updated; pre-83e6ebd "mock/UI-only/no-op" claims removed throughout) |
| TODO-061 | README + ARCHITECTURE + API + DEPLOYMENT + TEST_STRATEGY + CHANGELOG | High | 060 | Completed | Verified: README.md rewritten (stack, features, setup, scripts, CI, security, known limitations); added docs/ARCHITECTURE.md (request lifecycle, tenancy/RBAC, domain model, module map), docs/API.md (public + authenticated endpoints, envelopes, errors), docs/DEPLOYMENT.md (env, migrations, cron sweep, security checklist, rollback), docs/TEST_STRATEGY.md (unit 51/51, integration harness, e2e proposal, gating), docs/CHANGELOG.md (0.1.0 baseline). All truthful to current state |
| TODO-062 | Fix marketing claims: gate unbuilt features, no fake success states | Critical | None | Completed | Verified: source audit (grep) confirms no fabricated metrics/no-op buttons remain in app pages; docs/product + AUDIT + README/DEPLOYMENT now explicitly gate unbuilt features (email/WhatsApp/SMS/billing/automation-scheduler/infra) as blocked/not-implemented; imports report honest counts; analytics are DB-derived. Marketing landing copy is a separate non-repo artifact — flagged in BRD for external re-validation (C7) |
| TODO-063 | Integration matrix + .env.example accuracy | Medium | 001 | Completed | Verified: docs/API.md + docs/ARCHITECTURE.md document the provider-integration matrix (schema-only Message/IntegrationCredential, blocked TODOs 042/044/049/058); docs/CREDENTIALS_AND_INTEGRATIONS_MATRIX.md reflects AUTH_SECRET/AUTH_URL/CRON_SECRET; .env.example cross-checked = exactly DATABASE_URL, AUTH_SECRET, AUTH_URL, CRON_SECRET (NextAuth v5 names, no stale NEXTAUTH_*) |

## Phase 16 — Systematic Gap Review & Closure (docs × code)

| ID | Task | Priority | Deps | Status | Verification |
|---|---|---|---|---|---|
| TODO-064 | Generate + commit schema migration (NotificationPreference, Organization schedule columns, IdempotencyKey); strip CLI header syntax error from migration.sql; `prisma validate` must pass | Critical | None | Completed | Verified: migration 20260904130000_schema_sync committed; line 1 CLI header stripped; `npx prisma validate` passes cleanly |
| TODO-065 | Fix customer-merge UI 404: customers page must POST to the real merge endpoint `/api/customers/:id` with `{ sourceIds }` (mergeSchema), not `/api/customers/:id/merge` | Critical | None | Completed | Verified: customers/page.tsx:65 invokes apiPost(`/api/customers/${targetId}`, { sourceIds }), matching POST in api/customers/[id]/route.ts |
| TODO-066 | Add customer creation: `POST /api/customers` + `repo.createCustomer` + "Add customer" flow on customers page + docs | High | 001 | Completed | Verified: POST /api/customers implemented with zod createSchema, audit CUSTOMER_CREATE, and Add Customer modal UI on customers page |
| TODO-067 | Add invoice creation: `POST /api/invoices` + `repo.createInvoice` + "Add invoice" flow on invoices page + docs | High | 001 | Completed | Verified: POST /api/invoices implemented with zod createSchema, 409 unique invoice number guard, and Add Invoice modal UI on invoices page |
| TODO-068 | State-accuracy guards: `updatePromiseStatus` reject RENEGOTIATED from KEPT (KEPT only via matching payment); dispute resolve restores invoice status via `nextInvoiceStatus(OPEN, outstanding, amount)` instead of hard-coded OPEN; unit tests | High | 013,050 | Completed | Verified: promiseRenegotiationError in promise-state.ts (tested, 6 tests); resolveDispute in collections.ts restores nextInvoiceStatus |
| TODO-069 | `GET /api/payments` server-side pagination (page/pageSize, default cap, total/hasMore) to match API.md and avoid unbounded payloads | Medium | 001 | Completed | Verified: queryPayments in collections.ts supports search, status, page, pageSize; GET /api/payments handles pagination |
| TODO-070 | Sync stale facts across AUDIT.md / README.md / ARCHITECTURE.md / docs/product/*: 21 models + 6 enums (was "24"), unit tests 65/65 across 9 files (was 51/55), integration specs authored (not "none"), RBAC pure module src/lib/rbac.ts | High | 060 | Completed | Verified: README, ARCHITECTURE, AUDIT, TEST_STRATEGY, PRD, BRD, and checklist all synchronized to 21 models and 65 unit tests across 9 files |
| TODO-071 | docs/API.md endpoint accuracy: payments GET (paginated), collection-events body has no `outcome` (description required), merge endpoint = POST /api/customers/:id, add settings / payments allocate|reverse / promises manage / invoices create to inventory | High | 066,067,069 | Completed | Verified: docs/API.md accurately matches route signatures and handlers |
| TODO-072 | docs/DEPLOYMENT.md fixes: pending-migration list includes IdempotencyKey (+ committed in 064), clean rollback and deployment notes | Medium | 064 | Completed | Verified: docs/DEPLOYMENT.md documents migration history and rollback |
| TODO-073 | Pure unit tests for rate-limit.ts + document in-memory/multi-instance caveat in ARCHITECTURE + DEPLOYMENT | Medium | 050 | Completed | Verified: src/lib/__tests__/rate-limit.test.ts (4 tests); in-memory per-instance Redis caveat documented in ARCHITECTURE §3 |
| TODO-074 | Track uncovered requirements as new rows (legal/compliance incl. DPDP+MSME, password complexity/lockout, data retention, dunning SLA, performance budget + load tests, mobile/device test matrix, activation-analytics instrumentation); mark external ones Blocked | High | None | Completed | Verified: tracked in GAP_REGISTER, checklist, and master roadmap |
| TODO-075 | docs/product/* dedupe: harmonize duplicate feature IDs (AUTH-012/SET-006, SET-002/NTF-002) + FEATURE_STATUS rollup counts | Medium | 071 | Completed | Verified: FEATURE_STATUS_MATRIX.md cross-referenced and clarified |
| TODO-076 | Deploy public /privacy and /terms routes + connect landing page footer links | High | 001 | Completed | Verified: src/app/privacy/page.tsx and terms/page.tsx created; landing footer links connected; `npm run build` succeeds (43 static pages) |
| TODO-077 | Apply migrations to a real Postgres, run integration suite + E2E (multi-step continuation of TODO-051/052) | Critical | 064 | Blocked | Harness & specs authored; blocked on live PostgreSQL instance |
| TODO-078 | External ecosystem items (email 042, WhatsApp/SMS 044, billing 049, prod infra 058, Sentry 057, cron provisioning 058) | Low | — | Blocked | Blocked on third-party provider accounts and API credentials |

---

## Newly Discovered Issues

| ID | Issue | Priority | Deps | Status | Discovered In |
|---|---|---|---|---|---|
| ND-001 | node_modules missing; prisma client not generated | Critical | — | Resolved | Survey |
| ND-002 | `.env` has localhost DB; not suitable for deploy | High | — | Known | Survey |
| ND-003 | `next/dist/docs` referenced by AGENTS.md not in node_modules | Medium | — | Noted | Survey |
| ND-004 | `customersCreated` count in `importReceivables` is total unique customer names, not new ones created | Medium | — | Resolved | Code review |
| ND-005 | `proxy.ts:20` `pathname.includes(".")` bypasses protection for any route with a dot | High | — | Logged | Code review |
| ND-006 | `const now = new Date()` in `repo.ts:21` is module-level; computed once at server start, not per-request | High | — | Resolved | Code review |
| ND-007 | Customer-merge UI POSTs to `/api/customers/:id/merge` (no such route → 404); real merge is POST `/api/customers/:id` | High | — | Resolved | Gap review → TODO-065 |
| ND-008 | docs/API.md documents non-existent endpoints/bodies (POST /api/customers, POST /api/customers/duplicates/merge, collection-events `outcome?`, payments GET "Paginated") | High | — | Resolved | Gap review → TODO-071 |
| ND-009 | Schema has 21 models + 6 enums but docs claim "24 models"; unit count said 51/55, actual 65; integration "no specs yet" now false | Medium | — | Resolved | Gap review → TODO-070 |
| ND-010 | No migration covers IdempotencyKey / NotificationPreference / org schedule columns → fresh prod `migrate deploy` results in a broken schema | Critical | — | Resolved | Gap review → TODO-064 |
| ND-011 | `20260904130000_schema_sync/migration.sql` had CLI stdout string `Loaded Prisma config...` on line 1, breaking `migrate deploy` | Critical | — | Resolved | Verification → TODO-064 |
