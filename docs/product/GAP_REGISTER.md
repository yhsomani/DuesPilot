# Gap Register — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Purpose** | Consolidated register of remaining gaps (function, data, security, integration, quality, production) post-Phases 1–15, with severity, evidence, and resolution |

> Status of previously documented gaps: essentially all functional/data gaps from the mock-prototype audit were **resolved** during Phase 2–14 build-out. This register is rewritten to reflect only the **remaining** gaps, with resolved items summarized in §R for the record.

**Severity legend:** 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low/Info · ✅ Resolved (historical)

---

## R. Resolved during Phases 1–15 (historical summary — no action)

| ID | Former gap | Resolution |
| --- | --- | --- |
| GAP-001 | Import did not persist | ✅ `POST /api/import` transactional batch, per-row validation, dup detection, honest counts (TODO-032/033) |
| GAP-002 | Dashboard mock stats | ✅ `GET /api/dashboard` real aggregates (TODO-034 onboarding) |
| GAP-003 | No real priority scoring | ✅ `src/lib/queue-item.ts` + risk-score, "why here?" (TODO-046) |
| GAP-004 | Customer detail ignored `[id]` | ✅ real `[id]` fetch + 404 (TODO-029) |
| GAP-005 | No customer/invoice CRUD | ✅ customers/contacts CRUD + merge (TODO-029/030/031); invoices list/detail (TODO-035/036/037) |
| GAP-006 | Promise lifecycle not recorded | ✅ create/manage + auto-sweep (TODO-015..019) |
| GAP-007 | Promise status string mismatch | ✅ enum-aligned via `statusView` |
| GAP-008 | Payments/disputes placeholders | ✅ full payment allocation + disputes (TODO-020..023, 027/028) |
| GAP-009 | Analytics mocked | ✅ `src/lib/metrics.ts` + `/api/analytics` (TODO-045) |
| GAP-010 | No logout UI | ✅ Sidebar logout |
| GAP-011 | No password reset | ✅ forgot/reset hashed tokens (TODO-040) |
| GAP-013 | No RBAC | ✅ ACTION_ROLES / MANAGE_ROLES (TODO-010) |
| GAP-014 | No tenant scoping | ✅ app-layer `organizationId` scoping in `repo.ts` (DB RLS still pending — see GAP-NEW-2) |
| GAP-015 | No team management | ✅ `/api/team` invites/roles/last-owner (TODO-047) |
| GAP-016 | No rate limiting | ✅ register 5/10min per IP + global 300/min mutations (TODO-009) |
| GAP-025 | Domain tables never written | ✅ all core domain APIs implemented |
| GAP-026 | No audit writes | ✅ `src/lib/audit.ts` (TODO-007) |
| GAP-027 | No data export | ✅ `/api/export` CSV/JSON (TODO-038) |
| GAP-028 | No account deletion | ✅ `DELETE /api/account` OWNER purge + cascade (TODO-039) |
| GAP-030 | No tests/framework | ✅ Vitest 51/51 + scripts (TODO-050). *Integration/E2E remain blocked — see new gaps* |
| GAP-032 | No CI | ✅ `.github/workflows/ci.yml` (TODO-053) |
| GAP-033 | No loading/error/empty states | ✅ across screens (TODO-055) |
| GAP-034 | No observability | ✅ JSONL logs + `x-request-id` + `/api/health` (TODO-057; Sentry deferred) |
| GAP-035 | Lint/tsc not in CI | ✅ wired into CI quality job |
| GAP-038 | No health endpoint | ✅ `/api/health` live `SELECT 1` |
| GAP-040 | No a11y work | ✅ key dialogs + bell + toggles + dual status pills (TODO-054) |
| GAP-042 | Dead deps | ✅ trimmed (TODO-059) |
| GAP-045 | `getPriorityColor` unused | ✅ superseded by `queue-item.ts` priority pipeline |

---

## A. External-Integration Gaps (all 🔴/🟠 — BLOCKED, none negotiable for automation value)

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-A1 | No email provider → no outbound communication, no Message lifecycle, no templates, no manual send | 🔴 | `Message` schema-only; `/dashboard/communications` route exists but send **not built**; TODO-042 Blocked | Add email provider + transactional templates + manual send; then wire Message lifecycle |
| GAP-A2 | No WhatsApp provider | 🔴 | TODO-044 Blocked; requires META/BSP approval + opt-in | BSP integration + templates + opt-in |
| GAP-A3 | No SMS provider | 🟠 | TODO-044 Blocked | SMS gateway + DND compliance |
| GAP-A4 | No billing/plans/entitlements (pricing is marketing-only) | 🟠 | TODO-049 Blocked | Decide provider (BRD D2); implement plans + gating |
| GAP-A5 | AI promise extraction | 🟠 | Marketing claim only; no LLM dep | Add LLM + prompt extraction (unprioritized) |
| GAP-A6 | Payment links / gateway | 🟠 | Marketing claim only | Requires billing decision (BRD D2) |
| GAP-A7 | Bank statement import / auto-match | 🟡 | Marketing claim only | Decide provider + reconcile flow |
| GAP-A8 | Workflow/automation execution engine | 🟠 | `CollectionWorkflow`/`WorkflowAction` schema-only | Scheduler + rule evaluator once providers exist |
| GAP-A9 | `IntegrationCredential` not encrypted/used | 🟠 | Schema-only; no encryption layer/KMS | Add tenant-key encryption before storing secrets |
| GAP-A10 | No webhook/callback handlers | 🟡 | No webhook routes | Add for delivery status/payments when providers wired |

## B. Infra & Ops Gaps (Blocked on external provisioning)

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-B1 | Promise-sweep not scheduled (endpoint done, cron not provisioned) | 🟠 | `/api/jobs/promise-sweep` idempotent + `CRON_SECRET` bearer; TODO-058 | Provision scheduler/cron in prod infra |
| GAP-B2 | No DB RLS (tenant isolation is app-layer only) | 🟠 | App-layer `orgId` scoping ✅; no RLS | Enable RLS on prod managed PG (TODO-058) |
| GAP-B3 | No managed PG / backups / PITR / staging+prod | 🔴 | TODO-058 Blocked | Managed PG + backup/PITR + environments |
| GAP-B4 | Sentry DSN not wired | 🟡 | TODO-057 deferred; external account required | Create account; set DSN; verify source-maps |
| GAP-B5 | No deployment pipeline/hosting config | 🔴 | CI ready; no deploy step; TODO-058 | Define host + deploy; add CD step |

## C. Migration & Data Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-C1 | Pending migrations: `NotificationPreference`, org columns (business hours/working days/holidays/automation pause) | 🟠 | Models/columns in schema, not migrated; graceful fallback in code | Run migration; verify fallbacks retire |
| GAP-C2 | IdempotencyKey store not yet created | 🟡 | `withTx()` done (TODO-012); store/migration pending | Add idempotency table + wiring |
| GAP-C3 | PII/consent handling (DPDP 2023) undetermined | 🟡 | Export/delete implemented; no retention policy | BRD D4 + counsel |

## D. Quality & Test Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-D1 | Integration tests: 0 of harness running (RBAC, import tx, payment alloc, tenant isolation) | 🔴 | Harness + `test:integration` + CI postgres service ready; TODO-051 Blocked (local DB down) | Bring up a Postgres; fill `src/**/*.integration.test.ts` |
| GAP-D2 | E2E happy path | 🟠 | TODO-052 Blocked; Playwright not added | Add Playwright flows (auth → import → queue → payment) |
| GAP-D3 | Coverage threshold not enforced in CI | 🟡 | Unit coverage exists | Add coverage gate |
| GAP-D4 | Load/performance budgets unmeasured | 🟡 | Real queries now exist | Define + measure budgets (NFR) |
| GAP-D5 | Mobile/device testing evidence | ⚪ | — | Build a device test matrix |

## E. Security & Compliance Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-E1 | Legal pages (privacy/ToS) absent (footer text spans) | 🟡 | `page.tsx` footer | Publish routes + counsel review |
| GAP-E2 | Password complexity/lockout/expiry policy undefined | 🟡 | No rule beyond min-8 | BRD D3 decision |
| GAP-E3 | Weak/placeholder `AUTH_SECRET` in dev `.env` (prod rotation needed) | 🟠 | `.env` dev value; git-ignored | Rotate strong secret pre-prod + document rotation |
| GAP-E4 | Npm audit: 4 high (transitive via Prisma: `@prisma/config` → deepmerge-ts, mysql2) | 🟡 | `npm audit`; only fix = breaking Prisma 6 downgrade | Accepted risk; track upstream |
| GAP-E5 | OAuth/external identity providers absent | 🟡 | `Account` table only | Unprioritized; credentials login suffices |

## F. Doc & Polish Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-F1 | README/ARCHITECTURE/API/DEPLOYMENT/TEST_STRATEGY/CHANGELOG stale/default | 🟡 | TODO-061 Pending | Rewrite to match current code |
| GAP-F2 | Marketing claims overreach (Excel/Tally import, automation, payment links, AI, forecasting) | 🟡 | `page.tsx` marketing | TODO-062: gate unbuilt features; no fake success states |
| GAP-F3 | No shared UI kit (per-page markup duplication) | ⚪ | Inventory findings | Extract primitives opportunistically |
| GAP-F4 | Public assets are default Next.js SVGs; custom favicon/branding unverified | ⚪ | `public/` | Add branding (`I-cannot-confirm` current state) |
| GAP-F5 | Integration matrix / `.env.example` drift | ⚪ | TODO-063 Pending | Refresh env matrix + templates |

---

## Severity Rollup (remaining, non-resolved)

| Severity | Count |
| --- | ---: |
| 🔴 Critical | 5 (A1, A2, B3, B5, D1) |
| 🟠 High | 10 |
| 🟡 Medium | 14 |
| ⚪ Low/Info | 3 |
| **Total remaining** | **32** |

> Rollup derived from the A–F tables above; exact re-prioritization belongs to the next sprint board. Resolved historical gaps are listed in §R.

**Top blockers to full production (all blocked on external provisioning):**
1. **A1/A2 (email + WhatsApp)** — the "automated follow-up" pillar is the remaining core-value gap (TODO-042/044).
2. **B3/B5 (managed infra + deploy)** — needed before any real deployment (TODO-058).
3. **D1 (integration tests)** — harness/CI exist; a live Postgres unblocks them (TODO-051).
4. **B1 (scheduler)** — promise-sweep must be cron-provisioned to keep promises accurate in prod.
5. **C1 (pending migrations)** — low-risk but must land before wider launch.