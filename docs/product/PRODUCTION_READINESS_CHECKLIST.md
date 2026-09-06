# Production Readiness Checklist — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Overall verdict** | **NOT YET FULLY PRODUCTION READY** — functional core is real and tested, but external/infra items remain blocked |

**Quality gate (verified 2026-09-05):** `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm test` 209/209 (27 files) ✅ · `npm run build` ✅

Legend: ✅ Ready · 🟡 Partial / needs verification · ❌ Not ready · 🚫 Blocked (external dependency)

---

## 1. Functional Readiness

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Core loop (import → queue → action → promise → payment → analytics) works end-to-end | ✅ | All implemented against real DB (see FEATURE_STATUS_MATRIX) |
| All pages render without runtime errors | ✅ | `npm run build` green; routes listed in §3 PRD |
| Data is real (persisted, per-tenant) vs mock | ✅ | No mock arrays; tenant-scoped via `src/lib/repo.ts` |
| Empty/loading/error/retry states | ✅ | Present across dashboard/invoices/customers/queue/analytics/promises/payments/disputes/settings; `role=alert` + retry |
| Customer detail respects route id | ✅ | `/customers/[id]` fetches by id; 404 if absent |
| Outbound email/WhatsApp/SMS send | ❌ 🚫 | Blocked on providers (TODO-042/044) |

## 2. Authentication & Security

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Passwords bcrypt-hashed (cost 12) | ✅ | register |
| Session cookie (JWT, 7-day maxAge, SameSite) | ✅ | `auth.ts` |
| Route protection | ✅ | `src/proxy.ts` session cookie; dot-bypass removed; static-extension allowlist |
| RBAC enforcement | ✅ | ACTION_ROLES / MANAGE_ROLES guards |
| Tenant data isolation | 🟡 | App-layer org scoping ✅; **DB RLS pending** 🚫 (TODO-058) |
| Rate limiting | ✅ | register 5/10min per IP; per-user 300/min on mutations |
| Password reset | ✅ | hashed 15-min tokens; identity-blind forgot |
| Logout in UI | ✅ | Sidebar |
| Secure cookies in production | 🟡 | `NODE_ENV`-deterministic; **UNVERIFIED in deployed runtime** |
| Production secrets | 🟡 | `.env` git-ignored; NextAuth v5 env names; must generate strong `AUTH_SECRET` for prod (`.env` dev value `UNVERIFIED`) |
| No secrets committed to repo | ✅ | `.env` untracked; `.env.example` placeholders; no hardcoded secrets in `src` (grep verified) |
| CSP + security headers | ✅ | `next.config.ts` (CSP self-only, `frame-ancestors 'none'`, HSTS, X-Frame-Options, Referrer, Permissions, X-Content-Type-Options) |
| CSRF | ✅ | No CORS endpoints + SameSite session cookie |
| npm audit | 🟡 | 4 high, all **transitive via Prisma** (`@prisma/config` → deepmerge-ts, mysql2); only fix is breaking Prisma 6 downgrade — **accepted risk** |

## 3. Data & Database

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Schema migrated / applied | 🟡 | Base schema migrated; **pending migrations**: NotificationPreference, org columns, IdempotencyKey store |
| Prisma client generation reproducible | ✅ | `npx prisma generate`; `@prisma/adapter-pg`; client at `src/generated/prisma` |
| DB backups / point-in-time recovery | ❌ 🚫 | Managed DB not configured (TODO-058) |
| Migration strategy for schema evolution | 🟡 | Prisma Migrate used; prod workflow undeclared |
| Data export / deletion (DPDP-analogous) | ✅ | `/api/export` CSV/JSON; `DELETE /api/account` purge + cascade |

## 4. Integrations & External Services

| Check | Status | Notes |
| --- | --- | --- |
| Email provider configured | ❌ 🚫 | Blocked (TODO-042) — core automation |
| WhatsApp provider configured | ❌ 🚫 | Blocked (TODO-044; requires META approval) |
| SMS / payments / AI / bank imports | ❌ 🚫 | Not built / blocked |
| Webhook/callback handling | ❌ | No webhook routes |
| Sentinel/Sentry DSN | ❌ 🚫 | Requires external account + DSN |

## 5. Quality & Testing

| Check | Status | Notes |
| --- | --- | --- |
| Unit tests | ✅ | 209/209 Vitest 3.2.7 across 27 files (`src/lib/__tests__` + `rbac.test.ts`) |
| Integration / API tests | 🟡 | Specs authored (`src/**/*.integration.test.ts`); execution verified in CI via `postgres:17` container |
| E2E tests | 🚫 | **Blocked (TODO-052)** — Playwright not yet added |
| Test framework configured | ✅ | Vitest; scripts `test`, `test:watch`, `test:integration` |
| Type checking | ✅ | `tsc --noEmit` clean; enforced in CI |
| Linting | ✅ | eslint clean; enforced in CI |
| Code coverage | 🟡 | Unit coverage present; no threshold/CI gate defined |

## 6. Code Quality

| Check | Status | Notes |
| --- | --- | --- |
| TypeScript strict | ✅ | strict tsconfig |
| Dead/unused dependencies trimmed | ✅ | date-fns, `@auth/prisma-adapter`, pg removed; dotenv → devDeps (TODO-059) |
| Duplicated UI code | 🟡 | Per-page layout/table markup; no formal UI-kit (a11y/retry patterns consistent) |
| Documentation accuracy | 🟡 | docs/product being rewritten (TODO-060); README/ARCHITECTURE/API/DEPLOYMENT pending (TODO-061) |

## 7. Reliability & Observability

| Check | Status | Notes |
| --- | --- | --- |
| Structured logging | ✅ | JSONL structured logs with `rid/method/path/status/durationMs/orgId/userId/role` via `withAuth` (`src/lib/server-context.ts`) |
| Request IDs | ✅ | `x-request-id` assigned + echoed on responses |
| Error tracking (Sentry) | ❌ 🚫 | Requires external account/DSN |
| Health check | ✅ | `/api/health` live `SELECT 1` → 200/503 |
| Crash/retry handling on API | ✅ | typed DomainError mapping + error/retry states |

## 8. Infrastructure & Deployment

| Check | Status | Notes |
| --- | --- | --- |
| CI pipeline | ✅ | `.github/workflows/ci.yml`: lint+tsc+unit; integration (postgres:17 service + `prisma migrate deploy || db push`); build (dummy env). Full run pending first push to GitHub |
| Hosting/infra config | ❌ 🚫 | Managed prod infra (DB, RLS, backups/PITR, staging/prod) blocked (TODO-058) |
| Environment management per stage | 🟡 | `.env.*` conventions; NextAuth v5 env names (`AUTH_SECRET`/`AUTH_URL`/`CRON_SECRET`) |
| Scheduler / cron provisioning | ❌ 🚫 | Promise-sweep endpoint ready (CRON_SECRET bearer); **not scheduled** (TODO-058) |
| Database in production | ❌ 🚫 | Only local dev DB; managed PG blocked (TODO-058) |

## 9. Legal & Compliance

| Check | Status | Notes |
| --- | --- | --- |
| Privacy policy / ToS present | ✅ | `/privacy` and `/terms` routes implemented and linked from footer |
| Consent / DPDP 2023 handling | ❌ | None; export/delete implemented but no compliance review |
| MSME interest / fair-debt legal vetting | ❌ | None |

## 10. UX & Accessibility

| Check | Status | Notes |
| --- | --- | --- |
| Responsive/mobile | 🟡 | Tailwind responsive classes; not tested on devices |
| Accessibility (ARIA, keyboard, focus) | 🟡 | Implemented for key dialogs (role=dialog/aria-modal/labelledby, Escape-close, initial focus), bell (aria-haspopup/expanded, role=menu), toggles (role=switch/aria-checked), dual status pills; full keyboard/focus audit **UNVERIFIED** |
| No-color-dependence | ✅ | Status pills are dual (color + text) |

## 11. Performance

| Check | Status | Notes |
| --- | --- | --- |
| Performance budget defined | ❌ | None |
| Measured load/response times | 🟡 | Real queries now exist; no load testing performed |
| Query optimization / indexes review | 🟡 | FKs/unique present; no perf review against real data volumes |

---

## Blockers to Production (must-resolve)

1. **External integrations blocked** — email/WhatsApp/SMS delivery is the core "automated collections" promise and is unimplemented (TODO-042/044).
2. **Managed prod infra blocked** — managed PG, DB RLS, backups/PITR, staging/prod, scheduler/cron provisioning (TODO-058).
3. **Pending migrations** — NotificationPreference, org columns, IdempotencyKey store.
4. **Integration + E2E tests blocked** — harness/CI ready; need running Postgres (TODO-051) then E2E (TODO-052).
5. **Observability gap** — Sentry DSN unwired (external account required).
6. **Legal pages / compliance** — privacy/ToS absent; DPDP/MSME/WhatsApp review required.
7. **Billing** — no monetization path (TODO-049).
8. **Production environment verification** — secure cookies, strong `AUTH_SECRET`, audited npm dependencies (accepted risk).

## Quick Wins (low effort, high value)

- Run pending migrations (NotificationPreference, org columns, IdempotencyKey).
- Provision promise-sweep cron (endpoint already idempotent + `CRON_SECRET`-guarded).
- Reach a running Postgres once to flip TODO-051 integration tests from blocked to passing.
- Generate a strong production `AUTH_SECRET` and rotate dev default; document rotation.
- Publish privacy/ToS routes (footer links exist).
- Define performance budgets now that real queries exist.