# DuesPilot — API Reference

Base URL: your deployment origin (e.g. `http://localhost:3000`). JSON bodies; responses use the envelope `{ "data": … }` for success and `{ "error": "…" }` for failure. `401` unauthorized, `403` forbidden by role, `404` not found, `409` conflict, `429` rate-limited, `500` internal.

All authenticated endpoints require the session cookie (`authjs.session-token` in dev, `__Secure-authjs.session-token` over HTTPS). Every response from an authenticated handler includes `x-request-id`.

## Public

| Endpoint | Notes |
| --- | --- |
| `POST /api/register` | Sign up. Body `{ name, email, password, company }`. 201 `{ userId }`. Rate-limited per IP (5/10 min). |
| `POST /api/auth/[...nextauth]` | NextAuth endpoints (sign in / redirect / callback). |
| `GET /api/auth/session` | Current session (NextAuth). |
| `POST /api/auth/forgot` | Request reset. Body `{ email }`. Identity-blind response (does not reveal whether the account exists). |
| `POST /api/auth/reset` | Reset password with token. Body `{ token, password }`. Tokens expire after 15 min. |
| `GET /api/health` | Liveness. Runs `SELECT 1`; `200 { status: "ok" }` or `503 { status: "error", db: "unreachable" }`. |
| `POST /api/jobs/promise-sweep` | **Cron** sweep ACTIVE→BROKEN for overdue promises (idempotent). Requires `Authorization: Bearer <CRON_SECRET>` (compared with `crypto.timingSafeEqual`). |

## Authenticated (tenant-scoped)

Roles: `ALL` = any signed-in member; `ACTION` = OWNER/ADMIN/FINANCE_MANAGER/COLLECTOR; `MANAGE` = OWNER/ADMIN; `OWNER` = OWNER only.

### Dashboard & analytics
- `GET /api/dashboard` — `ALL`. Aggregated stats, aging buckets, recent activity.
- `GET /api/analytics` — `ALL`. DSO, CEI, promise adherence, overdue ratio, 6-month collections series.

### Queue
- `GET /api/queue` — `ALL`. Prioritized work queue; each item includes priority/next-action and a `why` explanation.

### Customers
- `GET /api/customers?search=` — `ALL`. Server-side search.
- `POST /api/customers` — `MANAGE`. Create a customer record directly. Body `{ name, email?, phone?, gstin?, status?, notes? }`. 201 `{ id, name, … totalOutstanding: 0 }`. Audited `CUSTOMER_CREATE`.
- `GET /api/customers/:id` — `ALL`. Customer with contacts, invoices, payments, promises, disputes, timeline.
- `PATCH /api/customers/:id` — `MANAGE`. Edit name/email/phone/gstin/status/notes. Audited.
- `GET /api/customers/duplicates` — `ALL`. Likely-duplicate groups (name similarity), best-effort.
- `POST /api/customers/:id` — `MANAGE`. **Merge** duplicates into the target customer. Body `{ sourceIds: string[] }` (moves children, deletes sources, audits `CUSTOMER_MERGE`). *(There is no `/duplicates/merge` route — merge lives on the customer path.)*

### Contacts
- `POST /api/customers/:id/contacts` — `ACTION`. Create contact.
- `PATCH /api/customers/:id/contacts/:contactId` — `ACTION`. Update contact (incl. `isPrimary`).
- `DELETE /api/customers/:id/contacts/:contactId` — `ACTION`. Remove contact.

### Invoices
- `GET /api/invoices?search=&status=&page=&pageSize=` — `ALL`. Search + **offset pagination** (`page`/`pageSize`); returns `{ items, total, page, pageSize, hasMore }`. `status` filters on the derived view (open/overdue/due_soon/disputed/paid/promised/partial). Without query params returns the full list.
- `GET /api/invoices/:id` — `ALL`. Invoice with line items, allocations, and timeline.
- `POST /api/invoices` — `MANAGE`. Create an invoice manually. Body `{ customerId, invoiceNumber, amount, invoiceDate, dueDate, currency?, notes? }` (`invoiceDate`/`dueDate` are `YYYY-MM-DD`). Creates an OPEN invoice with the full amount outstanding as `source: "manual"`; refreshes customer totals; 409 if the invoice number already exists in the org. Audited `INVOICE_CREATE`.

### Payments
- `POST /api/payments` — `ACTION`. Body `{ customerId, amount, paymentDate, mode?, reference?, allocations?: { invoiceId, amount }[] }`. FIFO allocation by default; duplicate-reference guard; rejects invalid over-allocation; audits.
- `POST /api/payments/:id/allocate` — `ACTION`. Manual allocation of an unallocated/partially-allocated payment. Body `{ allocations: [{ invoiceId, amount }] }`. Rejects reversed/fully-allocated payments and empty allocations; clamps per-invoice to outstanding and to the available remainder; audits `PAYMENT_ALLOCATE`.
- `POST /api/payments/:id/reverse` — `ACTION`. Reversal (reverts allocations + status transitions).
- `GET /api/payments` — `ALL`. Without query params returns the full payment list (used by the All/Unallocated tabs). With `?page=&pageSize=&search=&status=` returns paginated `{ items, total, page, pageSize, hasMore }`; search matches reference or customer name; `status` filters `received`/`partially_allocated`/`fully_allocated`/`reversed`.

### Idempotency
Mutating creates `POST /api/import`, `POST /api/payments`, and `POST /api/promises` accept an `Idempotency-Key` header. The key is recorded atomically inside the same DB transaction as the mutation: a replay of a previously committed request returns `409`, while a failed attempt rolls the key back so a retry is allowed. The UI sends a ref-stable per-form key (regenerated per new import file).

### Promises
- `POST /api/promises` — `ACTION`. Body `{ customerId, invoiceId?, amount, promiseDate, confidence?, note? }`. Sets invoice status → PROMISED.
- `GET /api/promises` — `ALL`. List with filter tabs.
- `PATCH /api/promises/:id` — `ACTION`. Manage: renegotiate / edit / mark kept.
- `POST /api/promises/:id/manage` — `ACTION`. Action endpoint (status transition).

### Disputes
- `POST /api/disputes` — `ACTION`. Body `{ invoiceId, reason, category }`.
- `PATCH /api/disputes/:id` — `ACTION`. Resolve: `{ status: "RESOLVED" }` (+ resolution note).

### Collection events
- `POST /api/collection-events` — `ACTION`. Body `{ customerId, invoiceId?, type, description, metadata? }`. `type` is one of `CALL, EMAIL, WHATSAPP, SMS, MEETING, NOTE, REMINDER`; `description` is required (1–2000 chars). *(There is no `outcome` field — outcomes are recorded as the event description/type.)*

### Notifications
- `GET /api/notifications` — `ALL`. Derived feed: broken promises, disputes, promises due (+ reconciliation with preference model; graceful fallback while migration is pending).
- `GET /api/notifications/preferences` — `ALL`. User preference list.
- `PATCH /api/notifications/preferences` — `ALL`. Update toggles.

### Settings, team, account
- `GET /api/settings` — `ALL`. Org profile + schedule fields.
- `PATCH /api/settings` — `MANAGE`. Update profile/schedule. Audited.
- `GET /api/team` — `ALL`. Members + `usersCount`.
- `POST /api/team` — `MANAGE`. Invite member (email + role; temp password for no-email invites).
- `PATCH /api/team/:userId` — `MANAGE`. Change role. Last-owner protected.
- `DELETE /api/team/:userId` — `MANAGE`. Remove member. Last-owner protected.
- `GET /api/export?format=csv|json` — `ALL` (session-gated). Full org data export (Content-Disposition attachment). Logs `export.ok/export.error` + duration.
- `DELETE /api/account` — `OWNER`. Delete account + purge all org data (cascade). Audited.

### Import
- `POST /api/import` — `MANAGE`. Transactional batch import. Body `{ rows: Record<string,string>[], mapping: { customerName, invoiceNumber, dueDate, amount, … } }` (row objects keyed by source header, plus a column mapping for required fields) with `Idempotency-Key` header. Accepts `Idempotency-Key`; dedupes in-file and against the DB; returns honest `{ customersCreated, invoicesCreated, skippedRows, issues[] }` counts. Errors/duplicates are per-row; the transaction is all-or-nothing. Cadence capped at 5000 rows/request.

## Errors

All error bodies: `{ "error": "<message>" }`. Common statuses: `401` (missing/invalid session), `403` (role not allowed), `404` (not found in org scope — no existence leak across tenants), `409` (duplicate / conflict), `422`-class validation surfaced via normal bad-request statuses, `429` (rate limit), `500` (unexpected — logs via structured logger with the `x-request-id`).

See `docs/ARCHITECTURE.md` for the `withAuth` request lifecycle and log format.