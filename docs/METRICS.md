# DuesPilot — Metrics

> Part of `docs/` (Phase 1, TODO-006). Definitions as implemented in `src/lib/metrics.ts` (dashboard/analytics), with the additions used by queue/risk (`src/lib/risk-score.ts`, `src/lib/queue-item.ts`).

## 1. Core metrics (computed from DB)

| Metric | Definition | Notes |
| --- | --- | --- |
| **Total receivables** | ∑ `Invoice.amount` (open/not cancelled) | Shown on dashboard + customers. |
| **Outstanding** | ∑ `Invoice.outstandingAmount` (open, non-disputed balances where relevant) | Per-customer denormalized `totalOutstanding`. |
| **Overdue** | ∑ outstanding of invoices whose `dueDate < today` | Per-customer denormalized `totalOverdue`. |
| **DSO (days sales outstanding)** | `(outstanding over the window) / (sales over the window) × days` | Window-based; sales derived from invoices dated in window. Lower is better. |
| **CEI (collection effectiveness index)** | collections during period ÷ (opening receivables + new sales during period) | Collections = payments in period. |
| **Promise adherence** | KEPT promises ÷ (KEPT + BROKEN) over the window (%) | Non-asserted statuses excluded from the denominator. |
| **Overdue ratio** | overdue receivables ÷ total receivables (%) | Pipeline-health indicator. |
| **Collections series** | monthly sum of effective payments, last 6 months | Bar chart on analytics. |
| **Top overdue** | customers sorted by `totalOverdue` desc, top N | Drill-down source. |

## 2. Risk & queue scoring

- **Risk score** (`computeRiskScore`): debt-profile formula combining overdue weight, relative aging, and a history term; recomputed during `refreshCustomerTotals`. Higher = more urgent.
- **Queue priority** (`computeQueueItem`): a pure status ladder driven by inputs:
  - `promiseBroken` → escalate (broken promise ranks highest),
  - deeply overdue → `overdue.due_now` … `overdue` tiers by aging,
  - `riskScore` high → adjust,
  - otherwise lower tiers (`due_soon`, `dispute` handling excludes disputed-only balances).
- Each queue row carries a human-readable `why` (`statusView`), e.g. "Payment promise broken — expected yesterday".

## 3. Definitions / edge cases

- Date basis: local server date; `daysOverdue = today − dueDate`, `daysUntilDue = dueDate − today` (`src/lib/dates.ts`), caller-normalized before absolute date math (tests use relative dates).
- Payments: `reversed` payments are excluded from CEI/collections and from promise-keep logic.
- Disputed invoices: their outstanding is excluded from the queue; included in DSO/overdue totals per aggregation context (documented in analytics page).
- Overpayment remainder (`unmatched`) is not allocated to any invoice and does not reduce receivables until manually allocated.

## 4. Where they appear

- `GET /api/dashboard` — totals, aging buckets, overdue trend.
- `GET /api/analytics` — DSO/CEI/adherence/overdue ratio + series + top overdue.
- Customers list/detail — `totalOutstanding` / `totalOverdue` / `riskScore` per customer.
- Queue — priority + `why` per row.

## 5. Verification & future

- Unit-tested pure modules: `dates` (6), `risk-score` (10), `queue-item` (7), `invoice-status` (8).
- DB-backed metric correctness is exercised by TODO-051 integration `metrics` case (pending a running Postgres).
- Definitions should be revisited for calendar-consistency (business-day denominators) when org schedule columns land (migration pending).