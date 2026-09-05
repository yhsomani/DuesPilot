# DuesPilot — Deployment

> Status: **deployment-ready skeleton; not yet deployed.** Everything below is the intended procedure. Managed-prod infrastructure (managed PG, backups/PITR, DB RLS, staging+prod) is tracked under `docs/MASTER_TODO.md` TODO-058 and is **not** provisioned yet.

## 1. Environment

Create `.env` from `.env.example`:

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `AUTH_SECRET` | NextAuth JWT signing secret (`openssl rand -base64 32`) | — |
| `AUTH_URL` | Public base URL of the deployment | `https://duespilot.example.com` |
| `CRON_SECRET` | Bearer token for the promise-sweep job (`openssl rand -base64 32`) | — |

Heroku/Railway/Supabase (or any PostgreSQL 14+) work for the DB. Generate long random values for both secrets; never reuse dev values.

## 2. Target platform

Any Node 20+ host that runs Next.js. Examples:

- **Vercel** — build command `npm run build`, default output; connect managed Postgres.
- **Node VM / container** — build once, run `npm start` behind a TLS-terminating proxy; set `AUTH_URL` to the HTTPS origin. The strict CSP (`frame-ancestors 'none'`) and secure cookies require HTTPS in production.

## 3. Build & run

```bash
npm ci
npx prisma generate
npx prisma migrate deploy      # applies committed migrations to the target DB
npm run build
npm start                      # production server
```

## 4. Database migrations

- SQL migrations live in `prisma/migrations/`. Apply them before first deploy and on every release with `npx prisma migrate deploy` (never `db push` in prod).
- **Migration history:** `20260904112615_init` creates the 19 baseline tables; `20260904130000_schema_sync` adds the `NotificationPreference` table, the `Organization` schedule columns (`businessHoursStart/End`, `workingDays`, `holidays`, `automationsPaused`), and the `IdempotencyKey` table (unique `[organizationId, key]`, index on `organizationId`). Both are committed and applied in order by `migrate deploy`.
- **Applying to a real DB:** the migrations have not yet been executed against a live Postgres (local DB unavailable in dev). Run `npx prisma migrate deploy` on the target DB to apply both; until then the app runs with the new queries gracefully degraded (notification preferences fall back to defaults; idempotency keys replay-guard inactive).
- No seed script exists.

## 5. Scheduled jobs

Promote promises that were ACTIVE but overdue with no payment → BROKEN. The idempotent endpoint `/api/jobs/promise-sweep` must be hit periodically with the bearer token:

```bash
curl -X POST https://your-host/api/jobs/promise-sweep \
     -H "Authorization: Bearer $CRON_SECRET"
```

Wire this into your platform's scheduler (Vercel Cron, GitHub Actions schedule, cron on a VM — **not yet provisioned**; TODO-058). Recommendation: every 15 minutes. The endpoint is safe to run concurrently (idempotent).

## 6. Security checklist for prod

- [ ] `AUTH_SECRET`/`CRON_SECRET` are strong, random, unique to prod.
- [ ] `AUTH_URL` is the HTTPS origin; HTTPS terminates before the server (cookies become `__Secure-`).
- [ ] `DATABASE_URL` uses `sslmode=require`; DB credentials in a secret manager, not the repo.
- [ ] Managed Postgres with automated backups + point-in-time recovery (TODO-058).
- [ ] Consider DB-level RLS as a second layer under app-level `organizationId` scoping (TODO-058).
- [ ] Set up error monitoring (Sentry) — currently not wired (TODO-057).
- [ ] Legal/privacy pages before public launch (TODO-058/062).
- [ ] External provider integrations (email, WhatsApp/SMS, billing) — not implemented (TODOs 042/044/049); do not advertise them as available.

## 7. Continuous delivery

`.github/workflows/ci.yml` gates `main` (quality → integration → build). Deploy on green (platform deploy hook). After deploy: hit `GET /api/health` and confirm `200 { status: "ok" }`.

## 8. Rollback

- Code: redeploy the previous build; migrations are forward-only additive (see pending-items note above) unless a migration specifically needs a rollback plan.
- Data: rely on managed-DB backups/PITR (TODO-058).

## 9. Known-not-ready for production

- Integration/E2E test evidence (TODOs 051/052; the integration suite is authored and CI-ready, and the schema-sync migration is committed — a real Postgres is the only blocker).
- Scheduler/cron for the sweep (TODO-058).
- Managed DB/backups/RLS (TODO-058).
- Email/WhatsApp/SMS/billing providers (042/044/049).
- `npm audit` — 4 high, all transitive via Prisma; fix is breaking (prisma 6). Accepted risk while tracking upstream.
- Rate limiter is in-memory (per-instance): multi-instance deployments get independent windows — use a shared store (Redis) if >1 instance is provisioned.