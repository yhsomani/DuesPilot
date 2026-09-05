# Credentials & Integrations Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Status** | CURRENT — env uses NextAuth v5 names; external providers remain blocked |

> **SECURITY NOTICE:** This document describes *where* credentials are used and their *presence/status*. It intentionally does **not** reproduce any secret values. Actual `.env` values are `[REDACTED]`.

---

## Present in the application

| Key / Setting | Source | Purpose | Status |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env` (git-ignored) | Postgres DSN for `src/lib/prisma.ts` (PrismaPg adapter) + `prisma7.config.ts` | ✅ Configured (local dev) — **UNVERIFIED** for production |
| `AUTH_SECRET` | `.env` (git-ignored) | NextAuth v5 JWT signing secret | 🟡 Present; **must be a strong rotated value for prod** (`UNVERIFIED` strength in dev `.env`) |
| `AUTH_URL` | `.env` (git-ignored) | Canonical app URL (NextAuth v5 name) | 🟡 Present; **UNVERIFIED** for prod domain |
| `CRON_SECRET` | `.env` (git-ignored) | Bearer for `/api/jobs/promise-sweep` (verified via `crypto.timingSafeEqual`) | ✅ Present; needed once scheduler is provisioned |

**Template:** `.env.example` defines `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `CRON_SECRET` — the NextAuth v5 conventions the app actually reads. (The legacy `NEXTAUTH_SECRET`/`NEXTAUTH_URL` names from the earlier prototype are superseded; the code reads the `AUTH_*` names.)

---

## Missing / not yet configured (all external providers — BLOCKED)

| Capability | Provider class (unopinionated) | Required credential/config | Status |
| --- | --- | --- | --- |
| Email delivery | Transactional email API | API key, verified sender domain | ❌ **Blocked** (TODO-042) |
| WhatsApp automation | WhatsApp Business API (BSP) | API key/access token, phone number ID, **template + opt-in approval** | ❌ **Blocked** (TODO-044; also needs META review + domain verification) |
| SMS | SMS gateway (transactional/DND) | Account SID/key, sender ID, DND compliance | ❌ **Blocked** (TODO-044) |
| Payment links / gateway | Payment provider (e.g., Razorpay/Stripe) | API keys (live/Test), webhook secret | ❌ **Blocked** (TODO-049) |
| AI promise extraction | LLM provider | API key | ❌ Not built (no AI scope) |
| Bank statement auto-match | Bank file/API / OCR | Depends on chosen provider | ❌ Not built (marketing claim) |
| Error monitoring | e.g., Sentry | DSN | ❌ **Blocked** (requires external account; TODO-057 deferred) |
| Scheduler / cron | cron service / managed scheduler | Access token / schedule | ❌ **Blocked** — promise-sweep endpoint ready, scheduling pending (TODO-058) |

---

## Schema support for integrations

| Model | Fields relevant to creds | Purpose | Written by code? |
| --- | --- | --- | --- |
| `IntegrationCredential` | provider/encryptedValue per org | Securely store tenant-scoped provider creds | ❌ **Never read/written** (schema-only; INT-001) |
| `Message` | channel/status | Delivery log | ❌ **Never read/written** (schema-only; Blocked on providers) |
| `CollectionWorkflow` / `WorkflowAction` | automation rules | Scheduled follow-ups | ❌ **Never read/written** (schema-only; no execution engine) |
| `NotificationPreference` | per-user notification prefs | In-app notification preferences | ✅ Read/written by `/api/notifications/preferences` (graceful fallback while **migration pending**) |

> ⚠️ **Note:** `IntegrationCredential` models *encrypted* tenant-scoped credential storage, which is the correct design, but **no encryption/decryption code, KMS, or local-secret management exists** — an encryption layer must back `encryptedValue` before any provider secret is stored (see `GAP_REGISTER.md` INT-001).

---

## Secret handling assessment

| Control | Status |
| --- | --- |
| `.env` committed? | ✅ No (git-ignored); `.env.example` committed with placeholders |
| Client bundle contains secrets? | ✅ No client-side secrets; providers not wired |
| Git history may contain credentials? | 🟡 **UNVERIFIED** — recommend `git log -p` scan / filter-repo if any credential was ever pasted |
| Production secret rotation | ❌ Not performed (no prod) |
| Rotation/key-versioning strategy | ❌ None documented |
| Engine secret (CRON_SECRET) handling | 🟡 Present as env; timing-safe compare implemented; rotation not yet exercised |

---

## Actions required before production

1. Generate a **cryptographically strong** `AUTH_SECRET` (e.g., `openssl rand -base64 48`); current dev value is `UNVERIFIED`/unsafe for prod.
2. Provision managed **isolated production database**; set `DATABASE_URL` accordingly (TODO-058).
3. Stand up provider sandbox accounts for the **first integration (email recommended)** (TODO-042).
4. Implement `IntegrationCredential` encryption (tenant-scoped keys) before storing provider secrets.
5. Provision the scheduler and **rotate/operate `CRON_SECRET`** for the promise-sweep job (TODO-058).
6. Add webhook/verification handlers for provider callbacks (none exist).
7. Verify no credentials ever entered git history (`git log --all -p` scan); revoke + history rewrite if any.
8. Wire Sentry DSN once an account is created (TODO-057).

---

## Cross-reference
- Full automation/integration gaps: `GAP_REGISTER.md` (COMM-003..005, WF-001, INT-001, and new blocked items).
- Security controls detail: `PRODUCTION_READINESS_CHECKLIST.md` §2.