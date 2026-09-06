# PRD — DuesPilot Collections Operating System

| Attribute | Value |
| --- | --- |
| **Document name** | Product Requirements Document |
| **Project name** | DuesPilot |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Status** | CURRENT — reflects the implemented system (Phases 1–15, post-`83e6ebd`) |
| **Source of truth** | Repository at `C:\Users\yashs\3D Objects\DuesPilot`; statuses per `docs/MASTER_TODO.md` |
| **Scope** | Full-stack implementation audit → product specification, grounded in shipped code |
| **Methodology** | Evidence-based bidirectional audit (Requirements ↔ Code ↔ Tests ↔ UX) |
| **Confidence** | High for implemented behavior; explicit `UNVERIFIED` / `BLOCKED` / `I-cannot-confirm` labels where not |

> **Quality gate (verified 2026-09-05):** `npx tsc --noEmit`, `npm run lint`, `npm test` (209/209, 27 files), and `npm run build` all green. All statuses below derive from the authoritative fact sheet and `docs/MASTER_TODO.md`.

---

## 1. Executive Summary

DuesPilot is **"a Collections Operating System for Indian B2B SMEs"** — a multi-tenant web application that helps small and medium Indian businesses automate the recovery of overdue invoices (accounts receivable / collections).

The repository now contains a **functioning, tenant-scoped full-stack implementation** with:

- A complete, migrated PostgreSQL schema (**21 models, 6 enums**) across the whole collections domain (`Organization`, `User`, `Customer`, `Contact`, `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `PromiseToPay`, `Dispute`, `Message`, `CollectionEvent`, `CollectionWorkflow`, `WorkflowAction`, `IntegrationCredential`, `AuditLog`, `NotificationPreference`, `IdempotencyKey`, plus NextAuth tables).
- A real credentials auth flow (register with zod + bcrypt cost 12 + rate limiting, login with JWT, logout, password reset), RBAC enforcement, tenant isolation via `withAuth` + `organizationId` scoping.
- **Real, DB-backed features across every core surface**: import (transactional batch), dashboard aggregates, priority queue, customer/contact CRUD + dedupe/merge, invoices with search/pagination/detail, payments with FIFO/explicit allocation + reversals, promise lifecycle + auto-sweep, collection events, disputes, analytics metrics, in-app notifications, org/settings/team, CSV/JSON export, account deletion.
- Unit tests (209/209 Vitest, 27 files), CI pipeline (GitHub Actions: quality + integration + build), security headers, rate limiting, structured JSONL logging with request IDs, and a live health endpoint.

**Bottom line:** the product is a **working, tested collections system backed by a real database**, not a mock prototype. The externally-dependent pieces (email/message delivery, WhatsApp/SMS, billing, managed prod infra, Sentry DSN, scheduled cron provisioning, integration + E2E tests) remain **blocked** and are explicitly called out in §10 and §22 below.

---

## 2. Product Vision

**CODEBASE-VERIFIED:** (from `src/app/page.tsx`, `src/app/layout.tsx` metadata)
> "Stop chasing overdue invoices manually … DuesPilot tells you who to contact, what to say, when to follow up, and what happened next — from first reminder to payment."

A Collections Operating System that converts a messy receivables ledger into a prioritized, automated daily action list for Indian B2B SMEs.

---

## 3. Product Mission

To help Indian B2B SMEs recover cash owed to them faster by:
1. Importing their receivables (customers, invoices, due dates) in minutes.
2. Prioritizing a daily "collection queue."
3. Automating follow-up communication (email/WhatsApp/SMS/call).
4. Tracking promise-to-pay and escalation.
5. Providing collection analytics.

**Implementation status of each mission pillar** is assessed in the Feature Inventory (§10). Pillars 1, 2, 4, and 5 are implemented; pillar 3 (automated email/WhatsApp/SMS delivery) is **blocked** on external providers.

---

## 4. Problem Statement

**from landing page (`src/app/page.tsx`):** Indian MSMEs face chronic delayed payments. Landing copy cites market context: ₹55,244 Cr delayed-payment claims on MSME Samadhaan, 2,56,892 delayed-payment applications filed, 9.45 Cr Udyam registrations (**marketing numbers — `UNVERIFIED`**).

**The operational problem targeted:** SMEs chase overdue invoices manually, buried in aging spreadsheets, not knowing whom to contact, what to say, when to follow up, or what happened previously with each customer.

---

## 5. Target Users & Personas

### 5.1 User Roles (from `prisma/schema.prisma` `Role` enum)
`OWNER`, `ADMIN`, `FINANCE_MANAGER`, `COLLECTOR`, `SALES`, `VIEWER`.

**Implemented behavior (CODEBASE-VERIFIED):**
- Registration creates a new account with the owner as `OWNER`.
- **RBAC is enforced.** Mutating collections routes are gated by `ACTION_ROLES` (promises, payments, collection events, disputes); org settings/import/team are gated by `MANAGE_ROLES` (`OWNER`/`ADMIN`). Team invites + role assignment support `OWNER`/`ADMIN`. GET routes require authentication.
- **Tenant isolation** is enforced: `withAuth` establishes the tenant, and every query is scoped by `organizationId` in `src/lib/repo.ts`.

### 5.2 Personas (grounded in roles + permission behavior)
| Persona | Likely role | Goals | Permissions |
| --- | --- | --- | --- |
| Business Owner | OWNER | See total exposure, approve escalations, manage settings/team | Full; manage org, import, team |
| Finance Manager | FINANCE_MANAGER | Reconcile payments, run aging/analytics + import | Mutating collections actions |
| Collector | COLLECTOR | Work the daily queue — call/remind customers, record outcomes | Mutating collections actions |
| Sales (with credit exposure) | SALES | View customer/order context | Read/view (no mutations) |
| Viewer / Auditor | VIEWER | Read-only access | View (no mutations) |

---

## 6. Jobs To Be Done (JTBD)

**CODEBASE-VERIFIED** (implemented end-to-end):
1. "When I have a pile of overdue invoices, I want to know **who to chase today**, so I don't waste time." → real priority **Queue**.
2. "When I contact a customer, I want to know **what happened last time**, so I don't repeat myself." → customer detail timeline + collection events.
3. "When a customer promises to pay, I want to **track that they actually pay**, so I can escalate if they don't." → promise lifecycle + auto-sweep to BROKEN.
4. "When I get paid, I want to **match the payment to the invoice**, so my ledger stays accurate." → FIFO/explicit allocation + invoice status transitions.
5. "When a customer disputes an invoice, I want to **track the reason and resolution**, so I don't keep chasing a disputed amount." → disputes; disputed balances excluded from queue.
6. "When I set up, I want to **import my existing receivables quickly**, so I don't key in data again." → transactional import + honest counts.

---

## 7. Value Proposition

Import receivables → get a prioritized collection queue → promise tracking → payment reconciliation → analytics. The import, queue, promise, payment, dispute, and analytics pillars are **implemented against real tenant data**. Automated outbound follow-up (email/WhatsApp/SMS) and billing remain **blocked** on external providers (see §10, §22).

---

## 8. Product Goals & Non-Goals

### 8.1 Product Goals
- G1: Reduce Days Sales Outstanding (DSO) for SME users — **tracked** via `src/lib/metrics.ts`.
- G2: Reduce manual effort in collections follow-up — supported by guided queue + actions.
- G3: Improve litigation-free recovery rates — supported by promise/payment tracking.

### 8.2 Non-Goals
- NG1: Not an ERP/accounting system (it *imports* receivables, does not do bookkeeping).
- NG2: Not a payment gateway (records/matches payments; does not process them).
- NG3: Not a general CRM (collections-focused).

---

## 9. Scope & Architecture Overview

### 9.1 In-Scope (implemented, real DB)
Auth (register/login/logout/reset), RBAC + tenant isolation, import, dashboard aggregates, queue, customers/contacts + dedupe/merge, invoices (search/pagination/detail), payments (allocation/reversal), promises (+ auto-sweep), collection events, disputes, analytics, notifications, org settings/team, export, account deletion, security/observability, unit tests + CI.

### 9.2 Architecture (current)
- **Framework:** Next.js 16 (App Router), React 19.
- **Language:** TypeScript (strict), `@/*` → `./src/*`.
- **Styling:** Tailwind CSS v4, CSS variables, Geist fonts.
- **DB/ORM:** PostgreSQL via Prisma 7 with `@prisma/adapter-pg` driver adapter; generated client at `src/generated/prisma`.
- **Auth:** NextAuth v5, JWT session strategy (maxAge 7d), Credentials provider, bcryptjs hashing; env names `AUTH_SECRET`/`AUTH_URL`/`CRON_SECRET`.
- **Route protection:** `src/proxy.ts` (Next.js 16 `proxy` convention) checks the session cookie; static-extension allowlist (dot-bypass removed).
- **Rate limiting:** `src/lib/rate-limit.ts` (register 5/10min per IP; global per-user 300/min on mutating auth calls).
- **Data access:** server-side via `src/lib/repo.ts` (tenant-scoped), plus pure modules `src/lib/queue-item.ts`, `src/lib/payment-allocation.ts`, `src/lib/metrics.ts`, `src/lib/invoice-status.ts`, `src/lib/risk-score.ts`.
- **State/data flow:** real client→API→DB round trips; loading/error/empty/retry states present.

### 9.3 Routing Map (from `next build`)
| Route | Page | Protection |
| --- | --- | --- |
| `/` | Landing | Public |
| `/login`, `/register` | Auth | Public |
| `/forgot-password`, `/reset-password` | Auth (reset flow) | Public |
| `/dashboard` | Dashboard | Protected |
| `/dashboard/queue` `promises` `payments` `disputes` `analytics` `import` `settings` | Feature pages | Protected |
| `/dashboard/customers`, `/dashboard/customers/[id]` | Customers | Protected |
| `/dashboard/invoices`, `/dashboard/invoices/[id]` | Invoices + detail | Protected |
| `/dashboard/communications` | Route exists; **email send feature NOT built (BLOCKED)** | Protected |
| API: `/api/auth/[...nextauth]`, `/api/register`, `/api/dashboard`, `/api/import`, `/api/queue`, `/api/customers[/id][/contacts/...][/duplicates]`, `/api/invoices[/id]`, `/api/payments`, `/api/promises[/id]`, `/api/collection-events`, `/api/disputes[/id]`, `/api/analytics`, `/api/notifications[/preferences]`, `/api/jobs/promise-sweep`, `/api/export`, `/api/account`, `/api/team[/userId]`, `/api/health` | Various | Auth as noted |

---

## 10. Feature Inventory

Status legend: **Implemented** (real, tenant-scoped, DB-backed) / **Blocked** (external dependency) / **Schema-only** / **Not built**.

### 10.1 AUTH — Authentication & Accounts
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| AUTH-001 | Credentials registration (creates Organization + User) | **Implemented** | zod + bcrypt cost 12 + rate limit 5/10min per IP; `/api/register` |
| AUTH-002 | Email/password login | **Implemented** | Credentials provider, JWT, maxAge 7d |
| AUTH-003 | Session cookie (JWT) | **Implemented** | `auth.ts` JWT strategy |
| AUTH-004 | Route protection for `/dashboard/*` | **Implemented** | `src/proxy.ts` session-cookie check; dot-bypass removed |
| AUTH-005 | Registration validation | **Implemented** | zod client + server |
| AUTH-006 | Login validation | **Implemented** | client zod |
| AUTH-007 | Role-based authorization (RBAC) | **Implemented** | `ACTION_ROLES`/`MANAGE_ROLES` guards; tenant scoping in `src/lib/repo.ts` |
| AUTH-008 | Password recovery / reset | **Implemented** | forgot/reset flow, hashed 15-min tokens, identity-blind forgot response |
| AUTH-009 | Email verification | **Blocked/Not built** | `emailVerified` + token exist; flow blocked (TODO-041) |
| AUTH-010 | Logout | **Implemented** | Sidebar logout → `/login` |
| AUTH-011 | OAuth / external identity providers | **Not built** | `Account` table present; no provider configured |
| AUTH-012 | Invite / manage team members | **Implemented** | `/api/team` + `[userId]`; role assignment, last-owner protection, `syncUsersCount` |

### 10.2 DATA/IMPORT — Receivables Import
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| IMP-001 | CSV upload (drag/drop + browse) | **Implemented** | `/dashboard/import` uses PapaParse |
| IMP-002 | Column mapping (auto + manual) | **Implemented** | import UI |
| IMP-003 | Preview of mapped rows | **Implemented** | import preview + per-row skip reasons |
| IMP-004 | Persist imported invoices/customers | **Implemented** | `POST /api/import` transactional batch; customers/invoices/items/promises; per-row validation; in-file + DB dup detection; honest counts |
| IMP-005 | XML/XLSX/Tally support (marketing claim) | **Not built** | CSV only; Excel/Tally claim not wired |

### 10.3 QUEUE — Collection Queue
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| QUEUE-001 | Prioritized action list | **Implemented** | `GET /api/queue` computes priority via `src/lib/queue-item.ts` |
| QUEUE-002 | Priority filter (all/high/medium/low) | **Implemented** | queue page |
| QUEUE-003 | Priority from real data (aging + amount scoring) | **Implemented** | `computeQueueItem`/`statusView` pure module; disputed balances excluded |
| QUEUE-004 | "Why here?" explanation + next action per row | **Implemented** | per-row `why` in queue |

### 10.4 CUST/INV — Customers & Invoices
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| CUST-001 | Customer list w/ server-side search | **Implemented** | `GET /api/customers?search=` |
| CUST-002 | Customer detail w/ invoices, timeline, contacts, notes | **Implemented** | real `[id]` fetch; detail page |
| CUST-003 | Customer CRUD (create/edit) | **Implemented** | `GET/POST/PATCH /api/customers` + `/[id]`; contacts CRUD |
| CUST-004 | Dedupe + merge | **Implemented** | `/duplicates` + `mergeCustomers` transaction |
| INV-001 | Invoice list w/ search + status filter | **Implemented** | `GET /api/invoices` cursor pagination + derived status filter |
| INV-002 | Invoice CRUD / detail | **Implemented** | `GET /api/invoices/[id]` returns items/allocations/timeline; detail page `/dashboard/invoices/[id]` |

### 10.5 PROMISE — Promise-to-Pay
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| PROM-001 | Promise list w/ active/kept/broken filter | **Implemented** | promises page |
| PROM-002 | Promise stats (active/broken/kept sums) | **Implemented** | promises page |
| PROM-003 | Record a promise | **Implemented** | `POST /api/promises` |
| PROM-004 | Extract promise from WhatsApp/email (AI) | **Not built** | marketing claim; `source` field in schema, no AI |
| PROM-005 | Auto-mark broken on missed date | **Implemented** | `/api/jobs/promise-sweep` (idempotent, ACTIVE→BROKEN); **cron scheduling NOT provisioned (TODO-058)** — endpoint exists, not yet scheduled |

### 10.6 PAY — Payments
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| PAY-001 | Payment list + allocation detail | **Implemented** | payments page |
| PAY-002 | Record payment | **Implemented** | `POST /api/payments`; FIFO/explicit allocation (pure module `payment-allocation.ts`); partial/multi/overpay/unmatched; reversal; duplicate guard |
| PAY-003 | Payment allocation/matching | **Implemented** | auto-KEPT promises + invoice status transitions via `nextInvoiceStatus` |
| PAY-004 | Bank statement import / auto-match | **Not built** | marketing copy only |

### 10.7 DIP — Disputes
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| DIP-001 | Dispute list | **Implemented** | disputes page |
| DIP-002 | Log a dispute | **Implemented** | `POST /api/disputes` (categories) |
| DIP-003 | Categories + resolution workflow | **Implemented** | `PATCH /api/disputes/[id]` resolve; disputed balances excluded from queue |

### 10.8 COMM — Communications
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| COMM-001 | Communication hub | **Route only** | `/dashboard/communications` is a route; **email send NOT built (BLOCKED)** |
| COMM-002 | Send message | **Not built (Blocked)** | no provider; `Message` model is schema-only |
| COMM-003 | Email delivery | **Not built (Blocked)** | no email provider (TODO-042) |
| COMM-004 | WhatsApp delivery | **Not built (Blocked)** | no WhatsApp API (TODO-044) |
| COMM-005 | Delivery/read status tracking | **Schema-only** | `MessageStatus` enum; no lifecycle code |

### 10.9 ANALYTICS
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| ANL-001 | KPI cards (DSO, CEI, promise adherence, overdue ratio) | **Implemented** | `src/lib/metrics.ts` + `GET /api/analytics` |
| ANL-002 | 6-month collected/overdue trend chart | **Implemented** | analytics page 6-month series |
| ANL-003 | Top overdue customers / pipeline health | **Implemented** | analytics page |

### 10.10 SETT
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| SET-001 | Organization settings (business hours, holidays, working days, automation pause) | **Implemented** | settings GET/PATCH; columns added (migration pending) |
| SET-002 | Notification preferences toggles | **Implemented** | `GET/PATCH /api/notifications/preferences`; graceful fallback (schema/migration pending) |
| SET-003 | Export all data | **Implemented** | `GET /api/export?format=csv|json` streams attachment |
| SET-004 | Delete account | **Implemented** | `DELETE /api/account` purge + cascade; OWNER-only, typed DELETE confirm |
| SET-005 | Save changes | **Implemented** | settings PATCH persistence |

### 10.11 WF/AUDIT/INT — Workflows & Audit & Integrations
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| WF-001 | CollectionWorkflow rules + actions | **Schema-only** | models present; no execution engine (blocked with automation) |
| AUDIT-001 | Audit log capture | **Implemented** | `src/lib/audit.ts` `writeAudit()` wired into register/import/settings + collections mutations |
| INT-001 | Integration credentials store | **Schema-only** | `IntegrationCredential` model; no read/write code (no providers) |

---

## 11. User Stories

| Story ID | User | Story | Related Feature | Status |
| --- | --- | --- | --- | --- |
| US-AUTH-01 | Prospect | Create account with name, email, password, company | AUTH-001 | **Implemented** |
| US-AUTH-02 | User | Log in with email/password to access dashboard | AUTH-002 | **Implemented** |
| US-AUTH-03 | User | Log out to end session | AUTH-010 | **Implemented** |
| US-AUTH-04 | User | Recover password via reset | AUTH-008 | **Implemented** |
| US-IMP-01 | Owner | Upload receivables CSV and map columns | IMP-001..003 | **Implemented** |
| US-IMP-02 | Owner | Imported invoices/customers are saved and visible | IMP-004 | **Implemented** |
| US-QUEUE-01 | Collector | See today's prioritized actions + why | QUEUE-001..004 | **Implemented** |
| US-CUST-01 | User | Open a customer and see invoices, timeline, contacts | CUST-002 | **Implemented** |
| US-PROM-01 | Collector | Record a promise to pay and track it | PROM-003 | **Implemented** |
| US-PAY-01 | Finance | Record and match payments to invoices | PAY-002/003 | **Implemented** |
| US-ANL-01 | Owner | See collection KPIs and trends | ANL-001..003 | **Implemented** |

---

## 12. User Flows

### 12.1 Registration (IMPLEMENTED)
→ Visit `/register`. → Fill name, email, password, company. → Client zod validation. → `POST /api/register` (JSON). → Server zod validation → duplicate email (409) → bcrypt hash (cost 12) → create `Organization` → create `User` (OWNER). Rate limited 5/10min per IP. → Redirect `/login?registered=true` → sign in → JWT cookie → `/dashboard`.

### 12.2 Dashboard access (IMPLEMENTED)
→ Navigate to `/dashboard`. → `src/proxy.ts` checks the session cookie. → Present → render Dashboard with **real aggregates** from `GET /api/dashboard` (first-run onboarding CTA when `totalReceivables=0`). Absent cookie → redirect to `/login`.

### 12.3 Import (IMPLEMENTED, transactional)
→ Visit `/dashboard/import`. → Upload/drop CSV → PapaParse → auto-map → preview → import. → `POST /api/import` runs a single `$transaction` writing customers, invoices, items, promises; per-row validation, in-file + DB dup detection. → Honest success screen with processed/valid/skipped counts and per-row skip reasons ("nothing imported" / warning states shown).

### 12.4 Customer detail (IMPLEMENTED, respects `[id]`)
→ Click a customer → `/dashboard/customers/[id]`. → Server fetches by `[id]` (404 not-found if absent) → real invoices, timeline, contacts, actions.

### 12.5 Logout / Settings / Export / Delete (IMPLEMENTED)
Logout via Sidebar; org settings persisted via PATCH; CSV/JSON export; account deletion via typed-confirm `DELETE /api/account`.

### 12.6 Password recovery (IMPLEMENTED)
`/forgot-password` → identity-blind forgot response → hashed 15-min token → `/reset-password` sets new password.

---

## 13. Component Inventory

See `PAGE_COMPONENT_INVENTORY.md` for the full per-page/component index. Highlights: `Sidebar` (nav + NotificationBell with `aria-haspopup`/`aria-expanded`), queue `AllActionsModal`, customer quick-action + manage-contacts modals, invoice detail, and shared UI primitives. Modals are `role=dialog`/`aria-modal`/`aria-labelledby` with Escape-to-close and initial focus; status pills are dual (color + text); settings toggles expose `role=switch`/`aria-checked`.

---

## 14. Business Rules (see also `BRD.md` §7)

Implemented (CODEBASE-VERIFIED):
- Register: name≥2, valid email, password≥8, company≥2 (zod client + server).
- Email unique per account (schema `@unique`; 409 on duplicate).
- Passwords hashed with bcrypt cost 12.
- New signup role = OWNER.
- Invoice `invoiceNumber` unique per org (`@@unique([organizationId, invoiceNumber])`).
- Rate limiting: register 5/10min per IP; all authenticated mutating calls 300/min per user.
- RBAC: `ACTION_ROLES` for collections mutations; `MANAGE_ROLES` (OWNER/ADMIN) for settings/import/team.
- Tenant isolation via `withAuth` + `organizationId` scoping in `src/lib/repo.ts`.
- Promise auto-sweep ACTIVE→BROKEN via idempotent `/api/jobs/promise-sweep` (CRON_SECRET bearer via `crypto.timingSafeEqual`).

Not defined (business decision): password complexity/lockout policy (BRD D5), data retention timelines, follow-up SLA/cadence, dunning schedules, interest/late-fee policy (legal input).

---

## 15. State Machines

| Entity | States (schema enum) | Transition logic | Status |
| --- | --- | --- | --- |
| Invoice | `DRAFT, OPEN, DUE_SOON, OVERDUE, DISPUTED, PROMISED, PROMISE_BROKEN, PARTIALLY_PAID, PAID, CANCELLED` | Derived status (`DUE_SOON`/`OVERDUE` never stored) via `invoice-status.ts`; payment transitions via `nextInvoiceStatus` (`collections.ts`) | **Implemented** |
| PromiseToPay | `ACTIVE, KEPT, BROKEN, RENEGOTIATED` | create/manage (edit/renegotiate/kept); auto-KEPT on matching payment; auto-sweep ACTIVE→BROKEN | **Implemented** |
| Message | `PENDING, SENT, DELIVERED, READ, FAILED` | — | **Schema-only** (no lifecycle; blocked) |
| User role | `OWNER, ADMIN, FINANCE_MANAGER, COLLECTOR, SALES, VIEWER` | RBAC enforcement | **Implemented** |
| Dispute | categories + resolved state | create + resolve | **Implemented** |

---

## 16. API Requirements

### 16.1 Implemented API surface (tenant-scoped, real DB)
| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth |
| `/api/register` | POST | Public; rate-limited |
| `/api/auth/forgot`, `/api/auth/reset` | POST | Password reset |
| `/api/dashboard` | GET | Real aggregates |
| `/api/import` | POST | Transactional batch |
| `/api/queue` | GET | Priority + "why here?" |
| `/api/customers`, `/api/customers/[id]` | GET/POST/PATCH | Customer CRUD; `/contacts/...`; `/duplicates` + merge |
| `/api/invoices`, `/api/invoices/[id]` | GET | Search + pagination; detail (items/allocations/timeline) |
| `/api/payments` | POST | FIFO/explicit allocation, reversal, dup guard |
| `/api/promises`, `/api/promises/[id]` | POST/PATCH | Create + manage |
| `/api/collection-events` | POST | Log outcomes |
| `/api/disputes`, `/api/disputes/[id]` | POST/PATCH | Create + resolve |
| `/api/analytics` | GET | DSO/CEI/adherence/overdue + 6-month series |
| `/api/notifications`, `/api/notifications/preferences` | GET/PATCH | Derived feed + prefs (graceful fallback) |
| `/api/jobs/promise-sweep` | POST | Idempotent; CRON_SECRET bearer; **not scheduled** |
| `/api/export` | GET | CSV/JSON stream |
| `/api/account` | DELETE | Purge + cascade; OWNER-only |
| `/api/team`, `/api/team/[userId]` | GET/POST/PATCH/DELETE | Invites, roles, remove |
| `/api/health` | GET | Live `SELECT 1` → 200/503 |

### 16.2 Blocked / Not built APIs
Communications/send-message endpoint (depends on email/WhatsApp providers), SMS, workflow execution, AI promise extraction, billing/entitlements, webhooks. **None of these exist.**

---

## 17. Data Requirements & Persistence

All entities are defined in `prisma/schema.prisma`; client generated via `@prisma/adapter-pg` at `src/generated/prisma`. Runtime usage is **pervasive and tenant-scoped** via `src/lib/repo.ts`.

**Schema:** 21 models + 6 enums (`Role`, `InvoiceStatus`, `PromiseStatus`, `CommunicationChannel`, `MessageStatus`, `Priority`). `NotificationPreference`, org schedule columns, and `IdempotencyKey` are covered in `20260904130000_schema_sync`.

**Data isolation:** enforced at the application layer — `withAuth` sets the tenant; `src/lib/repo.ts` scopes every query by `organizationId`. **DB-level RLS not yet applied** (blocked with managed prod infra, TODO-058).

---

## 18. Integrations & External Credentials

Full matrix in `CREDENTIALS_AND_INTEGRATIONS_MATRIX.md`. **No live external integrations** are configured. `IntegrationCredential` is schema-only. The `IntegrationCredential` model has no encryption code or KMS (must be added before storing provider secrets).

| Claimed Capability | Provider Needed | Connected? |
| --- | --- | --- |
| Email automation | e.g. Resend/SendGrid | **No (Blocked)** |
| WhatsApp automation | e.g. WhatsApp Business API / BSP | **No (Blocked)** |
| SMS | e.g. Twilio/MSG91 | **No (Blocked)** |
| Payment links / gateway | e.g. Razorpay/Stripe | **No (Blocked)** |
| AI promise extraction | OpenAI/LLM | **No (Not built)** |
| Bank statement auto-match | bank API/file | **No (Not built)** |

---

## 19. Notifications & Messaging

**In-app notifications are implemented:** derived feed (`GET /api/notifications` — broken promises, disputes, promises due) with a NotificationBell in the Sidebar plus a dashboard escalation banner. Preferences (`GET`/`PATCH /api/notifications/preferences`) persist with graceful fallback while the schema/migration is pending. **Outbound email/WhatsApp/SMS sending is NOT built (Blocked).**

---

## 20. Search

**Server-side search implemented** for customers (`GET /api/customers?search=`) and invoices (`GET /api/invoices` with search + derived status filter). Invoice list uses cursor pagination.

---

## 21. AI Capabilities

**None implemented.** Marketing claims (promise extraction from WhatsApp, tone control) are not shipped; no LLM/AI SDK is installed or called.

---

## 22. Billing / Subscriptions

**None implemented.** Pricing tiers (₹999/₹2,499/₹5,999 — Starter/Growth/Pro) are static landing-page marketing. No billing model, subscription table, payment provider, gating, or plans table (**Blocked, TODO-049**).

---

## 23. Security & Privacy (current state)

| Control | Status |
| --- | --- |
| Password hashing | **Implemented** — bcrypt cost 12 |
| Session | **Implemented** — JWT, 7-day maxAge, SameSite cookie |
| Route protection | **Implemented** — proxy session-cookie check, dot-bypass removed, static-extension allowlist |
| Registration validation | **Implemented** — zod client + server |
| Email uniqueness | **Implemented** (schema unique + 409) |
| Rate limiting | **Implemented** — register 5/10min per IP; mutating auth calls 300/min per user |
| RBAC | **Implemented** — ACTION_ROLES / MANAGE_ROLES guards |
| Tenant Isolation | **Implemented** — app-layer org scoping; **DB RLS pending** |
| Security headers / CSP | **Implemented** — `next.config.ts` (CSP self-only, `frame-ancestors 'none'`, HSTS, X-Frame-Options, etc.) |
| CSRF | **Mitigated** — no CORS endpoints + SameSite session cookie |
| Secrets management | `.env` git-ignored; env uses NextAuth v5 names; no hardcoded secrets in `src` |
| Audit logging | **Implemented** — `src/lib/audit.ts` wired into register/import/settings + mutations |
| Account deletion / export | **Implemented** — `DELETE /api/account`, `GET /api/export` |
| Privacy policy / ToS | **Implemented** — `/privacy`, `/terms` routes linked from footer |
| Open registration | Enabled by design; rate-limited |

---

## 24. Accessibility

**Implemented for key interactions** (verified `tsc`/lint): dialogs are `role=dialog`/`aria-modal`/`aria-labelledby` with Escape-to-close and initial focus; close buttons `aria-label="Close"`; NotificationBell `aria-haspopup`/`aria-expanded`/`role=menu`; settings toggles `role=switch`/`aria-checked`; status pills are dual (color + text). **Not fully verified** for keyboard/focus on every surface — `UNVERIFIED`.

---

## 25. Performance / NFR

- **Unit tests** 209/209 (Vitest 3.2.7) across 27 test files in `src/lib/__tests__` + `rbac.test.ts`.
- **CI**: `.github/workflows/ci.yml` with quality (lint+tsc+unit), integration (postgres:17 service + `prisma migrate deploy || db push` + `test:integration`), and build (dummy env) jobs.
- Observability: structured JSONL logs + `x-request-id` (`src/lib/server-context.ts` `withAuth`); `/api/health` live DB check.
- NFR targets (availability 99.9%, p95 latency, scale) are **proposed performance budgets not yet measured**; no load testing performed.
- Managed DB backups/PITR: **not configured (Blocked, TODO-058)**.

---

## 26. Error Handling, Edge Cases, Loading/Empty/Error States

- **Loading/error/empty/retry states** are implemented across dashboard, invoices (list + detail), customers (list + detail), queue, analytics, promises, payments, disputes, settings — with `role=alert` + "Try again" retry (respecting react-hooks/set-state-in-effect).
- **Destructive confirmations**: typed DELETE confirm for account deletion; `window.confirm` for team/contact removal; disabled-state guards.
- Edge cases handled: duplicate import (in-file + DB), malformed CSV rows, partial/overpay/unmatched payments, duplicate-payment guard, promise overrun via sweep, disputed-invoice exclusion from queue.

---

## 27. Production Readiness

Detailed checklist in `PRODUCTION_READINESS_CHECKLIST.md`. **Not fully production-ready** because the following remain **blocked**: email/WhatsApp/SMS delivery, billing, managed prod infra (DB, RLS, backups/PITR, staging/prod), Sentry DSN, scheduler/cron provisioning (promise-sweep not yet scheduled), integration tests (TODO-051), E2E (TODO-052), and pending migrations (NotificationPreference, org columns, IdempotencyKey store).

---

## 28. Release Criteria

The quality gate (`tsc`, lint, 209/209 unit tests across 27 suites, build) passes and features work against a real DB with authenticated tenant data. Remaining release blockers are the external items in §27 (notably the promise-sweep scheduler and pending migrations).

---

## 29. Future Enhancements

- Automated email + WhatsApp follow-up with tone control (Blocked on providers).
- AI promise extraction from WhatsApp/email replies (Not built).
- Payment links + reconciliation + credit notes + deductions (Not built).
- Escalation and approval workflows (Not built).
- Multi-business-unit support, forecasting, API access (Not built).
- MSME Samadhaan / legal referral affordances (Not built).

---

## 30. Key Implementation Status Matrix

| Area | Implemented | Partial | Schema-only | Blocked/Not built | Evidence |
| --- | --- | --- | --- | --- | --- |
| Auth / register / login / logout / reset | ✓ | | | OAuth, email verification | real DB + RBAC |
| RBAC + tenant isolation | ✓ | | | DB RLS pending | ACTION_ROLES/MANAGE_ROLES, repo.ts |
| Landing / auth pages | ✓ | | | | |
| Dashboard + queue + analytics | ✓ | | | | real aggregates + metrics |
| Import | ✓ | | | Excel/Tally | transactional batch |
| Customers / contacts / dedupe | ✓ | | | | CRUD + merge |
| Invoices | ✓ | | | | search + pagination + detail |
| Payments / promises / disputes / events | ✓ | | | | allocation, sweep, resolve |
| Notifications | ✓ | | | | derived feed + prefs (migration pending) |
| Communications (email/WA/SMS) | | | Message model | **Blocked** | no provider; route only |
| Billing / entitlements | | | | **Blocked** | none |
| Testing | ✓ unit + CI | | | integration + E2E | 209/209; TODO-051/052 |
| Production infra / monitoring | /api/health + logs | | | **Blocked** (Sentry, DB, backups) | TODO-058 |

---

## Appendix A — Evidence Index

Primary evidence files:
- Schema: `prisma/schema.prisma`
- Tenant data access: `src/lib/repo.ts`, `src/lib/server-context.ts` (`withAuth`)
- Auth: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`
- Pure domain modules: `src/lib/queue-item.ts`, `src/lib/payment-allocation.ts`, `src/lib/invoice-status.ts`/`collections.ts`, `src/lib/metrics.ts`, `src/lib/risk-score.ts`, `src/lib/audit.ts`, `src/lib/rate-limit.ts`, `src/lib/promise-state.ts`, `src/lib/rbac.ts`
- API routes: `src/app/api/**`
- Screens: `src/app/(dashboard)/dashboard/**`
- Tests: `src/lib/__tests__/**` (209/209)
- CI: `.github/workflows/ci.yml`
- Statuses: `docs/MASTER_TODO.md` (authoritative)
