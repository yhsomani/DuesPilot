# Feature Status Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Basis** | Codebase audit (post-`83e6ebd`, Phases 1–15) + `docs/MASTER_TODO.md` + verified quality gate (tsc/lint/51 tests/build green) |

**Legend:** ✅ Implemented (real, tenant-scoped, DB-backed) · 🔶 Partial · 🗄 Schema Only · 🚫 Blocked (external dependency) · ❌ Not Built · ⚠️ Not Defined

---

## Auth & Accounts

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| AUTH-001 | Registration (org + user) | ✅ | zod + bcrypt 12 + rate-limit; `api/register` |
| AUTH-002 | Login (credentials) | ✅ | `lib/auth.ts`, JWT maxAge 7d |
| AUTH-003 | JWT session | ✅ | `auth.ts` |
| AUTH-004 | Route protection | ✅ | `src/proxy.ts` (session cookie; dot-bypass removed) |
| AUTH-005 | Register validation | ✅ | zod client + server |
| AUTH-006 | Login validation | ✅ | zod |
| AUTH-007 | RBAC | ✅ | `ACTION_ROLES` / `MANAGE_ROLES` guards |
| AUTH-008 | Password reset | ✅ | forgot/reset, hashed 15-min tokens |
| AUTH-009 | Email verification | 🚫 | TODO-041 blocked |
| AUTH-010 | Logout | ✅ | Sidebar → `/login` |
| AUTH-011 | OAuth providers | ❌ | not built |
| AUTH-012 | Invite team | ✅ | `api/team[/userId]`, last-owner protection |

## Data / Import

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| IMP-001 | CSV upload | ✅ | `import/page.tsx` (PapaParse) |
| IMP-002 | Column mapping | ✅ | import UI |
| IMP-003 | Preview | ✅ | preview + per-row skip reasons |
| IMP-004 | Persist import | ✅ | `POST /api/import` transactional batch, dup detection, honest counts |
| IMP-005 | Excel/Tally | ❌ | marketing claim only |

## Queue

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| QUEUE-001 | Prioritized queue | ✅ | `GET /api/queue` via `queue-item.ts` |
| QUEUE-002 | Priority filter | ✅ | queue page (all/high/medium/low) |
| QUEUE-003 | Real priority scoring | ✅ | `computeQueueItem`/`statusView` + risk-score; disputed excluded |
| QUEUE-004 | Next-action + "why here?" | ✅ | per-row `why` |

## Customers & Contacts

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| CUST-001 | Customer list w/ search | ✅ | `GET /api/customers?search=` (server-side) |
| CUST-002 | Customer detail (real `[id]`) | ✅ | `GET /api/customers/[id]` + page; 404 if absent |
| CUST-003 | Customer CRUD | ✅ | GET/POST/PATCH `/api/customers[/id]` |
| CUST-004 | Contacts CRUD | ✅ | `/customers/[id]/contacts/[...]` |
| CUST-005 | Dedupe + merge | ✅ | `/duplicates` + `mergeCustomers` tx |

## Invoices

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| INV-001 | Invoice list w/ search + status filter | ✅ | `GET /api/invoices` cursor pagination + derived status |
| INV-002 | Invoice detail | ✅ | `GET /api/invoices/[id]` + `/dashboard/invoices/[id]` |

## Promises-to-Pay

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| PROM-001 | Promise list w/ filter | ✅ | promises page |
| PROM-002 | Promise stats | ✅ | promises page |
| PROM-003 | Record promise | ✅ | `POST /api/promises`; `PATCH [id]` manage |
| PROM-004 | AI promise extraction | ❌ | marketing claim only |
| PROM-005 | Auto-mark broken | ✅ (endpoint) / 🚫 (scheduler) | `/api/jobs/promise-sweep` idempotent; **cron not provisioned** (TODO-058) |

## Payments

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| PAY-001 | Payment list + allocation detail | ✅ | payments page |
| PAY-002 | Record payment | ✅ | `POST /api/payments` (FIFO/explicit, partial/overpay/unmatched) |
| PAY-003 | Allocation/matching + transitions | ✅ | `payment-allocation.ts` + `nextInvoiceStatus`; auto-KEPT promises |
| PAY-004 | Bank import / auto-match | ❌ | marketing claim only |
| PAY-005 | Reversal + duplicate guard | ✅ | payments API |

## Disputes

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| DIP-001 | Dispute list | ✅ | disputes page |
| DIP-002 | Log dispute | ✅ | `POST /api/disputes` (categories) |
| DIP-003 | Categories / resolution | ✅ | `PATCH /api/disputes/[id]`; queue exclusion |

## Communications

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| COMM-001 | Comms hub | 🔶 route only | `/dashboard/communications`; **email send NOT built (Blocked)** |
| COMM-002 | Send message | 🚫 | no provider (TODO-042); `Message` schema-only |
| COMM-003 | Email delivery | 🚫 | no provider |
| COMM-004 | WhatsApp delivery | 🚫 | no provider (TODO-044) |
| COMM-005 | Delivery/read status | 🗄 | `MessageStatus` enum |

## Analytics

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| ANL-001 | KPI cards | ✅ | `src/lib/metrics.ts` + `/api/analytics` |
| ANL-002 | 6-month trend chart | ✅ | analytics page |
| ANL-003 | Top overdue / pipeline health | ✅ | analytics page |

## Notifications

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| NTF-001 | In-app derived feed | ✅ | `GET /api/notifications` (broken promises/disputes/due) + bell + banner |
| NTF-002 | Preferences | ✅ (fallback) | `GET/PATCH /api/notifications/preferences`; migration pending |

## Settings & Team

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| SET-001 | Org settings (business hours/holidays/working days/pause) | ✅ (migration pending) | settings GET/PATCH; org columns |
| SET-002 | Notification toggles (UI) | ✅ (migration pending) | settings UI (backed by `NTF-002` API) |
| SET-003 | Export data | ✅ | `GET /api/export?format=csv\|json` |
| SET-004 | Delete account | ✅ | `DELETE /api/account` OWNER-only purge + cascade |
| SET-005 | Save changes | ✅ | settings PATCH |
| SET-006 | Team management (UI) | ✅ | settings UI (backed by `AUTH-012` `/api/team`) |

## Schema-Only / External Domain

| Feature ID | Feature | Status | Schema model |
| --- | --- | --- | --- |
| WF-001 | Workflow engine | 🗄 | CollectionWorkflow, WorkflowAction |
| INT-001 | Integration credentials | 🗄 | IntegrationCredential (no encryption layer yet) |
| — | Message lifecycle | 🗄 | Message, MessageStatus (Blocked on providers) |
| — | Billing/plans/entitlements | 🚫 | none (TODO-049) |

---

## Rollup Summary

Row tallies are approximate by the legend (an item with a split status counts in its leading bucket and is footnoted).

| Category | ✅ Impl | 🔶 Partial | 🗄 Schema | 🚫 Blocked | ❌ Missing | ⚠️ Not Defined |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Auth/Accounts | 10 | 0 | 0 | 1 | 1 | 0 |
| Import | 4 | 0 | 0 | 0 | 1 | 0 |
| Queue | 4 | 0 | 0 | 0 | 0 | 0 |
| Customers/Contacts | 5 | 0 | 0 | 0 | 0 | 0 |
| Invoices | 2 | 0 | 0 | 0 | 0 | 0 |
| Promises | 4* | 0 | 0 | 0 | 1 | 0 |
| Payments | 4 | 0 | 0 | 0 | 1 | 0 |
| Disputes | 3 | 0 | 0 | 0 | 0 | 0 |
| Communications | 0 | 1 | 1 | 3 | 0 | 0 |
| Analytics | 3 | 0 | 0 | 0 | 0 | 0 |
| Notifications | 2 | 0 | 0 | 0 | 0 | 0 |
| Settings/Team | 6 | 0 | 0 | 0 | 0 | 0 |
| Schema-only domain | 0 | 0 | 3 | 1 | 0 | 0 |
| **Total** | **47*** | **1** | **4** | **5** | **4** | **0** |

\* PROM-005 counts as implemented at the endpoint level but its scheduler is blocked (cron provisioning, TODO-058).

**Verdict:** Of the tracked feature items, **47 are implemented against real, tenant-scoped data** — a complete inversion of the earlier 6-implemented/26-missing prototype state. The remaining gaps are concentrated in **authenticated outbound communications (blocked on providers)** and **marketing-only claims (Excel/Tally import, bank auto-match, AI extraction, OAuth)**. See `GAP_REGISTER.md` and `MASTER_TODO.md` for the blocked items.