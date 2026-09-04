# Gap Register — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Purpose** | Consolidated register of every gap (function, data, security, integration, quality, production) with severity, evidence, and recommended resolution |

**Severity legend:** 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low/Info

---

## A. Functional Gaps (UI exists, no real backend)

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-001 | Import does not persist (CSV → no DB write) | 🔴 | `import/page.tsx:119` fake timeout; no fetch | Build import API; write Invoice/Customer/Contact; transaction + validation |
| GAP-002 | Dashboard shows mock stats/aging/queue | 🔴 | `dashboard/page.tsx` hardcoded arrays | Add `GET /api/dashboard` aggregations from DB |
| GAP-003 | No real priority scoring (queue is static) | 🟠 | `queue/page.tsx:19`; `getPriorityColor` util unused | Compute priority from aging + amount + promise status; expose via API |
| GAP-004 | Customer detail ignores `[id]` (same mock for all) | 🟠 | `customers/[id]/page.tsx` destructures `_id` | Fetch customer by id; 404 not-found; wire timeline + contacts |
| GAP-005 | No customer/invoice CRUD | 🟠 | No APIs; `customers/page.tsx` search over mock only | Implement `GET/PATCH/POST` customers & invoices |
| GAP-006 | Promise lifecycle not recorded | 🟠 | `promises/page.tsx` mock only | Create promise API; status transitions; auto-break scheduler |
| GAP-007 | Promise status strings mismatch schema enum (`active/kept/broken` vs `ACTIVE/KEPT/BROKEN/RENEGOTIATED`) | 🟡 | `promises/page.tsx:20` vs `schema.prisma` enum | Align UI + schema contract |
| GAP-008 | Payments/disputes/communications are empty placeholders | 🟠 | those page files | Implement list + create + recording + allocation |
| GAP-009 | Analytics KPIs/charts are mocked | 🟡 | `analytics/page.tsx` hardcoded | DB aggregations (DSO, CEI, collection trend) |

## B. Auth & Identity Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-010 | No logout UI | 🟠 | `auth.ts:6` signOut exported; no handler | Wire logout button → `signOut({callbackUrl:'/login'})` |
| GAP-011 | No password reset / recovery | 🟠 | No API/UI; `VerificationToken` unused | Add reset flow (token + email) |
| GAP-012 | No email verification | 🟡 | `User.emailVerified` unused | Add verification nudge |
| GAP-013 | No RBAC enforcement | 🔴 | Roles in schema only | Define permission matrix (BRD §10) + middleware guards |
| GAP-014 | No tenant scoping/RLS on reads/writes | 🔴 | No domain code yet; `organizationId` FK only | Add org scoping in every query + RLS policy |
| GAP-015 | No team invites / user management | 🟡 | `Organization.usersCount` unused; no UI/API | Add invite + role assignment |
| GAP-016 | No rate limiting / abuse control on registration | 🟠 | `api/register` public, no throttle | Rate limit + captcha + trusted-domain gate pre-prod |

## C. Integrations Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-017 | No email provider | 🔴 | No config/code; `COMM-003` missing | Add email provider + transactional templates + verified domain |
| GAP-018 | No WhatsApp provider | 🔴 | No config/code; `COMM-004` missing; requires META approval | BSP integration + templates + opt-in |
| GAP-019 | No SMS provider | 🟡 | `COMM` missing | Add SMS gateway + DND compliance |
| GAP-020 | No payment links/gateway | 🟠 | Marketing only | Decide provider (BRD D3) + webhooks |
| GAP-021 | No AI promise extraction | 🟠 | Marketing only; no LLM dep | Add LLM + prompt for extracting PDP from replies |
| GAP-022 | No workflow/automation execution engine | 🔴 | Schema only (`CollectionWorkflow`) | Scheduler + rule evaluator writing `Message`/`CollectionEvent` |
| GAP-023 | `IntegrationCredential` not encrypted/used | 🟠 | Schema only | Add encryption layer (tenant keys) before storing secrets |
| GAP-024 | No webhook/callback handlers | 🟡 | No webhook routes | Add for delivery status, payments |

## D. Data & Persistence Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-025 | Only auth/register hit the DB; domain tables never written/read | 🔴 | `grep` of Prisma usage → register + auth only | Build domain services + APIs |
| GAP-026 | No audit log writes | 🟠 | `AuditLog` model unused | Journal all mutating actions |
| GAP-027 | No data export | 🟡 | `settings` no-op | CSV/JSON export endpoint |
| GAP-028 | No account deletion | 🟡 | `settings` no-op | Soft-delete + purge flow |
| GAP-029 | No backup/DR config | 🟠 | Local dev DB only | Managed DB + backups + PITR |

## E. Quality & Testing Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-030 | Zero tests / no test framework / no test script | 🔴 | `package.json` no `test`; no `*.test.*` | Add Vitest + unit tests (`utils.ts`), API tests, component tests |
| GAP-031 | No E2E tests | 🟡 | None | Add Playwright for auth + import + queue flows |
| GAP-032 | No CI/CD | 🔴 | None | GH Actions: lint, typecheck, test, build, deploy |
| GAP-033 | No `loading.tsx` / `error.tsx` / `not-found.tsx` | 🟡 | None present | Add per layout |
| GAP-034 | No observability (logs, tracing, error tracking) | 🔴 | None | Structured logs + Sentry + health endpoint |
| GAP-035 | Lint/typecheck not enforced in CI | 🟡 | Pass locally only | Wire into CI |

## F. Production & Infra Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-036 | Nothing deployed; no infra config | 🔴 | `next.config.ts` empty; no vercel/docker | Define host + deploy pipeline |
| GAP-037 | Weak/dev `NEXTAUTH_SECRET` (`UNVERIFIED` for prod) | 🟠 | `.env` dev-default | Rotate to strong secret |
| GAP-038 | No `/api/health` health check | 🟡 | None | Add health endpoint + DB ping |
| GAP-039 | No legal pages (privacy/ToS) | 🟡 | Footer spans only | Publish routes |
| GAP-040 | No a11y work | 🟡 | No ARIA/landmarks | Add a11y audit + fixes |

## G. Doc & Hygiene Gaps

| ID | Gap | Severity | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| GAP-041 | README is default create-next-app (inaccurate) | 🟡 | `README.md` | Rewrite with setup, scripts, architecture |
| GAP-042 | Dead/unused deps (`@auth/prisma-adapter`, `date-fns`, `dotenv` mostly unused) | ⚪ | `grep` src | Remove or use |
| GAP-043 | No shared UI kit (page markup duplicated) | 🟡 | 9 mock screens | Extract primitives |
| GAP-044 | No mobile/device testing evidence | ⚪ | — | Test matrix |
| GAP-045 | `getPriorityColor` util unused (dead code) | ⚪ | `utils.ts` vs usage | Wire or remove |

---

## Severity Rollup

| Severity | Count |
| --- | ---: |
| 🔴 Critical | 14 |
| 🟠 High | 14 |
| 🟡 Medium | 15 |
| ⚪ Low/Info | 4 |
| **Total** | **47** |

**Top 5 by strategic impact (all 🔴):**
1. GAP-001 Import doesn't persist → core onboarding broken.
2. GAP-013/GAP-014 No RBAC + no tenant isolation → unsafe to launch multi-tenant.
3. GAP-017/GAP-018/GAP-025 No integrations + no domain data flow → core "automated collections" promise unrealized.
4. GAP-030/GAP-032/GAP-036 No tests, no CI, no deploy → no confidence to ship.
5. GAP-022 No automation engine → no recurring value.
