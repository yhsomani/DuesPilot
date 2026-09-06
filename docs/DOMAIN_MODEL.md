# DuesPilot — Domain Model

> Part of `docs/` (Phase 1, TODO-004). Describes the entities and their **state machines** exactly as implemented (`prisma/schema.prisma`, `src/lib/collections.ts`, `src/lib/payment-allocation.ts`, `src/lib/invoice-status.ts`, `src/lib/queue-item.ts`).

## 1. Core entities

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `Organization` | Tenant root | name, gstin, schedule columns (`businessHoursStart/End`, `workingDays`, `holidays`, `automationsPaused` — migration pending) |
| `User` | Member | email (unique), role, orgId, preferences 1:1 |
| `Customer` | Debtor | name, email/phone/gstin, notes, denormalized `totalOutstanding`/`totalOverdue`/`lastPaymentAt`/`riskScore` |
| `Invoice` | Receivable | invoiceNumber (unique per org), amount, `outstandingAmount`, status, dueDate, invoiceDate, source (`csv`/`manual`), currency |
| `InvoiceItem` | Line item | invoice → description, quantity, unitPrice, taxRate, amount |
| `Payment` | Incoming money | amount, paymentDate, mode, reference, status (`unmatched`/`partially_allocated`/`fully_allocated`/`reversed`) |
| `PaymentAllocation` | Payment→Invoice split | payment, invoice, amount |
| `PromiseToPay` | Payment promise | customer, optional invoice, amount, promiseDate, confidence, source, status |
| `Dispute` | Billing dispute | invoice, reason, category, status |
| `CollectionEvent` | Timeline activity | customer, optional invoice, type, description, outcome/metadata, creator |
| `NotificationPreference` | In-app toggles | user 1:1 — migration pending |
| `IdempotencyKey` | Duplicate-write guard | org + key unique, action — migration pending |
| `AuditLog` | Audit trail | org, action, entity, metadata, ip |
| `Account/Session/VerificationToken` | NextAuth schema | unused at runtime (JWT session) |
| `Message` | Multi-channel outreach | orgId, customerId, invoiceId, channel (`EMAIL/WHATSAPP/CALL/SMS/MANUAL`), recipient, status (`PENDING/SENT/DELIVERED/READ/FAILED`), externalId, sentAt |
| `CollectionWorkflow` / `WorkflowAction` | Automated dunning cadence | orgId, name, rules, enabled, actions (`trigger`, `action`, `orderIndex`) |
| `IntegrationCredential` | Gateway secrets | orgId, provider, credentials (AES-256-GCM envelope encrypted), enabled |

## 2. State machines

### 2.1 Invoice — `InvoiceStatus`
`DRAFT → OPEN → (DUE_SOON | OVERDUE) ⇄ PARTIALLY_PAID → PAID`
with orthogonal `DISPUTED`, `PROMISED`, `PROMISE_BROKEN`, `CANCELLED`.

- `DUE_SOON` and `OVERDUE` are **derived from dates, never stored** (`deriveInvoiceStatus`).
- Stored transitions (all in `nextInvoiceStatus` / `collections.ts`):
  - **Payment allocation** (`nextInvoiceStatus(stored, newOutstanding, amount)`): `DISPUTED/CANCELLED/DRAFT` unchanged; `newOutstanding <= 0` → `PAID`; `0 < newOutstanding < amount` → `PARTIALLY_PAID`; else → `OPEN`. Applied on record + on manual allocation + on reversal.
  - **Promise creation** (`createPromise`): if `invoiceId` points to an invoice in `OPEN/DUE_SOON/OVERDUE/PARTIALLY_PAID/PROMISE_BROKEN` → `PROMISED`. Renegotiation edits the promise record only (invoice stays `PROMISED`; it leaves that state via payment or sweep).
  - **Promise broken** (`sweepOverduePromises`): `PROMISED` + overdue + no payment since → `PROMISE_BROKEN`.
  - **Dispute**: open dispute → `DISPUTED`; resolved → reverts to derived status.
- Stored statuses never recomputed from dates on read (view layer shows derived). **There is no DUE_SOON/OVERDUE value persisted.**

### 2.2 Promise — `PromiseStatus`
`ACTIVE ⇄ (KEPT | BROKEN | RENEGOTIATED)`

- `ACTIVE` on create.
- **KEPT** (auto): a matching payment recorded on or after the promise's `createdAt` brings total paid ≥ promise amount → `keepPromiseOnPayment` marks KEPT.
- **BROKEN** (auto or manual): sweep flips ACTIVE promises whose promiseDate passed with no qualifying payment since createdAt; can also be set manually.
- **RENEGOTIATED**: manual edit changes date/amount (record preserved); only from ACTIVE/BROKEN.

### 2.3 Payment Plans & Structured Commitments
`ACTIVE → COMPLETED (or DELINQUENT / DEFAULTED)`

- **Installment Milestones**: Weekly, bi-weekly, or monthly intervals with remainder-preserving integer INR rounding.
- **Allocation**: Progressive FIFO settling of earliest milestone dates as payments land.
- **Status Evaluation**: Evaluated against current milestone due dates vs. cumulative paid amount.

### 2.4 Payment — status (+ process)
`creating → { unmatched | partially_allocated | fully_allocated } → reversed`

- On `recordPayment`: FIFO pays oldest due-date invoices until exhausted; over-remaining stays **unmatched**; partially covered → **partially_allocated**; fully covered → **fully_allocated**.
- Manual allocation (`POST /api/payments/[id]/allocate`) moves unmatched/partial remainder; reassessed status (reversed rejected).
- **Reversal** (`reversePayment`): allocations deleted, invoice outstanding restored, status recomputed, payment → `reversed`. Reversal of an already-reversed payment rejected.
- Duplicate guard: same org+customer+amount+date+reference → 409. Optional `Idempotency-Key` adds an atomic duplicate-write guard (409 on replay).

### 2.5 Dispute
`OPEN → RESOLVED`

- Created against an invoice (reason + category). While `OPEN`, the invoice's outstanding balance is **excluded from the collection queue**. Resolution notes recorded; invoice status returns to the normal derived flow.

### 2.6 Message — `MessageStatus`
`PENDING → SENT → DELIVERED → READ (or FAILED)`

- `PENDING` on creation/queue.
- `SENT` when accepted by the downstream provider adapter (Resend, Meta Cloud API, Gupshup, Interakt, Twilio, Fast2SMS, MSG91, or Mock).
- `DELIVERED` & `READ` updated asynchronously via webhook ingestion (`POST /api/webhooks/delivery`).
- `FAILED` recorded on terminal gateway rejection or invalid recipient / template parameters.

## 3. Derived computation

- **Risk score**: `computeRiskScore` (debt profile: overdue weight, aging, history term) — recomputed when customer totals refresh. Range −∞… max; values drive queue ordering.
- **Queue item** (`computeQueueItem`): inputs `promiseBroken`, `mostOverdueDueDate`, `totalOverdue`, `riskScore`, `lastEventType` →
  - misses → `overdue.due_now` …  `dispute.escalate` (see `src/lib/queue-item.ts` for the full ladder + `statusView` labels).

## 4. Tenant scoping

Every model owned by `Organization` (FK `organizationId`); all repo queries filter on it. `AuditLog`/`IdempotencyKey` also org-scoped. No cross-org reference paths exist in the application layer (RLS is planned at the DB layer — TODO-058).

## 5. Integrity rules

- Monetized 1:N relationships use decimals (rounded to paise by formatINR).
- `outstandingAmount` is source-of-truth; derived only from payments (no edit path), kept in sync transactionally.
- Inverse relationships guarded by code (reversal restores outstanding; allocation never overpays an invoice).
- Cascade deletes: org-wide purge on account deletion; merge relinks children to the surviving customer.