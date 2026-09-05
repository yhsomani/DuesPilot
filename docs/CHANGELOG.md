# DuesPilot — Changelog

All notable changes, tracked against the implementation TODO (see `docs/MASTER_TODO.md` for full item statuses and verification notes).

## [0.1.0] — 2026-09-04 (work-in-progress baseline, uncommitted beyond `83e6ebd`)

### Added — Phase 1: Target domain
- `docs/MASTER_TODO.md` tracker (63 TODOs, Phases 0–15, ND register).
- `docs/product/*` — PRD, BRD, requirement traceability, feature status, page/component inventory, gap register, production-readiness checklist, credentials & integrations matrix (reconciled to current state).

### Added — Phase 2: Code foundation
- `src/lib/errors.ts` — typed `DomainError` hierarchy + zod adapter.
- `src/lib/audit.ts` — audit logging wired into register/import/settings.
- `src/lib/rate-limit.ts` — token bucket (register IP 5/10min; authenticated mutations 300/min/user).
- `src/lib/invoice-status.ts`, `src/lib/risk-score.ts` — derived status + debt-profile risk scoring.
- `src/lib/transactions.ts` — `withTx()` transaction wrapper.
- `proxy.ts` — removed dot-path bypass; explicit static-extension allowlist; role-aware redirect target.
- RBAC enforcement across all endpoints (ACTION_ROLES / MANAGE_ROLES / OWNER-only).

### Added — Phase 3/4/5/6: P0 collections loop
- Promises: create, edit/renegotiate/mark-kept, ACTIVE→BROKEN auto-sweep endpoint (idempotent, CRON_SECRET bearer, `timingSafeEqual`), promises UI.
- Payments: FIFO/explicit allocation, partial/multi/overpay/unmatched, reversal, duplicate guard, promise auto-KEPT, invoice status transitions, payments UI.
- Collection events + queue "Log outcome" modal + customer-detail actions.
- Disputes: create/resolve with categories; disputed-only balances excluded from queue.

### Added — Phase 7–9: Customers, import, search
- Customer CRUD, contacts CRUD, dedupe warnings + manual merge (transactional, audited).
- Transactional CSV import with per-row validation, duplicate detection, honest counts.
- Server-side search + cursor pagination for customers/invoices; invoice detail page (items, allocations, timeline); first-run onboarding CTAs.

### Added — Phase 10–11: Trust, notifications
- CSV/JSON full-data export; account deletion (purge + cascade, OWNER-only, typed confirm); password reset (hashed 15-min tokens, identity-blind response); logout.
- In-app notification feed + bell + broken-promise dashboard banner + preference toggles (schema pending migration).

### Added — Phase 12–13: Analytics, settings/team
- Metrics service: DSO, CEI, promise adherence, overdue ratio, 6-month collections series; analytics page (KPI cards, chart, pipeline health, top overdue).
- Team invites + role assignment + `syncUsersCount` + last-owner protection.
- Org settings: profile + business hours / holidays / working days / automation pause (columns pending migration).

### Added — Phase 14: Quality, security, observability
- Vitest 3.2.7; 51 unit tests for dates/risk-score/invoice-status/utils/payment-allocation/queue-item; pure modules extracted and wired (`payment-allocation.ts`, `queue-item.ts`).
- CI: `.github/workflows/ci.yml` (quality → integration[postgres:17] → build).
- Accessibility: dialog semantics, Escape-to-close, initial focus, aria labels, dual-color status.
- UX states: loading/error `role=alert`/empty/retry with `retryKey` pattern; destructive confirmations.
- Security: CSP + security headers (`next.config.ts`), session maxAge 7d, `timingSafeEqual` CRON check, `.env.example` → `AUTH_SECRET`/`AUTH_URL`/`CRON_SECRET`.
- Payments reconciliation: **unallocated filter + manual allocation** (`POST /api/payments/:id/allocate`, allocation modal, `PAYMENT_ALLOCATE` audit).
- Idempotency: `IdempotencyKey` model + `consumeIdempotencyKey` (atomic in-tx, 409 on replay, rollback-on-failure enables retry) wired into payment, promise, and import creation; clients send `Idempotency-Key`. *(table migration pending — DB down)*.
- Observability: `x-request-id` + structured JSONL logs in `withAuth` and `/api/export`.
- Dependency hygiene: removed `date-fns`, `@auth/prisma-adapter`, `pg`; moved `dotenv` (Prisma-config-only) to devDependencies; upgraded vitest (critical advisory GHSA-5xrq-8626-4rwp).

### Added — Phase 15: Documentation & marketing sync
- `docs/AUDIT.md` rewritten to current state.
- New root/docs docs: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/TEST_STRATEGY.md`, `docs/CHANGELOG.md`.
- `docs/product/*` reconciled against live code.
- Marketing-claims reconciliation (gate unbuilt features) — see TODO-062.
- Phase-1 specs (previously missing): `docs/PRODUCT_SPEC.md`, `docs/DOMAIN_MODEL.md`, `docs/AUTHORIZATION.md`, `docs/METRICS.md` (TODO-003..006).

### Added — Phase 16: Messaging Hub, Templates & Multi-Transport Delivery (TODO-079/080)
- Multi-transport transactional Email adapter (`src/lib/email.ts`) with Resend API integration and deterministic mock simulation mode.
- Multi-channel communications hub UI (`/dashboard/communications`) displaying outbound history, delivery statuses, channel health, and live template preview.
- Outreach dispatch endpoint (`POST /api/messages`) supporting variable template interpolation (`{{customerName}}`, `{{amountDue}}`, `{{invoiceNumber}}`, `{{daysOverdue}}`), quota checks, and timeline collection events.

### Added — Phase 17: Billing, Quotas & Productivity Enhancements (TODO-081..087)
- Subscription and tier quota engine (`src/lib/billing.ts`) with `FREE`, `STARTER`, `GROWTH`, and `PRO` tiers, feature gate guards, and Stripe Checkout integration (`/api/billing/*`).
- Global Command Palette (`Ctrl+K` modal + `/api/search`) indexing customers, invoices, promises, and disputes with instant search.
- Guided 4-step Onboarding Import Wizard (`/dashboard/import`) with automated column auto-mapping, sample CSV download (`/api/import/sample`), and per-row error diagnostics.
- Bulk Queue Actions (multi-select reminders, CSV export) and secure invoice CSV export (`/api/invoices/export`) with CWE-1236 spreadsheet injection mitigation.
- Organization Audit Trail Viewer (`/dashboard/settings` Audit tab + `/api/audit`) with action filtering and JSON metadata inspector.

### Added — Phase 18: Strategic Recovery Engines & Security Hardening (TODO-088..094)
- Multi-Installment Payment Plan Engine (`src/lib/payment-plans.ts`, `/api/payment-plans`, `PaymentPlanModal`) with calendar-aware schedule generation, whole-INR rounding preservation, progressive FIFO allocation, and delinquency evaluation.
- Multi-Gateway WhatsApp Business API Adapter (`src/lib/whatsapp.ts`) supporting Meta Cloud API, Interakt, Gupshup, and Twilio with simulation mode.
- 1-Click Dynamic Payment Link Generator (`src/lib/payment-links.ts`, `/api/payment-links`) with Razorpay, Cashfree, and NPCI-compliant `upi://pay` deep link URIs.
- Statutory Section 15 & 16 MSMED Act 2006 Compound Penal Interest Calculator (`src/lib/msme-interest.ts`, `/api/legal/msme-interest`) at 3x RBI Bank Rate (20.25% p.a.).
- Formal Statutory Demand Notice Generator (`src/lib/legal-notices.ts`, `/api/legal/notice`, `LegalNoticeModal`) for MSMED Act and Section 138 Negotiable Instruments Act claims.
- AES-256-GCM Envelope Encryption (`src/lib/crypto.ts`) for third-party integration credentials with unique IVs and HMAC verification.
- Distributed Upstash Redis Rate Limiting (`src/lib/rate-limit.ts`) with local sliding-window memory fallback.

### Added — Phase 19: Automated Dunning Cadence Engine & Webhook Reconciliation (TODO-095..100)
- Automated Dunning Cadence Execution Engine (`src/lib/workflows.ts`) with multi-tier milestone rule evaluation (`T-3`, `T+1`, `T+7`, `T+15`, `T+30`, `T+45`), dry-run simulations, dispute/promise guards, and batch execution.
- Scheduled Cadence Batch Runner (`/api/jobs/workflows-runner`) with `CRON_SECRET` bearer authorization and dynamic UPI payment link injection.
- Multi-Gateway Delivery Webhook Normalizer (`/api/webhooks/delivery`) standardizing status receipts from Meta WhatsApp, Twilio, SendGrid, and Gupshup with GET challenge handshake verification.
- Transactional Payment Webhook Listener (`/api/webhooks/payments`) with HMAC-SHA256 signature verification for Razorpay and Cashfree, executing atomic database settlements, FIFO balance updates, and auto-settling active promises.
- Automated Dunning Cadence Management UI (`/dashboard/workflows`) with cadence toggling, custom escalation rule creation, instant dry-run preview table, and live batch dispatch execution.
- Master Quality Gate: 145/145 unit tests passing across 22 test suites (`npm test`), 0 ESLint warnings, 0 TypeScript errors (`npx tsc --noEmit`), and 59 Next.js production routes compiled cleanly (`npm run build`).

### Added — Phase 20: Responsive Mobile Ergonomics & Navigation Polish (TODO-101)
- Responsive mobile top navigation header (`Sidebar.tsx`) with hamburger menu trigger, branded logo, quick global search button, and notification bell for tablet/mobile viewports (`<1024px`).
- Slide-over mobile navigation drawer with touch-friendly backdrop, quick search trigger (`Ctrl+K`), complete categorized navigation links, active route highlight, user profile card, and sign-out handler.
- Viewport layout container adaptation (`src/app/(dashboard)/layout.tsx`) switching to `flex-col lg:flex-row` for seamless scrollable dashboard views across mobile, tablet, and desktop devices.


### Blocked / deferred
- Managed production PostgreSQL database connectivity (`TODO-077`) and live provider production credentials (`TODO-078`).
- Pending migrations: `NotificationPreference`, org schedule columns, `IdempotencyKey`.