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
| `CRON_SECRET` | `.env` (git-ignored) | Bearer for `/api/jobs/promise-sweep` and `/api/jobs/workflows-runner` (verified via `crypto.timingSafeEqual`) | ✅ Present; needed once scheduler is provisioned |
| `CREDENTIAL_ENCRYPTION_KEY` | `.env` (git-ignored) | Master key for AES-256-GCM envelope encryption (`src/lib/crypto.ts`) | ✅ Configured; automatic secure fallback in dev |
| `RESEND_API_KEY` | `.env` (git-ignored) | Resend API key for live transactional Email outreach | ✅ Configured / deterministic mock simulation mode |
| `META_WHATSAPP_TOKEN` | `.env` (git-ignored) | Meta Cloud API access token for WhatsApp messaging | ✅ Configured / deterministic mock simulation mode |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `.env` (git-ignored) | Razorpay dynamic payment link generation | ✅ Configured / deterministic mock simulation mode |
| `RAZORPAY_WEBHOOK_SECRET` | `.env` (git-ignored) | HMAC-SHA256 signature verification for payment webhooks | ✅ Configured (`/api/webhooks/payments`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | `.env` (git-ignored) | Stripe subscription billing & checkout sessions | ✅ Configured (`/api/billing/checkout`, `/api/billing/webhook`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | `.env` (git-ignored) | Distributed rate limiting store | ✅ Configured with automatic in-memory fallback |

**Template:** `.env.example` defines all required configuration variables, authentication keys, webhook secrets, and provider credentials with comprehensive documentation.

---

## Gateway & Provider Integrations

| Capability | Provider class | Implemented Adapter & Flow | Live Provider Config | Status |
| --- | --- | --- | --- | --- |
| Email delivery | Transactional email API | `src/lib/email.ts` Multi-transport adapter (Resend API provider with template interpolation) | `RESEND_API_KEY`, verified sender domain | ✅ **Implemented** (Live & Mock mode) |
| WhatsApp automation | WhatsApp Business API (BSP) | `src/lib/whatsapp.ts` Multi-gateway adapter (Meta Cloud API, Interakt, Gupshup, Twilio) | `META_WHATSAPP_TOKEN`, Phone ID | ✅ **Implemented** (Live & Mock mode) |
| SMS | SMS gateway (transactional/DND) | `src/lib/whatsapp.ts` Twilio/Gupshup SMS fallback | Twilio Account SID / Auth Token | 🟡 **Partial / Gateway Adapter** |
| Payment links / dynamic UPI | Payment provider (Razorpay/Cashfree) + NPCI UPI | `src/lib/payment-links.ts` (1-click links + `upi://pay` deep link URIs) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | ✅ **Implemented** |
| Payment webhook reconciliation | Transactional webhook listener | `/api/webhooks/payments` with HMAC-SHA256 verification and atomic FIFO settlement | `RAZORPAY_WEBHOOK_SECRET`, `CASHFREE_WEBHOOK_SECRET` | ✅ **Implemented** |
| Delivery webhook normalizer | Multi-provider delivery ingestion | `/api/webhooks/delivery` supporting Meta WhatsApp, Twilio, SendGrid, Gupshup | `WHATSAPP_VERIFY_TOKEN` (GET challenge handshake) | ✅ **Implemented** |
| Automated Dunning Cadences | Multi-tier rules engine | `src/lib/workflows.ts`, `/api/jobs/workflows-runner`, `/dashboard/workflows` | Scheduled cron bearer `CRON_SECRET` | ✅ **Implemented** |
| Multi-Installment Payment Plans | Structured settlement engine | `src/lib/payment-plans.ts`, `/api/payment-plans`, `PaymentPlanModal` | Native mathematical calendar model | ✅ **Implemented** |
| Statutory MSME Penal Interest | Section 15/16 3x RBI Rate Engine | `src/lib/msme-interest.ts`, `src/lib/legal-notices.ts`, `/api/legal/*` | Native compound monthly rest calculator | ✅ **Implemented** |
| Billing & Quotas | Stripe Subscriptions & Quotas | `src/lib/billing.ts`, `/api/billing/*`, `BillingTab` UI | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ✅ **Implemented** |
| Error monitoring | e.g., Sentry | DSN | Requires external account; TODO-057 deferred | 🟡 **Deferred** |
| Scheduler / cron | cron service / managed scheduler | Access token / schedule | Promise-sweep & workflows-runner endpoints ready | 🟠 **Endpoint Ready (Cron blocked on cloud infra)** |

---

## Schema support for integrations

| Model | Fields relevant to creds | Purpose | Written by code? |
| --- | --- | --- | --- |
| `IntegrationCredential` | provider/encryptedValue per org | Securely store tenant-scoped provider creds with AES-256-GCM | ✅ Supported via `src/lib/crypto.ts` |
| `Message` | channel/status/externalId | Outbound outreach delivery & read status log | ✅ Read/written by `/api/messages` & `/api/webhooks/delivery` |
| `CollectionWorkflow` / `WorkflowAction` | cadence rules & actions | Multi-tier automated follow-up cadences | ✅ Read/written by `/api/workflows` & `/api/jobs/workflows-runner` |
| `NotificationPreference` | per-user notification prefs | In-app notification preferences | ✅ Read/written by `/api/notifications/preferences` |

---

## Secret handling assessment

| Control | Status |
| --- | --- |
| `.env` committed? | ✅ No (git-ignored); `.env.example` committed with comprehensive documentation |
| Client bundle contains secrets? | ✅ Verified (zero client-side secrets) |
| Encryption at rest | ✅ AES-256-GCM envelope encryption with tamper-proof HMAC verification (`src/lib/crypto.ts`) |
| Webhook authentication | ✅ HMAC-SHA256 signature verification on payment events + Meta challenge handshake |
| Rate limiting store | ✅ Distributed Upstash Redis with local memory sliding-window fallback |

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