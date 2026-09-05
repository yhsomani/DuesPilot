# DuesPilot

Multi-tenant B2B receivables collections platform. Track customers, invoices, and outstanding balances; run a prioritized collection queue; record payments with FIFO allocation; manage payment promises (with automatic broken-promise sweeping); log disputes and collection activity; and monitor DSO, CEI, and promise adherence — all scoped per organization with role-based access.

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Prisma 7 + PostgreSQL**, **NextAuth v5**, **Tailwind CSS v4**, **zod v4**, and **Vitest**.

## Features

- **Import** — transactional CSV import of customers, invoices, line items, and opening promises with per-row validation, duplicate detection, and honest success/skip counts.
- **Queue** — prioritized collection queue with per-row "why it's here" explanations (overdue, promise broken, dispute, risk).
- **Customers** — tenant-scoped CRUD, contacts, server-side search, duplicate detection + manual merge.
- **Invoices** — server-side search + pagination, derived status (OVERDUE/DUE_SOON computed, never stored), invoice detail with line items / allocations / timeline.
- **Payments** — record payments with FIFO or explicit allocation, partial/multi/overpay/unmatched handling, reversal, duplicate guard, auto-kept promises.
- **Promises** — create/renegotiate/mark-kept; idempotent ACTIVE→BROKEN sweep endpoint for cron.
- **Disputes & collection events** — log activity, resolve disputes; disputed balances excluded from the queue.
- **Analytics** — DSO, CEI, promise adherence, overdue ratio, collections series (computed from the DB).
- **Notifications** — in-app feed (broken promises, disputes, promises due) + preferences.
- **Trust & compliance** — CSV/JSON full data export, account deletion with data purge, password reset, audit logging.
- **Admin** — team invites with roles, org settings (business hours, holidays, automation pause).

## Stack & layout

- `src/app/api/**` — route handlers (all tenant-scoped through `withAuth`).
- `src/app/(dashboard)/dashboard/**` — authenticated pages.
- `src/lib` — business logic: `repo`, `collections`, `metrics`, `team`, `queue-item`, `payment-allocation`, `risk-score`, `invoice-status`, `dates`, `rate-limit`, `transactions`, `audit`, `errors`.
- `src/lib/__tests__` — 65 unit tests across 9 test files (Vitest).
- `prisma/schema.prisma` — 21 models + 6 enums.
- `docs/` — `MASTER_TODO.md` (implementation tracker), `AUDIT.md`, `product/*`, `ARCHITECTURE.md`, `API.md`, `TEST_STRATEGY.md`, `DEPLOYMENT.md`, `CHANGELOG.md`.

## Getting started

Requirements: Node 20+, PostgreSQL 14+.

1. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npx prisma generate
   ```

2. Configure the environment — copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   # DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), AUTH_URL, CRON_SECRET
   ```

3. Create and migrate the database:

   ```bash
   npx prisma migrate dev   # applies migrations and regenerates the client
   ```

4. Run:

   ```bash
   npm run dev              # http://localhost:3000
   ```

Register a new organization from `/register`, then use **Import** to load receivables or add records directly.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build (type-checks + compiles + routes). |
| `npm start` | Start the production build. |
| `npm run lint` | ESLint (next/core-web-vitals + typescript). |
| `npm test` | Run the 65 unit tests (Vitest, once). |
| `npm run test:watch` | Vitest watch mode. |
| `npm run test:integration` | Integration suite (harness ready; specs in `src/**/*.integration.test.ts`). |

## CI

`.github/workflows/ci.yml` runs on push/PR: `quality` (lint + tsc + unit tests), `integration` (Postgres 17 service, `prisma migrate deploy`/`db push`, `npm run test:integration`), `build` (production build).

## Security notes

- All authenticated APIs are organization-scoped via `withAuth`; mutations require `ACTION_ROLES` / `MANAGE_ROLES`; public endpoints are rate-limited.
- Global security headers + a strict CSP (`frame-ancestors 'none'`) are applied in `next.config.ts`; no CORS endpoints exist; session maxAge is 7 days.
- `CRON_SECRET` (bearer) protects `/api/jobs/promise-sweep`, compared with `crypto.timingSafeEqual`.
- Secrets live only in `.env` (git-ignored). Never commit real credentials.

## Known limitations

- External provider integrations (email, WhatsApp/SMS, billing), managed-prod infrastructure (DB/RLS/backups), the promise-sweep scheduler, and Sentry are **not** wired yet (see `docs/MASTER_TODO.md` TODOs 041–044, 049, 058).
- The `20260904130000_schema_sync` migration (NotificationPreference, org schedule columns, IdempotencyKey) is committed and ready to deploy to a live PostgreSQL instance (`npx prisma migrate deploy`).
- `npm audit` reports 4 high-severity findings, all transitive via Prisma (`@prisma/config` → `deepmerge-ts`, `mysql2`); the only automated fix is a breaking Prisma 6 downgrade — accepted risk for now.

See `docs/` for architecture, API reference, deployment, test strategy, and the implementation tracker.