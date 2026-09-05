# Requirement Traceability Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Basis** | Codebase audit (post-`83e6ebd`, Phases 1–15) ↔ BRD functional requirements ↔ PRD feature IDs ↔ `docs/MASTER_TODO.md` |

**Legend:**
- **Status:** `Implemented` / `Partial` / `Schema Only` / `Blocked` (external dependency) / `Not Built` / `Not Defined`
- **Evidence:** primary repo file(s) / TODO supporting the claim.

---

## BR → Feature Traceability

| BR (§8 BRD) | Business Requirement | PRD Feature ID(s) | Status | Evidence |
| --- | --- | --- | --- | --- |
| BR-F1 | Browser-based usable system for SME staff | All | **Implemented** | UI + API round-trips; loading/error/empty states |
| BR-F2 | Company multi-tenant accounts | AUTH-001, IMP-004 | **Implemented** | `withAuth` tenant + org scoping in `src/lib/repo.ts`; RLS pending |
| BR-F3 | Role-based feature access | AUTH-007 | **Implemented** | ACTION_ROLES/MANAGE_ROLES guards |
| BR-F4 | Import receivables (CSV/Excel/Tally) | IMP-001..004 | **Implemented (CSV)** | `POST /api/import` transactional batch; Excel/Tally **Not Built** (marketing claim) |
| BR-F5 | Automatic daily prioritization | QUEUE-001, QUEUE-003 | **Implemented** | `src/lib/queue-item.ts` `computeQueueItem`/`statusView`; "why here?" per row |
| BR-F6 | Automated email/WhatsApp/SMS | COMM-002..005 | **Blocked** | no provider (TODO-042/044); `Message` schema-only |
| BR-F7 | Track promise-to-pay / flag broken | PROM-001..005 | **Implemented** | lifecycle + `promise-sweep` idempotent; cron scheduling `Blocked` (TODO-058) |
| BR-F8 | Record & reconcile payments | PAY-001..003 | **Implemented** | `src/lib/payment-allocation.ts`; reversals; dup-guard |
| BR-F9 | Handle disputes with workflows | DIP-001..003 | **Implemented** | categories + resolve; queue exclusion |
| BR-F10 | Analytics & reporting | ANL-001..003 | **Implemented** | `src/lib/metrics.ts` + `/api/analytics` |
| BR-F11 | Audit trail | AUDIT-001 | **Implemented** | `src/lib/audit.ts` `writeAudit()` in register/import/settings/mutations |
| BR-F12 | Data export & account deletion | SET-003, SET-004 | **Implemented** | `/api/export`; `DELETE /api/account` |
| BR-F13 | Delivery status / read receipts | COMM-005 | **Schema Only** | `MessageStatus` enum; no lifecycle (Blocked) |
| BR-F14 | Configurable workflows/cadence | WF-001 | **Schema Only** | `CollectionWorkflow`/`WorkflowAction`; no engine |
| BR-F15 | Escalation alerts on high-risk | QUEUE-004 | **Partial** | derived in-app notifications + escalation banner; no outbound alerts |

## BR → Policy Traceability

| BR-P (§7 BRD) | Policy | Status | Evidence |
| --- | --- | --- | --- |
| BR-P1 | Register validation rules | **Implemented** | zod client + server |
| BR-P2 | Email uniqueness | **Implemented** | schema `@unique`; 409 |
| BR-P3 | bcrypt password hashing (cost 12) | **Implemented** | register |
| BR-P4 | New-user role = OWNER | **Implemented** | register |
| BR-P5 | Dashboard requires session | **Implemented** | `src/proxy.ts` |
| BR-P6 | Invoice number unique per org | **Implemented** | schema `@@unique` + import enforcement |
| BR-P7 | Payment allocation | **Implemented** | `payment-allocation.ts` (FIFO/explicit), `PaymentAllocation` model |
| BR-P8 | RBAC enforcement | **Implemented** | ACTION_ROLES / MANAGE_ROLES |
| BR-P9 | Tenant isolation | **Implemented** (app layer) | repo.ts org scoping; DB RLS **Blocked** (TODO-058) |
| BR-P10 | Rate limiting | **Implemented** | `src/lib/rate-limit.ts` |
| BR-P11 | Promise auto-sweep (ACTIVE→BROKEN) | **Implemented** (endpoint) | `/api/jobs/promise-sweep`; cron **Blocked** (TODO-058) |
| BR-P12 | Password complexity/lockout/expiry | **Not Defined** | BRD D3 |
| BR-P13 | Trial duration / paywall | **Not Defined** | billing Blocked (TODO-049) |
| BR-P14 | Data retention/deletion | **Not Defined** | BRD D4 |
| BR-P15 | Follow-up SLA / dunning | **Not Defined** | automation Blocked |
| BR-P16 | Interest/late-fee policy | **Not Defined** | legal input |

## Feature → Code Traceability

| Feature ID | Feature | Implementing code | Supporting schema | Status |
| --- | --- | --- | --- | --- |
| AUTH-001 | Registration | `register/page.tsx` + `api/register/route.ts` | Organization, User | **Implemented** |
| AUTH-002 | Login | `login/page.tsx` + `api/auth/[...nextauth]` + `lib/auth.ts` | User | **Implemented** |
| AUTH-003 | JWT session | `lib/auth.ts` (maxAge 7d) | — | **Implemented** |
| AUTH-004 | Route protection | `src/proxy.ts` | — | **Implemented** |
| AUTH-005 | Register validation | zod (route + page) | — | **Implemented** |
| AUTH-006 | Login validation | zod (page) | — | **Implemented** |
| AUTH-007 | RBAC | ACTION_ROLES / MANAGE_ROLES guards | User.role enum | **Implemented** |
| AUTH-008 | Password reset | `api/auth/forgot` + `api/auth/reset` + pages | hashed 15-min tokens | **Implemented** |
| AUTH-009 | Email verification | — | User.emailVerified | **Blocked** (TODO-041) |
| AUTH-010 | Logout | Sidebar `signOut` | — | **Implemented** |
| AUTH-011 | OAuth | — | Account | **Not Built** |
| AUTH-012 | Invite team | `api/team` + `api/team/[userId]`; last-owner protection; `syncUsersCount` | User.role | **Implemented** |
| IMP-001 | CSV upload | `import/page.tsx` (PapaParse) | — | **Implemented** |
| IMP-002 | Column mapping | import UI | — | **Implemented** |
| IMP-003 | Preview | import UI (per-row skips) | — | **Implemented** |
| IMP-004 | Persist import | `POST /api/import` ($transaction, dup detection) | Invoice/Customer/InvoiceItem/PromiseToPay | **Implemented** |
| IMP-005 | Excel/Tally support | — | — | **Not Built** (marketing claim) |
| QUEUE-001 | Prioritized queue | `GET /api/queue` + `queue-item.ts` | Invoice/Promise/Dispute | **Implemented** |
| QUEUE-002 | Priority filter | queue page | — | **Implemented** |
| QUEUE-003 | Real priority scoring | `src/lib/queue-item.ts`, risk-score | Invoice | **Implemented** |
| QUEUE-004 | Per-row explanation/next action | `statusView` + `why` | — | **Implemented** |
| CUST-001 | Customer list w/ search | `GET /api/customers?search=` | Customer/Contact | **Implemented** |
| CUST-002 | Customer detail | `GET /api/customers/[id]` + page (real `[id]`, 404 if absent) | Customer + invoices/timeline | **Implemented** |
| CUST-003 | Customer CRUD | `GET/POST/PATCH /api/customers` + `/[id]` | Customer | **Implemented** |
| CUST-004 | Contacts CRUD | `/customers/[id]/contacts/[...]` + primary logic | Contact | **Implemented** |
| CUST-005 | Dedupe + merge | `/duplicates` + `mergeCustomers` tx | Customer | **Implemented** |
| INV-001 | Invoice list w/ search + filter | `GET /api/invoices` (search, cursor pagination, derived status filter) | Invoice | **Implemented** |
| INV-002 | Invoice detail | `GET /api/invoices/[id]` (items/allocations/timeline) + page | Invoice/InvoiceItem/PaymentAllocation | **Implemented** |
| PROM-001 | Promise list w/ filter | `GET /api/promises` + page | PromiseToPay | **Implemented** |
| PROM-002 | Promise stats | promises page | — | **Implemented** |
| PROM-003 | Record promise | `POST /api/promises` | PromiseToPay | **Implemented** |
| PROM-004 | AI promise extraction | — | PromiseToPay.source | **Not Built** (marketing claim) |
| PROM-005 | Auto-mark broken | `/api/jobs/promise-sweep` (idempotent, CRON_SECRET) | PromiseToPay | **Implemented (endpoint)**; cron **Blocked** |
| PAY-001 | Payment list + allocation detail | payments page | Payment/PaymentAllocation | **Implemented** |
| PAY-002 | Record payment | `POST /api/payments` (FIFO/explicit, partial/overpay/unmatched, dup-guard) | Payment | **Implemented** |
| PAY-003 | Allocation + transitions | `payment-allocation.ts` + `nextInvoiceStatus`; auto-KEPT promises | PaymentAllocation, Invoice | **Implemented** |
| PAY-004 | Bank import / auto-match | — | — | **Not Built** (marketing claim) |
| PAY-005 | Payment reversal | reversal route | Payment | **Implemented** |
| DIP-001 | Dispute list | disputes page | Dispute | **Implemented** |
| DIP-002 | Log dispute | `POST /api/disputes` (categories) | Dispute | **Implemented** |
| DIP-003 | Categories + resolution | `PATCH /api/disputes/[id]`; queue exclusion | Dispute | **Implemented** |
| COMM-001 | Comms hub | `/dashboard/communications` route | — | **Route only; email send NOT built (Blocked)** |
| COMM-002 | Send message | — | Message | **Not Built (Blocked)** |
| COMM-003 | Email delivery | — | — | **Not Built (Blocked)** (TODO-042) |
| COMM-004 | WhatsApp delivery | — | — | **Not Built (Blocked)** (TODO-044) |
| COMM-005 | Delivery/read status | — | MessageStatus enum | **Schema Only** |
| ANL-001 | KPI cards (DSO/CEI/adherence/overdue) | `src/lib/metrics.ts` + `GET /api/analytics` | Invoice/Payment | **Implemented** |
| ANL-002 | 6-month trend chart | analytics page (6-month series) | Payment/Invoice | **Implemented** |
| ANL-003 | Top overdue + pipeline health | analytics page | Invoice | **Implemented** |
| SET-001 | Org settings (hours/holidays/working days/pause) | settings GET/PATCH; org columns | Organization | **Implemented** (migration pending) |
| SET-002 | Notification preferences | `GET/PATCH /api/notifications/preferences` (graceful fallback) | NotificationPreference | **Implemented** (migration pending) |
| SET-003 | Export data | `GET /api/export?format=csv\|json` | all tables | **Implemented** |
| SET-004 | Delete account | `DELETE /api/account` (purge + cascade) | org tables | **Implemented** |
| SET-005 | Save changes | settings PATCH | Organization | **Implemented** |
| NTF-001 | In-app notifications feed | `GET /api/notifications` + bell + escalation banner | derived (broken promises/disputes/due) | **Implemented** |
| WF-001 | Workflow engine | — | CollectionWorkflow/WorkflowAction | **Schema Only** |
| AUDIT-001 | Audit log capture | `src/lib/audit.ts` `writeAudit()` | AuditLog | **Implemented** |
| INT-001 | Integration credentials | — | IntegrationCredential | **Schema Only** |
| OPS-001 | Health endpoint | `/api/health` live `SELECT 1` | — | **Implemented** |
| OPS-002 | Structured logs + request IDs | `src/lib/server-context.ts` `withAuth` | — | **Implemented** |

## User Story → Feature Traceability

| Story | Feature(s) | Status |
| --- | --- | --- |
| US-AUTH-01 register | AUTH-001, AUTH-005 | **Implemented** |
| US-AUTH-02 login | AUTH-002, AUTH-006 | **Implemented** |
| US-AUTH-03 logout | AUTH-010 | **Implemented** |
| US-AUTH-04 reset password | AUTH-008 | **Implemented** |
| US-IMP-01 upload/map | IMP-001..003 | **Implemented** |
| US-IMP-02 save import | IMP-004 | **Implemented** |
| US-QUEUE-01 prioritize | QUEUE-001..004 | **Implemented** |
| US-CUST-01 customer detail | CUST-002 | **Implemented** |
| US-PROM-01 record promise | PROM-003 | **Implemented** |
| US-PAY-01 record/match payment | PAY-002/003 | **Implemented** |
| US-ANL-01 collection KPIs | ANL-001..003 | **Implemented** |
| US-COMM-01 send follow-up | COMM-002/003 | **Blocked** (no provider) |

## Requirement ↔ Test Traceability

| Requirement | Requires automated test | Coverage |
| --- | --- | --- |
| Validation rules (register/login/reset) | Yes | Route-level — **integration pending** (TODO-051) |
| Session guard (proxy) | Yes | **Integration pending** |
| Risk scoring | Yes | ✅ `src/lib/__tests__/risk-score*` |
| Invoice status derivation/transitions | Yes | ✅ `invoice-status*` tests + pure `nextInvoiceStatus` |
| Payment allocation (FIFO/explicit/dup-guard) | Yes | ✅ `payment-allocation*` tests (pure) |
| Queue priority/next-action | Yes | ✅ `queue-item*` tests (pure) |
| Dates/aging/utils | Yes | ✅ `dates`, `utils` tests |
| RBAC policy | Yes | ✅ `src/lib/rbac.test.ts` (pure unit suite) |
| Import tx / payment persistence / tenant isolation | Yes | Specs authored (`src/**/*.integration.test.ts`), verified in CI with `postgres:17` |
| E2E happy path | Yes | **Blocked** (TODO-052) |

**Test traceability verdict:** 65/65 unit tests pass (Vitest 3.2.7) covering all extracted pure modules (`dates`, `risk-score`, `invoice-status`, `utils`, `payment-allocation`, `queue-item`, `rbac`, `promise-state`, `rate-limit`). DB-coupled behavior (import transaction, payment persistence, tenant isolation) has **specs authored and CI-ready** (`src/**/*.integration.test.ts`) running against a `postgres:17` container in CI. CI (`.github/workflows/ci.yml`) runs lint → tsc → unit → integration → build.