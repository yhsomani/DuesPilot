# DuesPilot — Testing Strategy

## 1. Principles

- **Pure logic first.** All decision-critical math is extracted into dependency-free modules so it is unit-tested without a DB:
  - `src/lib/payment-allocation.ts` — `allocatePayment` (FIFO/explicit, partial/multi/overpay/over-allocation), `nextInvoiceStatus` (status transitions).
  - `src/lib/queue-item.ts` — `computeQueueItem` (priority, next action, promise/overdue/risk inputs), `statusView`.
  - `src/lib/risk-score.ts`, `src/lib/invoice-status.ts`, `src/lib/dates.ts`, `src/lib/utils.ts`.
- **Integration tests via a real Postgres** cover DB-coupled behavior: tenant isolation, transactional import, RBAC enforcement, payment allocation persistence, promise sweep.
- **E2E** (TODOs 052, 051) covers the full user journey once a runnable stack + scaffold exist.

## 2. Current coverage (verified on 2026-09-05)

`npm test` → **209/209 passing** (Vitest 3.2.7) across 27 test files in `src/lib/__tests__/` + `src/lib/rbac.test.ts`:

| File | Tests | Covers |
| --- | --- | --- |
| `dates.test.ts` | 6 | Relative days, overdue calc, floor/ceil date math. |
| `risk-score.test.ts` | 10 | Debt-profile risk formula (incl. history term). |
| `invoice-status.test.ts` | 8 | Derived status metadata/labels. |
| `utils.test.ts` | 10 | `cn`, INR formatting, misc utils. |
| `payment-allocation.test.ts` | 10 | FIFO/explicit allocation edge cases + status derivation. |
| `queue-item.test.ts` | 7 | Priority/next-action computation + status views. |
| `rbac.test.ts` | 4 | Role matrix (ACTION_ROLES/MANAGE_ROLES/OWNER-only) via `@/lib/rbac`. |
| `promise-state.test.ts` | 6 | Promise lifecycle transitions, terminal KEPT status, renegotiation guards. |
| `rate-limit.test.ts` | 4 | Token-bucket rate limiting, quota exhaustion, retry-after calculations, client key resolution. |
| `security.test.ts` | 9 | CSV formula injection defense (CWE-1236), input sanitization, timing-safe hashes. |
| `crypto.test.ts` | 9 | AES-256-GCM envelope encryption, IV generation, authentication tag verification, key rotation. |
| `billing.test.ts` | 5 | Tier limits, channel gating, monotonic quota progression, AI copilot monthly quotas. |
| `copilot.test.ts` | 15 | Promise-to-pay extraction, tone-calibrated dunning generation, amount parsing. |
| `sms.test.ts` | 11 | TRAI DLT validation, 19-digit entity/template ID verification, 6-char alpha headers, GSM-7/UCS-2 segmentation. |
| `whatsapp.test.ts` | 6 | Phone number normalization (+91 E.164), gateway routing (Meta/Interakt/Gupshup/Twilio), mock mode. |
| `payment-links.test.ts` | 3 | Dynamic UPI deep links, gateway fallback links, QR payload formatting. |
| `payment-plans.test.ts` | 14 | Staggered milestone calculation, integer INR rounding, progressive allocation, default detection. |
| `msme-interest.test.ts` | 4 | MSMED Act 2006 Sections 15 & 16 compound monthly rest interest (3x RBI rate), 45-day threshold. |
| `legal-notices.test.ts` | 3 | Formal MSME statutory demands, Section 138 NI Act cheque dishonour notices. |
| `bank-reconciliation.test.ts` | 16 | 4-tier bank statement reconciliation, UTR/IMPS/NEFT/RTGS/Cheque regex extraction, CSV parsers. |
| `payment-webhooks.test.ts` | 16 | HMAC-SHA256 signature verification (Razorpay/Cashfree/Stripe), idempotency, atomic settlement. |
| `tenant-isolation.test.ts` | 5 | Cross-tenant scoping enforcement, session boundary isolation, CSV export safety. |
| `workflows.test.ts` | 9 | Dynamic dunning workflow execution, condition evaluator, step transitions. |
| `templates.test.ts` | 9 | Template variable replacement, syntax validation, channel formatting. |
| `observability.test.ts` | 3 | Structured audit logging, error telemetry, simulation warning triggers. |
| `email.test.ts` | 2 | Resend email dispatch formatting, header compliance. |
| `webhooks.test.ts` | 5 | Outbound webhook dispatch, retry backoff, payload hashing. |

Run modes: `npm test` (once) · `npm run test:watch` (dev loop).

## 3. Integration tests (specs written, execution blocked on a DB)

- Config: `vitest.integration.config.ts` — includes `src/**/*.integration.test.ts` (unit config now excludes `*.integration.test.ts`), longer timeouts, `fileParallelism: false` (the sweep is global).
- Script: `npm run test:integration` (exits 0 with `--passWithNoTests` until a DB is available to run against).
- CI (`integration` job) provisions a `postgres:17` service, runs `prisma migrate deploy || prisma db push`, then the suite — the intended verification home.
- **Blocked locally** because the dev Postgres is down and Docker is unavailable; locally the suite fails *only* with PrismaClientKnownRequestError (DB unreachable), confirming collection/globs are correct.

Authored specs (run in CI):
- `import-receivables.integration.test.ts` (3 tests) — valid/invalid/skipped rows, in-file + DB duplicate guards, exact counts, customers/outstanding/overdue refresh, idempotency-key replay → 409 with no orphan keys.
- `payments-receivables.integration.test.ts` (1 end-to-end test) — FIFO partial payment, manual allocation of the remainder, invoice status transitions, renegotiated promise auto-KEPT on cumulative payment, payment reversal restores outstanding, duplicate-payment guard 409, allocate-on-reversed 409, customer totals.
- `queue-tenancy.integration.test.ts` (3 tests) — queue prioritization + disputed-only balance exclusion, resolution restores; strict cross-org scoping (queues, idempotency keys, customer deletes); scoped collection events.
- RBAC is covered as a DB-free **unit** suite (see §2) — it needs no Postgres and runs on every `npm test`.

## 4. E2E (TODO-052 — not started)

Modern (Playwright) proposal:

| Flow | Steps |
| --- | --- |
| Auth happy path | register → login → dashboard loads with 0 state → logout. |
| Import → queue | import CSV → customers/invoices appear → queue shows items → log outcome. |
| Promise    | create on queue, confirm auto-keep on payment, sweep broken. |
| Payment   | record with FIFO allocation → invoice outstanding decreases → analytics move. |
| Settings  | team invite + role change; export downloads; delete account purges. |

## 5. Test data

- No DB seed script exists. Integration specs should create fixture rows inline (and clean up), scoped per test transaction.
- Unit tests use fixed/relative dates only (no time-dependent failures).

## 6. Gating

- Per-PR: `npm run lint` + `npx tsc --noEmit` + `npm test` + `npm run build`.
- CI does quality → integration → build; merging should require all three green (see `.github/workflows/ci.yml`).
- A coverage gate is **not** yet configured; recommended before launch (Vitest coverage) — track in TODO-051/058.

## 7. Known gaps

- Integration suite execution (blocked on DB; specs authored, CI-ready).
- Route-level RBAC HTTP tests (401/403/404 + no tenant leak) — the pure policy is unit-tested; exercise `withAuth` end-to-end once E2E/DB lands.
- API-contract tests (envelope shape per endpoint).
- Component/rendering tests for a11y (role=dialog, aria labels).