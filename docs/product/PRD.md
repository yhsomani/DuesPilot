# PRD — DuesPilot Collections Operating System

| Attribute | Value |
| --- | --- |
| **Document name** | Product Requirements Document |
| **Project name** | DuesPilot |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Status** | DRAFT — reflects current codebase (commit `d037888`), not a target spec |
| **Source of truth** | Repository at `/Users/yashsomani/OfficeWork-learning/DuesPilot` + GitHub `yhsomani/DuesPilot` |
| **Scope** | Complete codebase audit → product specification, reverse-engineered from implementation |
| **Methodology** | Evidence-based bidirectional audit (Documentation ↔ Code ↔ Requirements ↔ Business ↔ UX ↔ Architecture) |
| **Confidence** | High for implemented behavior; explicit labels (UNVERIFIED / AMBIGUOUS / PROPOSED) where not |
| **Known limitations** | No runtime/production deployment exists; no external integrations are live; no tests exist |

> Evidence labels used throughout:
> - **CODEBASE-VERIFIED** — fact directly supported by source code.
> - **DOCUMENTED-ONLY** — requirement supported only by marketing/docs, no implementation evidence.
> - **PROPOSED** — improvement not currently required by the implementation.
> - **UNVERIFIED** — requires external/runtime validation.
> - **AMBIGUOUS** — product/business intent requires human decision.

---

## 1. Executive Summary

DuesPilot is positioned as **"a Collections Operating System for Indian B2B SMEs"** — a web application intended to help small and medium Indian businesses automate the recovery of overdue invoices (accounts receivable / collections).

As it exists in the repository today, the product is a **functional front-end prototype (high-fidelity UI mock) with a real-but-narrowly-used backend foundation**. The repository contains:

- A **complete, migrated PostgreSQL schema** (19 tables, 6 enums) modeling the full collections domain: `Organization`, `User`, `Customer`, `Contact`, `Invoice`, `InvoiceItem`, `Payment`, `PaymentAllocation`, `PromiseToPay`, `Dispute`, `Message`, `CollectionEvent`, `CollectionWorkflow`, `WorkflowAction`, `IntegrationCredential`, `AuditLog`, plus standard NextAuth tables (`Account`, `Session`, `VerificationToken`).
- A **real credentials-based authentication + registration flow** that writes to the database (verified working at runtime during this analysis, `POST /api/register` → 201, login → 302).
- **17 front-end pages**, all of which render, but **every collection-facing page (Dashboard, Queue, Customers, Invoices, Promises, Analytics, Import, Settings) is a `"use client"` component backed by hardcoded mock data** — none of them read from or write to the database.
- **No test files, no test framework, no CI/CD, no deployment config, no external provider credentials.**

**Bottom line:** this is a visually complete, marketing-credible prototype demonstrating the *intended* product experience, with only two real backend capabilities implemented end-to-end (register + login + route protection). The ambitious domain (automated collections, promises, disputes, payments, workflows, WhatsApp/email automation, analytics) is fully modeled in the database but **not connected to any running business logic or UI**.

---

## 2. Product Vision

**CODEBASE-VERIFIED (from marketing copy in `src/app/page.tsx`, `src/app/layout.tsx` metadata):**
> "Stop chasing overdue invoices manually … DuesPilot tells you who to contact, what to say, when to follow up, and what happened next — from first reminder to payment."

A `Collections Operating System` that converts a messy receivables ledger into a prioritized, automated daily action list for Indian B2B SMEs.

---

## 3. Product Mission

To help Indian B2B SMEs recover cash owed to them faster by:
1. Importing their receivables (customers, invoices, due dates) in minutes.
2. Prioritizing a daily "collection queue."
3. Automating follow-up communication (email/WhatsApp/SMS/call).
4. Tracking promise-to-pay and escalation.
5. Providing collection analytics.

**Implementation status of each mission pillar** is assessed in the Feature Inventory (§10).

---

## 4. Problem Statement

**DOCUMENTED/proposed (from landing page):** Indian MSMEs face chronic delayed payments. The landing page cites market context: ₹55,244 Cr delayed payment claims on MSME Samadhaan, 2,56,892 delayed-payment applications filed, 9.45 Cr Udyam registrations.

**The operational problem the product targets (from UI copy, `src/app/page.tsx`):** SMEs chase overdue invoices manually, buried in aging spreadsheets, not knowing whom to contact, what to say, when to follow up, or what happened previously with each customer.

---

## 5. Target Users & Personas

### 5.1 User Roles (from `prisma/schema.prisma` `Role` enum)
`OWNER`, `ADMIN`, `FINANCE_MANAGER`, `COLLECTOR`, `SALES`, `VIEWER`.

**CODEBASE-VERIFIED caveat:** these six roles exist in the schema and the `User.role` column defaults to `VIEWER`. However:
- Registration hardcodes a new user's role to `OWNER` (`src/app/api/register/route.ts:46`).
- **No authorization logic exists anywhere** — the proxy (`src/proxy.ts`) only checks for the presence of a session cookie and does not inspect role; no page, API, or component gates anything by role.

### 5.2 Proposed Personas (inferred from roles + UI)
| Persona | Likely role | Goals |
| --- | --- | --- |
| Business Owner | OWNER | See total exposure, approve escalations, manage settings |
| Finance Manager | FINANCE_MANAGER | Reconcile payments, run aging/analytics |
| Collector | COLLECTOR | Work the daily queue — call/WhatsApp/email customers |
| Sales (with credit exposure) | SALES | View customer/order context |
| Viewer / Auditor | VIEWER | Read-only access |

**Personas are AMBIGUOUS**: the repository defines role *names* but no role-specific behavior, permissions, or workflows. A business decision is required to define what each role can actually do.

---

## 6. Jobs To Be Done (JTBD)

**CODEBASE-VERIFIED** (visible from screens/marketing):
1. "When I have a pile of overdue invoices, I want to know **who to chase today**, so I don't waste time."
2. "When I contact a customer, I want to know **what happened last time**, so I don't repeat myself."
3. "When a customer promises to pay, I want to **track that they actually pay**, so I can escalate if they don't."
4. "When I get paid, I want to **match the payment to the invoice**, so my ledger stays accurate."
5. "When a customer disputes an invoice, I want to **track the reason and resolution**, so I don't keep chasing a disputed amount."
6. "When I set up, I want to **import my existing receivables quickly**, so I don't key in data again."

---

## 7. Value Proposition

Import receivables → get a prioritized automated collection queue → automated follow-ups → promise tracking → payment reconciliation → analytics. **Value proposition is fully DOCUMENTED (marketing) but only the import UX skeleton and queue *screens* exist; the automated follow-up, promise extraction, reconciliation, and analytics are not functional.**

---

## 8. Product Goals & Non-Goals

### 8.1 Product Goals (PROPOSED)
- G1: Reduce Days Sales Outstanding (DSO) for SME users.
- G2: Reduce manual effort in collections follow-up.
- G3: Improve litigation-free recovery rates.

### 8.2 Non-Goals (PROPOSED)
- NG1: Not an ERP/accounting system (it *imports* receivables, does not do bookkeeping).
- NG2: Not a payment gateway (records/matches payments; does not process them).
- NG3: Not a general CRM (collections-focused).

---

## 9. Scope & Architecture Overview

### 9.1 In-Scope (current, by implementation evidence)
- Authentication (credentials), registration, session cookie route protection.
- 17 marketing/CRUD screens, 15 of which are mock-data prototypes.
- Imports: client-side CSV parsing + column mapping (no persistence).
- A fully-migrated relational schema for the collections domain.

### 9.2 Architecture (current)
- **Framework:** Next.js 16.3.4 (App Router, Turbopack), React 19.2.8.
- **Language:** TypeScript (strict), `@/*` → `./src/*`.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`), CSS variables, Geist fonts.
- **DB/ORM:** PostgreSQL via Prisma 7 with `@prisma/adapter-pg` driver adapter; generated client at `src/generated/prisma` (ignored by git).
- **Auth:** NextAuth v5 (`next-auth@5.0.0-beta.32`), JWT session strategy, Credentials provider, bcryptjs hashing.
- **Route protection:** `src/proxy.ts` (Next.js 16 `proxy` convention) cookie-presence check.
- **State:** local React `useState` only — no Redux/Zustand/React Query/SWR.
- **Data flow:** NO server components fetch data for the product pages; every dashboard page renders pre-baked arrays.

### 9.3 Routing Map (all routes CODEBASE-VERIFIED)
| Route | Page | Layout | Protection |
| --- | --- | --- | --- |
| `/` | Landing | `src/app/layout.tsx` | Public (proxy allowlist) |
| `/login` | Login | `(auth)` | Public |
| `/register` | Register | `(auth)` | Public |
| `/dashboard` | Dashboard | `(dashboard)` | Protected |
| `/dashboard/queue` | Collection Queue | `(dashboard)` | Protected |
| `/dashboard/customers` | Customers | `(dashboard)` | Protected |
| `/dashboard/customers/[id]` | Customer Detail | `(dashboard)` | Protected |
| `/dashboard/invoices` | Invoices | `(dashboard)` | Protected |
| `/dashboard/payments` | Payments (placeholder) | `(dashboard)` | Protected |
| `/dashboard/promises` | Promises to Pay | `(dashboard)` | Protected |
| `/dashboard/disputes` | Disputes (placeholder) | `(dashboard)` | Protected |
| `/dashboard/communications` | Communications (placeholder) | `(dashboard)` | Protected |
| `/dashboard/import` | Import Receivables | `(dashboard)` | Protected |
| `/dashboard/analytics` | Analytics | `(dashboard)` | Protected |
| `/dashboard/settings` | Settings | `(dashboard)` | Protected |
| `/api/auth/[...nextauth]` | NextAuth handler | — | Public (proxy allowlist) |
| `/api/register` | Register API | — | Public (proxy allowlist) |

---

## 10. Feature Inventory

Stable IDs. Full traceability in `REQUIREMENT_TRACEABILITY_MATRIX.md`; status legend: Fully Implemented / Partial / UI Only / Backend Only / Config Only / Documentation Only / Not Implemented.

### 10.1 AUTH — Authentication & Accounts
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| AUTH-001 | Credentials registration (creates Organization + User) | **Fully Implemented** | `src/app/api/register/route.ts:13`; verified 201 at runtime |
| AUTH-002 | Email/password login | **Fully Implemented** | `src/lib/auth.ts:8` Credentials provider, bcrypt compare; verified 302 at runtime |
| AUTH-003 | Session cookie (JWT) | **Fully Implemented** | `src/lib/auth.ts:47` `strategy: "jwt"` |
| AUTH-004 | Route protection for `/dashboard/*` | **Fully Implemented (cookie-presence only)** | `src/proxy.ts:27` |
| AUTH-005 | Registration input validation (client+server) | **Fully Implemented** | zod in `register/page.tsx:8` + `register/route.ts:6` |
| AUTH-006 | Login input validation (client) | **Fully Implemented** | `login/page.tsx:24-34` |
| AUTH-007 | Role-based authorization (RBAC) | **Not Implemented** | No role checks anywhere; only schema enum |
| AUTH-008 | Password recovery / reset | **Not Implemented** | No UI, API, or `VerificationToken` usage code path |
| AUTH-009 | Email verification | **Not Implemented** | `emailVerified` column exists; no flow |
| AUTH-010 | Logout | **Partially Implemented** | `signOut` exported in `auth.ts:6` but no button/handler wired in UI; no UI logout control found |
| AUTH-011 | OAuth / external identity providers | **Not Implemented** | `Account` table exists; no provider configured |
| AUTH-012 | Invite / manage team members | **Not Implemented** | No UI/API despite `Organization.usersCount` |

### 10.2 DATA/IMPORT — Receivables Import
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| IMP-001 | CSV upload (drag/drop + browse) | **UI Only** | `import/page.tsx` PapaParse; parses to state |
| IMP-002 | Column mapping (auto + manual) | **UI Only** | `import/page.tsx:57-98` |
| IMP-003 | Preview of mapped rows | **UI Only** | `import/page.tsx:305` |
| IMP-004 | Persist imported invoices/customers | **Not Implemented** | `handleImport` only `setTimeout` + 2s fake; no `fetch`/Prisma write (`import/page.tsx:119`) |
| IMP-005 | XML/XLSX support (marketing claim) | **Not Implemented** | UI accepts `.csv` only; marketing copy still says "Tally, Excel" |

### 10.3 QUEUE — Collection Queue
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| QUEUE-001 | Prioritized action list | **UI Only (mock)** | `queue/page.tsx:19` `mockQueue` |
| QUEUE-002 | Priority filter (all/high/medium/low) | **UI Only (mock)** | `queue/page.tsx:106` |
| QUEUE-003 | Priority from real data (aging + amount scoring) | **Not Implemented** | `getPriorityColor` util unused by queue; no server data |
| QUEUE-004 | "Next action" generation | **UI Only (mock)** | `queue/page.tsx` `nextAction` strings |

### 10.4 CUST/INV — Customers & Invoices
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| CUST-001 | Customer list w/ search + sort | **UI Only (mock)** | `customers/page.tsx:21` |
| CUST-002 | Customer detail w/ invoices, timeline, contacts, notes | **UI Only (mock)** | `customers/[id]/page.tsx:6` — NOTE: renders same mock for every id (`const customer = mockCustomer`) |
| CUST-003 | Customer CRUD (create/edit) | **Not Implemented** | "Edit" button is a no-op (`customer/[id]/page.tsx:97`) |
| INV-001 | Invoice list w/ status filter | **UI Only (mock)** | `invoices/page.tsx:20` |
| INV-002 | Invoice create/edit/pay | **Not Implemented** | No UI/API |

### 10.5 PROMISE — Promise-to-Pay
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| PROM-001 | Promise list w/ active/kept/broken filter | **UI Only (mock)** | `promises/page.tsx:20` |
| PROM-002 | Promise stats (active/broken/kept sums) | **UI Only (mock)** | `promises/page.tsx:97` |
| PROM-003 | Expose/record a promise | **Not Implemented** | No create/update API |
| PROM-004 | Extract promise from WhatsApp/email (AI) | **Not Implemented** | Marketing claim only; `source` field exists in schema |
| PROM-005 | Auto-mark broken on missed date | **Not Implemented** | No scheduler |

### 10.6 PAY — Payments
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| PAY-001 | Payment list | **Not Implemented** | `payments/page.tsx` is empty-state placeholder |
| PAY-002 | Record payment | **Not Implemented** | Button no-op |
| PAY-003 | Payment allocation/matching to invoices | **Not Implemented** | Schema `PaymentAllocation` exists; no logic |
| PAY-004 | Bank statement import / auto-match | **Not Implemented** | Marketing copy only (`payments/page.tsx:18`) |

### 10.7 DIP — Disputes
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| DIP-001 | Dispute list | **Not Implemented** | `disputes/page.tsx` empty-state placeholder |
| DIP-002 | Log a dispute | **Not Implemented** | Button no-op; schema `Dispute` exists |
| DIP-003 | Dispute categories + resolution workflow | **Not Implemented** | Marketing copy only |

### 10.8 COMM — Communications
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| COMM-001 | Communication hub (email/WhatsApp/SMS history) | **Not Implemented** | `communications/page.tsx` empty-state placeholder |
| COMM-002 | Send message | **Not Implemented** | No integration; schema `Message` exists |
| COMM-003 | Email delivery | **Not Implemented** | No email provider configured |
| COMM-004 | WhatsApp delivery | **Not Implemented** | No WhatsApp API credentials |
| COMM-005 | Delivery/read status tracking | **Not Implemented** | `MessageStatus` enum only |

### 10.9 ANALYTICS
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| ANL-001 | KPI cards (DSO, CEI, promise adherence…) | **UI Only (mock)** | `analytics/page.tsx:5` hardcoded |
| ANL-002 | Monthly collected vs overdue chart | **UI Only (mock)** | `analytics/page.tsx:14` |
| ANL-003 | Top overdue customers | **UI Only (mock)** | `analytics/page.tsx:80` |

### 10.10 SETT
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| SET-001 | Organization settings form | **UI Only** | `settings/page.tsx` `defaultValue="Acme Pvt Ltd"`; no handler |
| SET-002 | Notification preferences toggles | **UI Only** | `settings/page.tsx:40`; no save |
| SET-003 | Export all data | **Not Implemented** | Button no-op |
| SET-004 | Delete account | **Not Implemented** | Button no-op; no deletion API |
| SET-005 | Save changes | **Not Implemented** | Button no-op |

### 10.11 WF/AUDIT — Workflows & Audit (schema-only)
| ID | Feature | Status | Evidence |
| --- | --- | --- | --- |
| WF-001 | CollectionWorkflow rules + actions | **Schema Only** | `CollectionWorkflow`, `WorkflowAction` models; no execution engine |
| AUDIT-001 | Audit log capture | **Schema Only** | `AuditLog` model; nothing writes to it |
| INT-001 | Integration credentials store | **Schema Only** | `IntegrationCredential` model; no read/write code |

---

## 11. User Stories

For brevity, consolidated stories with status. Full acceptance criteria traceable to the Feature IDs above.

| Story ID | User | Story | Related Feature | Status |
| --- | --- | --- | --- | --- |
| US-AUTH-01 | Prospect | As a prospect I can create an account with name, email, password, and company so I can try the product. | AUTH-001 | **Implemented** |
| US-AUTH-02 | User | As a user I can log in with my email and password so I can access the dashboard. | AUTH-002 | **Implemented** |
| US-AUTH-03 | User | As a user I can log out so I can end my session. | AUTH-010 | **Missing** |
| US-IMP-01 | Owner | As an owner I can upload my receivables CSV and map columns so I can get started. | IMP-001..003 | **UI only** |
| US-IMP-02 | Owner | As an owner the imported invoices and customers are saved so I can see them in the app. | IMP-004 | **Missing** |
| US-QUEUE-01 | Collector | As a collector I see today's prioritized actions so I know who to contact. | QUEUE-001 | **UI (mock)** |
| US-CUST-01 | User | As a user I can open a customer and see their invoices, timeline, and contacts. | CUST-002 | **UI (mock)** |
| US-PROM-01 | Collector | As a collector I can record when a customer promises to pay so I can follow up. | PROM-003 | **Missing** |
| US-PAY-01 | Finance | As a finance user I can record and match payments to invoices. | PAY-002/003 | **Missing** |
| US-ANL-01 | Owner | As an owner I can see collection KPIs and trends. | ANL-001..003 | **UI (mock)** |

---

## 12. User Flows

### 12.1 Registration (FULLY IMPLEMENTED — verified)
Trigger → prospect clicks "Get Started"/"Start free trial"/"Import my receivables". → Visit `/register`.
→ Fill name, email, password, company. → Client zod validation. → `POST /api/register` (JSON).
→ API zod validation → check duplicate email (409) → bcrypt hash (cost 12) → create `Organization` → create `User` (role OWNER). → 201.
→ Redirect `/login?registered=true` → sign in → `POST /api/auth/callback/credentials` → JWT cookie → redirect to `/dashboard`.
Failure paths: validation (400), duplicate (409), server error (500), bad credentials ("Invalid email or password").
**Retry/recovery:** No password recovery; no email verification.

### 12.2 Dashboard access (PARTIALLY IMPLEMENTED)
Trigger → authenticated navigation to `/dashboard`. → `proxy.ts` checks `authjs.session-token` cookie.
→ Present → render Dashboard **with mock stats/aging/queue** (no real data).
Failure: absent cookie → 307 → `/login?callbackUrl=/dashboard`.
**Gap:** after login, dashboard shows fake numbers, not the user's data.

### 12.3 Import (UI-ONLY)
Trigger → visit `/dashboard/import`. → Upload/drop CSV → PapaParse → auto-map → manual map → preview → "Import N invoices".
→ **Simulates a 2s delay, then shows "Import successful!" — no data is written.** The "View collection queue" link leads to a queue still showing the static mock queue.

### 12.4 Customer detail (UI-ONLY, BROKEN semantics)
Trigger → click a customer in list → `/dashboard/customers/[id]`.
→ **Regardless of `[id]`, the page always renders the hardcoded "Raj Steel" record** (customer id is destructured as `_id` and unused). Clicking any customer shows the same customer.

### 12.5 Logout / Settings / Export / Delete (NOT IMPLEMENTED)
No functional logout button, no save settings, no data export, no account deletion.

### 12.6 Password recovery (NOT IMPLEMENTED)
No "forgot password" link/API anywhere.

---

## 13. Component Inventory

| Component | Location | Evidence | Status |
| --- | --- | --- | --- |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation groups + lucide icons | Used (dashboard layout) |
| `TimelineIcon` | `customers/[id]/page.tsx:39` | SVG icon per event type | Used locally |
| `RootLayout` | `src/app/layout.tsx` | fonts, metadata, html/body | Used |
| `DashboardLayout` | `src/app/(dashboard)/layout.tsx` | Sidebar + main | Used |

**No reusable UI kit** (no button/card/table/badge primitives) exists. All presentational markup is inline per page. There is **no "created but unused" component at the page level**, but **every dashboard data screen duplicates the same layout/table/card markup inline** (duplication, not shared components).

**Components referenced but missing:** None directly, but the marketing makes claims (e.g., "payment links", "forecasting", "API access") with no corresponding component or API.

---

## 14. Business Rules (see also `BRD.md` §Business Rules for full table)

Implemented (CODEBASE-VERIFIED):
- BR-01 Register requires name≥2, valid email, password≥8, company≥2 (`register/route.ts:6`, `register/page.tsx:8`).
- BR-02 Email must be unique (`User.email @unique` schema; 409 in `register/route.ts:28`).
- BR-03 Password hashed with bcrypt cost 12 (`register/route.ts:35`).
- BR-04 New account role = OWNER (`register/route.ts:46`).
- BR-05 Complex password rules / lockout / session timeout: **not defined (AMBIGUOUS)**.
- BR-06 Invoice number unique per organization (`Invoice` `@@unique([organizationId, invoiceNumber])`).
- BR-07 Priority coloring util (`getPriorityColor`) exists but is not wired to any screen (dead-ish).

Not enforced anywhere but present in schema (documented implicitly): invoice status state machine, promise status transitions, payment allocation, workflow execution, audit logging.

---

## 15. State Machines

| Entity | States (schema) | Transition logic | Status |
| --- | --- | --- | --- |
| Invoice | `DRAFT, OPEN, DUE_SOON, OVERDUE, DISPUTED, PROMISED, PROMISE_BROKEN, PARTIALLY_PAID, PAID, CANCELLED` (`InvoiceStatus`) | **None implemented** | Schema only |
| PromiseToPay | `ACTIVE, KEPT, BROKEN, RENEGOTIATED` (`PromiseStatus`) | **None implemented**; UI uses local strings `active/kept/broken` | Schema only; UI mock |
| Message | `PENDING, SENT, DELIVERED, READ, FAILED` (`MessageStatus`) | **None implemented** | Schema only |
| User role | `OWNER, ADMIN, FINANCE_MANAGER, COLLECTOR, SALES, VIEWER` | **None** | Schema only |
| Dispute status | `open` (string, free-form) | None | Schema only |

**Critical note:** the UI Promise page (`promises/page.tsx`) uses its **own** status string (`"active" | "kept" | "broken"`) that does **not** match the schema enum (`ACTIVE/KEPT/BROKEN/RENEGOTIATED`) — a contract mismatch between UI mock and data model.

---

## 16. API Requirements

### 16.1 Current API surface (complete — CODEBASE-VERIFIED)
| Endpoint | Method | Auth | Purpose | Status |
| --- | --- | --- | --- | --- |
| `/api/register` | POST | None (public) | Create Organization+User | Implemented |
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handlers | Implemented |

### 16.2 Missing APIs (required to make the UI real)
| Endpoint | Purpose | Needed by |
| --- | --- | --- |
| `POST /api/import` (or similar) | Persist parsed CSV rows | IMP-004 |
| `GET /api/dashboard` | Real stats/aging/queue | Dashboard |
| `GET/PATCH /api/customers`, `/api/customers/[id]` | Customer CRUD | Customers |
| `GET/PUT /api/invoices` | Invoice list/update | Invoices |
| `GET/POST /api/promises`, `PATCH /[id]` | Promise lifecycle | Promises |
| `GET/POST /api/payments` | Payments | Payments |
| `POST /api/collections/[...]/actions` | Queue actions (call/remind/wa) | Queue |
| `GET/POST /api/disputes` | Disputes | Disputes |
| `POST /api/communications` | Send & log messages | Communications |
| `GET /api/analytics` | Aggregate KPIs | Analytics |
| `GET/PUT /api/me/organization`, `DELETE /api/me`, `/api/export` | Settings | Settings |
| `POST /api/auth/reset`, etc. | Password recovery | AUTH-008 |

**All of the above are NOT IMPLEMENTED** — there is not a single `src/app/api/*` route for domain data beyond register/auth.

---

## 17. Data Requirements & Persistence

All persisted entities are defined in `prisma/schema.prisma` and migrated in `prisma/migrations/20260904112615_init/migration.sql` (applied). Persistence **models** the full domain, but **runtime usage** of Prisma is limited to: `register/route.ts` (create org/user, find user), and `auth.ts` (find user). **No other code path reads or writes the collections tables.**

| Entity | Purpose | Ownership | Runtime CRUD |
| --- | --- | --- | --- |
| Organization | Tenant (company) | — | Create (register) only |
| User | Auth + role | Organization | Create/read only |
| Customer / Contact | Receivables parties | Organization | None |
| Invoice / InvoiceItem | Invoices | Organization+Cust | None |
| Payment / PaymentAllocation | Payments | Organization+Cust | None |
| PromiseToPay | Promises | Organization+Cust | None |
| Dispute | Disputes | Invoice | None |
| Message | Communications | Organization | None |
| CollectionEvent | Timeline | Organization+Cust | None |
| CollectionWorkflow / WorkflowAction | Automation | Organization | None |
| IntegrationCredential | Provider creds | Organization | None |
| AuditLog | Audit | Organization | None |
| Account/Session/VerificationToken | NextAuth | User | Standard |

**Data isolation:** `organizationId` foreign keys exist per tenant entity, but **there is no row-level security (RLS) enforced at the database layer** and no authorization code enforcing tenant scoping on reads/writes (because no domain reads/writes exist yet). This is a security-critical gap once domain APIs are added.

---

## 18. Integrations & External Credentials

**There are NO live external integrations.** The `IntegrationCredential` table is schema-only. No email, WhatsApp, SMS, payment, storage, or AI provider is configured or called.

Full matrix in `CREDENTIALS_AND_INTEGRATIONS_MATRIX.md`. Summary of what the product claims (marketing, `page.tsx`) vs. what is connected:

| Claimed Capability | Provider Needed | Connected? |
| --- | --- | --- |
| Email automation | e.g. Resend/SendGrid | **No** |
| WhatsApp automation | e.g. WhatsApp Business API / Twilio / Gupshup | **No** |
| SMS | e.g. Twilio/MSG91 | **No** |
| Payment links / gateway | e.g. Razorpay/Stripe | **No** |
| AI promise extraction | e.g. OpenAI/LLM | **No** |
| Bank statement auto-match | bank API/file | **No** |

**The product cannot perform any real-world automated communication or payment activity until external provider accounts + credentials + webhook/callback + domain verification + approval (WhatsApp) are in place.** This is a fundamental blocker to the core value proposition.

---

## 19. Notifications & Messaging

No notification system exists (no toasts, no in-app notifications, no email/SMS sending, no scheduler). The Settings page has notification-preference toggles that are UI-only.

---

## 20. Search

No backend search. Customer list search is a client-side `.filter()` over the in-memory mock array (`customers/page.tsx:121`). No search over DB, no full-text search, no index-managed search.

---

## 21. AI Capabilities

**None implemented.** Marketing claims ("extract promises from WhatsApp replies", "tone control") are DOCUMENTED-ONLY. No LLM/AI SDK dependency is installed or called.

---

## 22. Billing / Subscriptions

**None implemented.** Pricing tiers are presented on the landing page (₹999/₹2,499/₹5,999 per month — Starter/Growth/Pro) as static marketing. There is **no billing model, no subscription table, no payment provider, no gating, no plans table in the schema.** Monetization is entirely PROPOSED/undelivered.

---

## 23. Security & Privacy Requirements (current state)

| Control | Status |
| --- | --- |
| Password hashing | **Implemented** — bcrypt cost 12 |
| Session | **Implemented** — JWT, cookie `authjs.session-token` (`__Secure-` in prod) |
| Route protection | **Partial** — cookie-presence only, no role/tenant authorization |
| Registration validation | **Implemented** — zod client+server |
| Email uniqueness | **Implemented** (schema unique + 409 check) |
| Rate limiting / abuse prevention | **Not Implemented** — no throttling on `/api/register` (brute-force/open-registration risk) |
| RBAC | **Not Implemented** |
| Tenant data isolation / RLS | **Not Implemented** |
| Secrets management on client | No client-side secrets (good); but `NEXTAUTH_SECRET` in `.env` is a weak dev default (`duespilot-dev-secret-change-in-production`) — **UNVERIFIED for production**; `.env` is git-ignored (good) |
| Secure cookie in prod | Deterministic by `NODE_ENV`; **UNVERIFIED in deployed runtime** |
| Audit logging | Schema only, never written |
| Account deletion / data export | **Not Implemented** |
| Privacy policy / ToS / consent | **Not Implemented** (footer links are text spans, `page.tsx:424-427`) |
| Open registration | **Enabled by design** (public `/api/register`) — acceptable pre-launch, must be gated/rate-limited/protected pre-production |

---

## 24. Accessibility

**No explicit accessibility work detected.** No `aria-*` attributes, no focus-trap/landmark structure, no keyboard-navigation testing, no automated aXe/axe-core tooling. Color is used to convey risk/status with no non-color alternative. **PROPOSED:** full a11y audit is required before production.

---

## 25. Performance / NFR

Given all dashboard pages are static mock data, there is little to measure. Proposed NFRs (none exist in code — all **PROPOSED — ENGINEERING DECISION REQUIRED**):
- Performance: <2s time-to-interactive on dashboard; API p95 <300ms; DB queries <150ms.
- Availability: 99.9% uptime target (post-deployment).
- Scalability: handle 100k invoices / 10k customers per org; multi-tenant.
- Observability: structured logs + request tracing + error tracking (Sentry) — none present.
- Backup/DR: managed PostgreSQL daily backups + point-in-time; **none configured**.
- i18n: English only (hardcoded); INR formatting present. **PROPOSED** decide on local languages (Hindi/Gujarati/…) — AMBIGUOUS.

---

## 26. Error Handling, Edge Cases, Empty/Loading/Error States

- **Loading states:** none (no async data in dashboard pages; register/login have local `loading` booleans).
- **Empty states:** only Payments/Disputes/Communications placeholder pages have empty-state UI; Customers/Invoices/Queue/Promises render static data and would break or show nothing sensible if data were empty.
- **Error states:** register/login show inline errors; no global error boundary present (no `error.tsx`), no `not-found.tsx`, no `loading.tsx` seen.
- **Retry/recovery:** none.
- **Edge cases not handled:** duplicate import, malformed CSV rows, date formats, currency parsing, huge files (PapaParse caps preview to 50 rows but import claims all), customer with no `[id]` match (always shows mock), partial payments, promise overrun.

---

## 27. Production Readiness Requirements

Comprehensive checklist in `PRODUCTION_READINESS_CHECKLIST.md`. High-level verdict: **NOT PRODUCTION-READY.** There is no domain functionality wired to the DB, no tests, no CI/CD, no monitoring, no infrastructure, no external integrations, no legal pages, no secrets hardening, no RBAC/RLS.

---

## 28. Release Criteria (PROPOSED — target, not current)

To call a given feature "done": unit tests pass, feature works against a real DB with authenticated real tenant data, integration provider functions with a sandbox, and manual QA on desktop+mobile accepts. None currently satisfiable for the product screens.

---

## 29. Future Enhancements (PROPOSED — marketing-evidenced intent)

- Automated email + WhatsApp follow-up with tone control.
- AI promise extraction from WhatsApp/email replies.
- Payment links + reconciliation + credit notes + deductions.
- Escalation and approval workflows.
- Multi-business-unit support, forecasting, and API access.
- MSME Samadhaan / legal referral affordances.

---

## 30. Key Implementation Status Matrix

| Area | Fully Impl | Partial | UI Only (mock) | Schema Only | Missing | Broken |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Auth / register / login | ✓ | ✓ | | | logout, reset, RBAC | session-scope |
| Landing / login / register pages | ✓ | | | | | |
| Dashboard screens (data) | | | ✓ | | real data wiring | |
| Collections domain logic | | | | ✓ | all execution | |
| Import | | | ✓ | | persistence | |
| Integrations (email/WhatsApp/etc.) | | | | | all | |
| Testing | | | | | all | |
| Production infra | | | | | all | |

---

## Appendix A — Evidence Index

Primary evidence files:
- Schema: `prisma/schema.prisma`
- Migration: `prisma/migrations/20260904112615_init/migration.sql`
- Auth: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Register: `src/app/api/register/route.ts`, `src/app/(auth)/register/page.tsx`
- Proxy: `src/proxy.ts`
- Prisma client: `src/lib/prisma.ts`
- Utils: `src/lib/utils.ts`
- Screens: `src/app/(dashboard)/dashboard/**`, `src/app/(auth)/**`, `src/app/page.tsx`, `src/app/layout.tsx`
- Component: `src/components/layout/Sidebar.tsx`
- Config: `package.json`, `next.config.ts`, `tsconfig.json`, `prisma7.config.ts`, `eslint.config.mjs`, `.env.example`, `AGENTS.md`/`CLAUDE.md`
