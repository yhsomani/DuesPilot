# Page & Component Inventory — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Coverage** | Every route/page/component in `src/` |

---

## App Router Pages

| Route path | File | Type | Layout | Data source | Auth | Status notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Server (landing) | `root` | Static marketing copy | Public | CTAs → `/register`; pricing present |
| `/login` | `src/app/(auth)/login/page.tsx` | Client (Suspense) | `(auth)` | — | Public | zod validation; `useSearchParams` in Suspense |
| `/register` | `src/app/(auth)/register/page.tsx` | Client | `(auth)` | — | Public | zod validation; POST `/api/register` |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Client | `(dashboard)` | **Mock** (`mockStats`, `mockAging`, `mockQueue`) | Protected | All numbers hardcoded |
| `/dashboard/queue` | `.../dashboard/queue/page.tsx` | Client | `(dashboard)` | **Mock** (`mockQueue`, priority filter) | Protected | Static data |
| `/dashboard/customers` | `.../dashboard/customers/page.tsx` | Client | `(dashboard)` | **Mock** (`mockCustomers`, search/sort client-side) | Protected | Static data |
| `/dashboard/customers/[id]` | `.../dashboard/customers/[id]/page.tsx` | Client | `(dashboard)` | **Mock** (`mockCustomer`) — **ignores `[id]`** | Protected | Every id shows "Raj Steel" |
| `/dashboard/invoices` | `.../dashboard/invoices/page.tsx` | Client | `(dashboard)` | **Mock** (`mockInvoices`, status filter) | Protected | Static data |
| `/dashboard/payments` | `.../dashboard/payments/page.tsx` | Client | `(dashboard)` | Empty-state placeholder | Protected | No-op buttons |
| `/dashboard/promises` | `.../dashboard/promises/page.tsx` | Client | `(dashboard)` | **Mock** (`mockPromises`; uses own status strings `active/kept/broken` ≠ schema enum) | Protected | Static data |
| `/dashboard/disputes` | `.../dashboard/disputes/page.tsx` | Client | `(dashboard)` | Empty-state placeholder | Protected | No-op buttons |
| `/dashboard/communications` | `.../dashboard/communications/page.tsx` | Client | `(dashboard)` | Empty-state placeholder | Protected | No-op buttons |
| `/dashboard/import` | `.../dashboard/import/page.tsx` | Client | `(dashboard)` | Parent state (client parse) | Protected | PapaParse; **no persistence** |
| `/dashboard/analytics` | `.../dashboard/analytics/page.tsx` | Client | `(dashboard)` | **Mock** (KPIs, chart, top customers) | Protected | Static data; chart is CSS/divs |
| `/dashboard/settings` | `.../dashboard/settings/page.tsx` | Client | `(dashboard)` | Defaults (`Acme Pvt Ltd`) | Protected | No save handler |

### Placeholder pages (shared skeleton)
`payments`, `disputes`, `communications` share the same "coming soon / empty state" structure with no-op action buttons.

---

## Layouts

| File | Route group | Contains |
| --- | --- | --- |
| `src/app/layout.tsx` | root | `<html lang="en">`, Geist fonts, `<body>`, metadata "DuesPilot — Collections Operating System for Indian B2B SMEs" |
| `src/app/(auth)/layout.tsx` | auth | Shared centering/auth chrome |

> `(dashboard)/layout.tsx` was previously `"use client"`; **now a server component** (no `"use client"`), renders `<Sidebar/>` + main. It does **not** itself enforce auth (proxy does).

---

## Components

| Component | File | Type | Props/Notes | Used by |
| --- | --- | --- | --- | --- |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Client | lucide-react icons; nav groups (Overview, Collections, Master data, Settings) | `(dashboard)/layout.tsx` |
| `TimelineIcon` | `customers/[id]/page.tsx:39` | Local fn | SVG per event type | Customer detail |
| — | `src/components/` | — | **No other components exist** — no UI kit (no shared Button/Card/Table/Badge) | — |

---

## API Routes

| File | Method | Public? | Purpose |
| --- | --- | --- | --- |
| `src/app/api/auth/[...nextauth]/route.ts` | GET/POST | Yes (public) | NextAuth handler (`runtime = "nodejs"`) |
| `src/app/api/register/route.ts` | POST | Yes (public) | Create org + user |

**No other API routes exist.** No domain CRUD, no data-fetch, no webhooks.

---

## Non-Component Source Files

| File | Purpose |
| --- | --- |
| `src/lib/auth.ts` | NextAuth config (Credentials, bcrypt compare, JWT), exports `auth`, `signIn`, `signOut` |
| `src/lib/prisma.ts` | PrismaPg adapter client; validates `DATABASE_URL` |
| `src/lib/utils.ts` | `cn`, `formatINR`, `formatCompactINR`, `daysOverdue`, `daysUntilDue`, `getAgingBucket`, `getPriorityColor` |
| `src/proxy.ts` | Route guard (Next.js 16 `proxy`); cookie-presence check; skips public paths & `_next`/static |

---

## Key Findings

1. **Every dashboard data screen uses hardcoded mocks.** No screen queries the database.
2. **Customer detail ignores route param** — `customers/[id]/page.tsx` destructures `params` as `_id` and renders `mockCustomer` unconditionally → broken semantics.
3. **No shared UI component library** — layout/table/card markup is duplicated inline across the 9 mock screens.
4. **Promise page contract mismatch** — uses `active/kept/broken` strings while schema enum is `ACTIVE/KEPT/BROKEN/RENEGOTIATED`.
5. **No `loading.tsx`, `error.tsx`, or `not-found.tsx`** present.
6. **Public assets** `public/` hold only default Next.js SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — no app logo/favicon customization beyond metadata.
