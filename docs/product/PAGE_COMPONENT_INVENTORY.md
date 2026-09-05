# Page & Component Inventory — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Coverage** | Pages (from `next build`) and components in `src/`, current post-Phases 1–15 |

> Note: exact file paths under `src/app/(dashboard)/dashboard/...` are abbreviated; routes were confirmed from `next build`. Every data screen fetches real, tenant-scoped data via API routes (no mock arrays anywhere).

---

## App Router Pages

| Route path | File (abbrev.) | Type | Layout | Data source | Auth | Status notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Server (landing) | `root` | Static marketing copy | Public | CTAs → `/register`; pricing tiles (marketing-only) |
| `/login` | `(auth)/login/page.tsx` | Client | `(auth)` | — | Public | zod validation; Suspense for `useSearchParams` |
| `/register` | `(auth)/register/page.tsx` | Client | `(auth)` | — | Public | zod; POST `/api/register` (rate-limited) |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | Client | `(auth)` | — | Public | identity-blind forgot flow |
| `/reset-password` | `(auth)/reset-password/page.tsx` | Client | `(auth)` | — | Public | hashed 15-min token reset |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Client | `(dashboard)` | `GET /api/dashboard` (real aggregates) | Protected | first-run onboarding CTA when `totalReceivables=0`; escalation banner; aging trend; retry state |
| `/dashboard/queue` | `(dashboard)/queue/page.tsx` | Client | `(dashboard)` | `GET /api/queue` (`computeQueueItem` priority + "why here?") | Protected | filter tabs; AllActionsModal (call/log/promise); disputed excluded |
| `/dashboard/customers` | `(dashboard)/customers/page.tsx` | Client | `(dashboard)` | `GET /api/customers?search=` (server-side) | Protected | dedupe banner; onboarding card; onboarding 3-step guide |
| `/dashboard/customers/[id]` | `(dashboard)/customers/[id]/page.tsx` | Client | `(dashboard)` | `GET /api/customers/[id]` (real `[id]`; 404 if absent) | Protected | edit modal, contacts CRUD, actions (payment/promise/event), timeline |
| `/dashboard/invoices` | `(dashboard)/invoices/page.tsx` | Client | `(dashboard)` | `GET /api/invoices` (search, cursor pagination, derived status filter) | Protected | Prev/Next pagination; rows link to detail |
| `/dashboard/invoices/[id]` | `(dashboard)/invoices/[id]/page.tsx` | Client | `(dashboard)` | `GET /api/invoices/[id]` (items/allocations/timeline) | Protected | invoice detail |
| `/dashboard/payments` | `(dashboard)/payments/page.tsx` | Client | `(dashboard)` | `POST /api/payments` + list | Protected | record modal w/ optional allocation; allocation detail; reversal; dup guard |
| `/dashboard/promises` | `(dashboard)/promises/page.tsx` | Client | `(dashboard)` | promises list + create/manage | Protected | filter tabs; log-promise modal |
| `/dashboard/disputes` | `(dashboard)/disputes/page.tsx` | Client | `(dashboard)` | `POST /api/disputes` + `PATCH [id]` | Protected | create, list, resolve |
| `/dashboard/analytics` | `(dashboard)/analytics/page.tsx` | Client | `(dashboard)` | `GET /api/analytics` (`src/lib/metrics.ts`: DSO/CEI/adherence/overdue + 6-month series) | Protected | KPI cards, bar chart, pipeline health, top overdue |
| `/dashboard/import` | `(dashboard)/import/page.tsx` | Client | `(dashboard)` | PapaParse → `POST /api/import` ($transaction) | Protected | per-row skip reasons; honest success/"nothing imported" states |
| `/dashboard/settings` | `(dashboard)/settings/page.tsx` | Client | `(dashboard)` | settings GET/PATCH; `/api/export`; `/api/account`; `/api/team[/userId]`; notification prefs | Protected | schedule/holidays/pause UI; Team card; Data export; danger zone |
| `/dashboard/communications` | `(dashboard)/communications/page.tsx` | Client | `(dashboard)` | Route exists | Protected | **Route only — email send feature NOT built (Blocked, TODO-042)** |

> **TRUTH:** `/dashboard/communications` is a routing page, but the email/message-send feature it would house is NOT implemented (blocked on provider). No claim of sending is made.

---

## Layouts

| File | Route group | Contains |
| --- | --- | --- |
| `src/app/layout.tsx` | root | `<html lang="en">`, Geist fonts, `<body>`, metadata "DuesPilot — Collections Operating System for Indian B2B SMEs" |
| `src/app/(auth)/layout.tsx` | auth | Shared auth chrome |
| `src/app/(dashboard)/layout.tsx` | dashboard | Server component: `<Sidebar/>` (incl. NotificationBell) + main. Auth is enforced by `src/proxy.ts`, not the layout. |

---

## Components

| Component | File | Type | Props/Notes | Used by |
| --- | --- | --- | --- | --- |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Client | lucide icons; nav groups (Overview, Collections, Master data, Settings); hosts NotificationBell; **logout action** | `(dashboard)/layout.tsx` |
| `NotificationBell` | sidebar scope | Client | `aria-haspopup`/`aria-expanded`, `role=menu`; derived feed (broken promises/disputes/due) | Sidebar |
| `AllActionsModal` | queue page | Local | `role=dialog`/`aria-modal`/`aria-labelledby`; Escape-close + initial focus; call/log/promise-mark tabs | Queue |
| Customer quick-actions + manage-contacts modals | customer detail | Local | dialogs w/ a11y attrs; contacts CRUD + primary | Customer detail |
| Record-payment modal | payments page | Local | optional allocation selector | Payments |
| Log-promise modal | promises page | Local | add/renegotiate | Promises |

> Shared layout/table/card markup is still largely per-page; no formal UI-kit library exists, but a11y-verified dialogs and retry/error patterns are consistent across screens. `I-cannot-confirm` the full exhaustive list of every local helper/component within each page file without re-reading every file.

---

## API Routes

| File (abbrev.) | Method(s) | Public? | Purpose |
| --- | --- | --- | --- |
| `api/auth/[...nextauth]/route.ts` | GET/POST | Yes | NextAuth handler |
| `api/register/route.ts` | POST | Yes (rate-limited) | Create org + user |
| `api/auth/forgot`, `api/auth/reset` | POST | Yes | Password reset |
| `api/dashboard/route.ts` | GET | No | Real aggregates |
| `api/import/route.ts` | POST | No | Transactional batch import |
| `api/queue/route.ts` | GET | No | Priority queue + "why here?" |
| `api/customers/route.ts`, `api/customers/[id]/route.ts` | GET/POST/PATCH | No | Customer CRUD |
| `api/customers/[id]/contacts/[...]/route.ts` | various | No | Contacts CRUD |
| `api/customers/duplicates/route.ts` (merge) | GET/POST | No | Dedupe + merge |
| `api/invoices/route.ts`, `api/invoices/[id]/route.ts` | GET | No | List (search/pagination/filter) + detail |
| `api/payments/route.ts` | POST | No | Allocation (FIFO/explicit), reversal, dup-guard |
| `api/promises/route.ts`, `api/promises/[id]/route.ts` | POST/PATCH | No | Promise create + manage |
| `api/collection-events/route.ts` | POST | No | Log outcomes |
| `api/disputes/route.ts`, `api/disputes/[id]/route.ts` | POST/PATCH | No | Create + resolve |
| `api/analytics/route.ts` | GET | No | Metrics (DSO/CEI/adherence/overdue + series) |
| `api/notifications/route.ts`, `api/notifications/preferences/route.ts` | GET/PATCH | No | Derived feed + prefs (fallback) |
| `api/jobs/promise-sweep/route.ts` | POST | No (CRON_SECRET bearer) | Idempotent ACTIVE→BROKEN; not scheduled |
| `api/export/route.ts` | GET | No | CSV/JSON stream |
| `api/account/route.ts` | DELETE | No (OWNER) | Purge + cascade |
| `api/team/route.ts`, `api/team/[userId]/route.ts` | GET/POST/PATCH/DELETE | No (MANAGE_ROLES) | Team management |
| `api/health/route.ts` | GET | Yes | Live `SELECT 1` → 200/503 |

> **Blocked/absent:** there is **no** communications/send-message route, no webhook route, no workflow-engine route — those capabilities are not built (blocked on providers/infra).

---

## Non-Component Source Files

| File | Purpose |
| --- | --- |
| `src/lib/auth.ts` | NextAuth config (Credentials, bcrypt compare, JWT maxAge 7d), exports signIn/signOut |
| `src/lib/server-context.ts` | `withAuth()`: tenant + user + role; `x-request-id`; structured JSONL logs; per-user 300/min rate limit on mutations |
| `src/lib/repo.ts` | All tenant-scoped (`organizationId`) data access |
| `src/lib/queue-item.ts` | Pure `computeQueueItem` / `statusView` (priority + why) |
| `src/lib/payment-allocation.ts` | Pure FIFO/explicit allocation, dup-guard, `nextInvoiceStatus` |
| `src/lib/invoice-status.ts`, `src/lib/collections.ts` | Derived invoice status (DUE_SOON/OVERDUE never stored); payment transitions |
| `src/lib/risk-score.ts` | Debt-profile scoring (runs after import + totals) |
| `src/lib/metrics.ts` | DSO / CEI / promise-adherence / overdue ratio / 6-month series |
| `src/lib/audit.ts` | `writeAudit()` for mutating actions |
| `src/lib/rate-limit.ts` | Token bucket (register 5/10min per IP) |
| `src/proxy.ts` | Route guard; session-cookie check; static-extension allowlist (dot-bypass removed) |
| `src/lib/utils.ts` | `cn`, `formatINR`, `formatCompactINR`, date helpers |
| `next.config.ts` | Security headers + CSP |

---

## Key Findings

1. **No mock data remains.** Every dashboard screen and every domain API operates on real, tenant-scoped database data (verified `tsc`/lint/build + 51/51 tests).
2. **Customer detail respects the route param** — `/customers/[id]` fetches by id and 404s when absent.
3. **Promise page uses the schema enum contract** (ACTIVE/KEPT/BROKEN/RENEGOTIATED via `statusView`) — the old `active/kept/broken` mismatch is gone.
4. **Loading/error/empty/retry states present** on dashboard, invoices, customers, queue, analytics, promises, payments, disputes, settings; destructive actions use confirmations.
5. **A11y-labeled dialogs** (`role=dialog`/`aria-modal`/`aria-labelledby`, Escape-close, initial focus), NotificationBell menu pattern, dual (color+text) status pills, `role=switch` toggles.
6. **`/dashboard/communications` is a route without a built email-send feature** — blocked on provider (TODO-042).
7. `public/` assets: unchanged default Next.js SVGs — custom favicon/branding beyond metadata is `I-cannot-confirm`.