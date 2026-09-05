# DuesPilot — Product Specification

> Part of `docs/` (Phase 1, TODO-003). Mirrors the implemented system; implementation status lives in `docs/MASTER_TODO.md` and `docs/product/FEATURE_STATUS_MATRIX.md`.

## 1. Product summary

DuesPilot is a multi-tenant, web-based B2B **receivables collections** platform for finance and collections teams in India. It turns a spreadsheet of outstanding invoices into a prioritized daily work queue, records collection actions (calls, follow-ups, disputes, payment promises), reconciles incoming payments against invoices (FIFO or explicit), and computes the metrics collections teams are measured on (DSO, collection effectiveness, promise adherence). Each organization is fully isolated; users carry role-based permissions.

## 2. Persona

| Persona | Goals | Pain today |
| --- | --- | --- |
| **Collections agent** (COLLECTOR) | Clear overdue amounts; track every follow-up; know "what do I do next". | Silos in Excel; no single view of a customer's history; no prioritization. |
| **Finance manager** (FINANCE_MANAGER) | See DSO/CEI trend, promise adherence, and payment reconciliation. | Metrics computed ad-hoc; no attribution of payments to invoices. |
| **Owner/Admin** | Harden processes, manage team + settings, export/delete data safely, control org policy. | No RBAC, no audit trail, no export/account-deletion path. |
| **Viewer** | Read-only visibility (analytics, queue). | Restricted access impossible. |
| **Sales** | See customer standing before engagement. | No shared overdue/promise context. |

## 3. Core loop

1. **Load receivables** — import customers + invoices (+ opening payment promises) from CSV, transactionally, with per-row validation and duplicate protection.
2. **Prioritize** — the queue ranks open balances by due-age, amount, risk score, promise state (broken promises jump up), and disputes (excluded from the queue) — with a human-readable "why is this here".
3. **Behave** — agents log outbound/any activity (call outcome, note), log payment promises (with date + amount + confidence), and record incoming payments.
4. **Reconcile** — a payment either FIFO-debits oldest due invoices or is explicitly allocated; invoice status transitions (open → partial → paid), active promises auto-mark KEPT once paid, and customer totals refresh.
5. **Correct** — disputes are logged with categories and can resolve an invoice out of the queue; a periodic sweep marks overdue-and-unpaid promises BROKEN.
6. **Measure** — DSO, CEI, promise adherence, overdue ratio, collections trend; drill into top-overdue customers.

## 4. Feature inventory (implemented)

| Area | Features |
| --- | --- |
| Auth & tenant | Register, login, logout, password reset (hashed 15-min tokens), session maxAge 7d, org-scoped data, rate limiting. |
| Roles | OWNER / ADMIN / FINANCE_MANAGER / COLLECTOR / SALES / VIEWER; ACTION_ROLES for collection mutations; MANAGE_ROLES for settings/import/team. |
| Customers | CRUD, contacts (primary-flag), server-side search, dedupe warnings + manual merge (transactional). |
| Invoices | Server-side search + pagination; derived status (OVERDUE/DUE_SOON computed, never stored); detail page with line items / allocations / timeline. |
| Import | Transactional CSV batch (customers, invoices, items, promises); per-row validation; in-file + DB duplicate detection; honest counts; capped 5000 rows/request. |
| Queue | Powered by `computeQueueItem` (pure): next action + why-it's-here; disputes excluded. |
| Payments | FIFO or explicit allocation; partial/multi/overpay/unmatched; manual allocation of unallocated remainder; reversal; duplicate guard; promise auto-KEPT; idempotency key. |
| Promises | Create (attaches to invoice + status PROMISED); renegotiate / edit / mark kept; auto-sweep ACTIVE→BROKEN (idempotent cron endpoint). |
| Disputes | Create with category; resolve; excluded from queue while open. |
| Collection events | Typed activity log (call/email note, outcome) per customer/invoice; surfaced in detail timeline. |
| Analytics | DSO, CEI, promise adherence, overdue ratio, 6-month collections series, top overdue. |
| Notifications | In-app feed (broken promises, disputes, promises due) + preference toggles. |
| Settings & team | Org profile + schedule (business hours, holidays, working days, automation pause); team invites + role changes + last-owner protection. |
| Trust | Full CSV/JSON export; account deletion with purge; audit trail (import/settings/payments/promises/team/account actions). |

## 5. Not implemented (external / blocked)

Email provider + Message lifecycle, WhatsApp/SMS, billing/entitlements, managed-prod infra (RLS, backups), Sentry, scheduler; integration+E2E tests. See TODO 041/042/044/049/051/052/057/058.

## 6. Acceptance criteria (per feature area)

- **Import**: importing a valid CSV yields customers+invoices visible on Customers/Invoices/Queue after reload; invalid rows report a per-row reason; re-importing the same file skips existing invoices; counts are exact (imported/skipped/customers created).
- **Queue**: items have a computed priority and a "why"; disputed-only balances never appear; a broken-promise customer ranks above a merely-overdue one.
- **Payments**: recording a payment reduces the oldest-due invoice outstanding (FIFO) or the explicitly chosen invoices; overpayment leaves the remainder unallocated (visible under "Unallocated"); a matching payment cannot be double-recorded; reversal restores outstanding; a fully paid invoice shows PAID; the paying customer's active promise auto-marks KEPT.
- **Promises**: creating a promise sets the invoice to PROMISED (when applicable); the sweep flips overdue-without-payment ACTIVE promises to BROKEN; renegotiated promises keep the same record with a new date/amount.
- **Disputes**: an open dispute removes that invoice's balance from the queue; resolving returns it to normal flow.
- **RBAC**: a VIEWER cannot record payments/promises/disputes/imports; FINANCE_MANAGER/COLLECTOR can; OWNER/ADMIN manage team/settings; OWNER-only deletes the account.
- **Tenant isolation**: no query in org A can read or mutate org B's data (all scoped by `organizationId`).
- **Metrics**: DSO/CEI/adherence are computed from payments/invoices in the org, matching manual expectations on the test dataset.
- **Trust**: export returns every table in CSV/JSON; deletion purges all org rows and signs the user out.