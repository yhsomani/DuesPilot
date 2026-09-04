# Credentials & Integrations Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |

> **SECURITY NOTICE:** This document describes *where* credentials are used and their *presence/status*. It intentionally does **not** reproduce any secret values. Actual `.env` values are `[REDACTED]`.

---

## Present in the application

| Key / Setting | Source | Purpose | Status |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env` (git-ignored) | Postgres DSN used by `src/lib/prisma.ts` (PrismaPg adapter) and `prisma7.config.ts` | ✅ Configured for local dev (`localhost:51214`) — **UNVERIFIED** for production |
| `NEXTAUTH_SECRET` | `.env` (git-ignored) | NextAuth JWT signing secret | 🟡 Present but is a **dev-default placeholder** — **must be rotated** for prod; `UNVERIFIED` strength in prod |
| `NEXTAUTH_URL` | `.env` (git-ignored) | Canonical app URL | 🟡 Present; `UNVERIFIED` for prod domain |
| `AUTH_SECRET` / `AUTH_TRUST_HOST` | n/a | NextAuth v5 alternate names | ⏳ Not used; recommend documenting chosen convention |

**Template:** `.env.example` defines `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` as placeholders — consistent with what the app reads.

---

## Missing / not yet configured (all external providers)

| Capability | Provider class (unopinionated) | Required credential/config | Status |
| --- | --- | --- | --- |
| Email delivery | Transactional email API | API key, verified sender domain | ❌ Not configured |
| WhatsApp automation | WhatsApp Business API (BSP) | API key/access token, phone number ID, **template + opt-in approval** | ❌ Not configured (also needs META review + domain verification) |
| SMS | SMS gateway (transactional/DND) | Account SID/key, sender ID, DND compliance | ❌ Not configured |
| Payment links / gateway | Payment provider (e.g., Razorpay/Stripe) | API keys (live/Test), webhook secret | ❌ Not configured |
| AI promise extraction | LLM provider | API key | ❌ Not configured |
| Bank statement auto-match | Bank file/API / OCR | Depends on chosen provider | ❌ Not configured |
| Object storage / uploads | Where CSV/uploads persist | Bucket + credentials | ❌ Not configured (all import is client-side) |
| Error monitoring | e.g., Sentry | DSN | ❌ Not configured |

---

## Schema support for integrations

| Model | Fields relevant to creds | Purpose | Written by code? |
| --- | --- | --- | --- |
| `IntegrationCredential` | encrypted provider credentials per org | Securely store provider creds keyed per tenant (schema uses `provider`, `encryptedValue`, etc.) | ❌ Never read/written |
| `Message` | resolve channel/status | Delivery log | ❌ Never read/written |
| `CollectionWorkflow` / `WorkflowAction` | automation rules | Scheduled follow-ups | ❌ Never read/written |

> ⚠️ **Note:** The schema models *encrypted* integration credential storage **per organization**, which is the correct high-level design (tenant-scoped secrets, not global). However, **no encryption/decryption code, KMS, or local-secret management exists** — the `encryptedValue` column and such must be backed by a real encryption layer before use. See `GAP_REGISTER.md` INT-001.

---

## Secret handling assessment

| Control | Status |
| --- | --- |
| `.env` committed? | ✅ No (git-ignored); `.env.example` committed with placeholders |
| Client bundle contains secrets? | ✅ No client-side secrets; providers not yet wired |
| Git history may contain credentials? | 🟡 **UNVERIFIED** — recommend `git log -p` scan / filter-repo if any credential was ever pasted; also see revoked-token note below |
| Production secret rotation | ❌ Not performed (no prod) |
| Rotation/key-versioning strategy | ❌ None documented |

---

## Actions required before production

1. Rotate and generate a **cryptographically strong** `NEXTAUTH_SECRET` (e.g., `openssl rand -base64 48`). Current is dev-default — **UNVERIFIED/unsafe for prod**.
2. Decide and record the canonical env-var convention (NextAuth v5 accepts both `NEXTAUTH_*` and `AUTH_*`; pick one) — ⏳ minor, but avoids drift.
3. Stand up provider sandbox accounts for the first integration (recommend **email first**).
4. Implement `IntegrationCredential` encryption (tenant-scoped keys) before storing any provider secret.
5. Add webhook/verification handlers for provider callbacks (none exist).
6. Verify no credentials ever entered git history (`git log --all -p | grep` for known-value patterns); if any, revoke + history rewrite.
7. Provision a **managed, isolated production database** and set `DATABASE_URL` accordingly.

---

## Cross-reference
- Full automation/integration feature gaps: `GAP_REGISTER.md` (COMM-003..005, WF-001, INT-001).
- Security controls detail: `PRODUCTION_READINESS_CHECKLIST.md` §2.
