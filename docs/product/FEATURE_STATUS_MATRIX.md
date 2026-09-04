# Feature Status Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Basis** | Codebase audit (commit `d037888`) |

**Legend:** ✅ Fully Implemented · 🔶 Partial · 🖥 UI Only (mock) · 🗄 Schema Only · ⚙️ Config Only · 📄 Documented Only · ❌ Not Implemented

---

## Auth & Accounts

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| AUTH-001 | Registration (org + user) | ✅ | `api/register/route.ts` |
| AUTH-002 | Login (credentials) | ✅ | `lib/auth.ts` |
| AUTH-003 | JWT session | ✅ | `auth.ts:47` |
| AUTH-004 | Route protection | 🔶 (cookie presence) | `proxy.ts` |
| AUTH-005 | Register validation | ✅ | zod |
| AUTH-006 | Login validation | ✅ | zod |
| AUTH-007 | RBAC | ❌ | — |
| AUTH-008 | Password reset | ❌ | — |
| AUTH-009 | Email verification | ❌ | — |
| AUTH-010 | Logout | 🔶 (no UI) | `auth.ts:6` |
| AUTH-011 | OAuth providers | ❌ | — |
| AUTH-012 | Invite team | ❌ | — |

## Data / Import

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| IMP-001 | CSV upload | 🖥 | `import/page.tsx` |
| IMP-002 | Column mapping | 🖥 | `import/page.tsx:57-98` |
| IMP-003 | Preview | 🖥 | `import/page.tsx:305` |
| IMP-004 | Persist import | ❌ | `import/page.tsx:119` (fake) |
| IMP-005 | Excel/Tally | ❌ | marketing only |

## Queue

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| QUEUE-001 | Prioritized queue | 🖥 (mock) | `queue/page.tsx` |
| QUEUE-002 | Priority filter | 🖥 (mock) | `queue/page.tsx:106` |
| QUEUE-003 | Real priority scoring | ❌ | — |
| QUEUE-004 | Next-action gen | 🖥 (mock) | `queue/page.tsx` |

## Customers

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| CUST-001 | Customer list w/ search/sort | 🖥 (mock) | `customers/page.tsx` |
| CUST-002 | Customer detail | 🖥 (mock, same for all ids) | `customers/[id]/page.tsx` |
| CUST-003 | Customer CRUD | ❌ | — |

## Invoices

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| INV-001 | Invoice list w/ filter | 🖥 (mock) | `invoices/page.tsx` |
| INV-002 | Invoice CRUD | ❌ | — |

## Promises-to-Pay

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| PROM-001 | Promise list w/ filter | 🖥 (mock) | `promises/page.tsx` |
| PROM-002 | Promise stats | 🖥 (mock) | `promises/page.tsx:97` |
| PROM-003 | Record promise | ❌ | — |
| PROM-004 | AI promise extraction | ❌ | marketing only |
| PROM-005 | Auto-mark broken | ❌ | — |

## Payments

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| PAY-001 | Payment list | ❌ | placeholder |
| PAY-002 | Record payment | ❌ | — |
| PAY-003 | Allocation/matching | ❌ | — |
| PAY-004 | Bank import / auto-match | ❌ | marketing only |

## Disputes

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| DIP-001 | Dispute list | ❌ | placeholder |
| DIP-002 | Log dispute | ❌ | — |
| DIP-003 | Categories / resolution | ❌ | marketing only |

## Communications

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| COMM-001 | Comms hub | ❌ | placeholder |
| COMM-002 | Send message | ❌ | — |
| COMM-003 | Email delivery | ❌ | — |
| COMM-004 | WhatsApp delivery | ❌ | — |
| COMM-005 | Delivery/read status | 🗄 | `MessageStatus` enum |

## Analytics

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| ANL-001 | KPI cards | 🖥 (mock) | `analytics/page.tsx:5` |
| ANL-002 | Monthly chart | 🖥 (mock) | `analytics/page.tsx:14` |
| ANL-003 | Top overdue customers | 🖥 (mock) | `analytics/page.tsx:80` |

## Settings

| Feature ID | Feature | Status | Where |
| --- | --- | --- | --- |
| SET-001 | Org settings form | 🖥 (no save) | `settings/page.tsx` |
| SET-002 | Notification toggles | 🖥 (no save) | `settings/page.tsx:40` |
| SET-003 | Export data | ❌ | — |
| SET-004 | Delete account | ❌ | — |
| SET-005 | Save changes | ❌ | — |

## Schema-Only Domain (backend foundation)

| Feature ID | Feature | Status | Schema model |
| --- | --- | --- | --- |
| WF-001 | Workflow engine | 🗄 | CollectionWorkflow, WorkflowAction |
| AUDIT-001 | Audit log capture | 🗄 | AuditLog |
| INT-001 | Integration credentials | 🗄 | IntegrationCredential |
| — | Payments/promises/disputes/messages full model | 🗄 | Payment, PaymentAllocation, PromiseToPay, Dispute, Message |

---

## Rollup Summary

| Category | ✅ Full | 🔶 Partial | 🖥 UI Only | 🗄 Schema Only | ❌ Missing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Auth/Accounts | 6 | 2 | 0 | 0 | 4 |
| Import | 0 | 0 | 3 | 0 | 2 |
| Queue | 0 | 0 | 3 | 0 | 1 |
| Customers | 0 | 0 | 2 | 0 | 1 |
| Invoices | 0 | 0 | 1 | 0 | 1 |
| Promises | 0 | 0 | 2 | 0 | 3 |
| Payments | 0 | 0 | 0 | 0 | 4 |
| Disputes | 0 | 0 | 0 | 0 | 3 |
| Communications | 0 | 0 | 0 | 1 | 4 |
| Analytics | 0 | 0 | 3 | 0 | 0 |
| Settings | 0 | 0 | 2 | 0 | 3 |
| Schema-only domain | 0 | 0 | 0 | 3 | 0 |
| **Total** | **6** | **2** | **16** | **4** | **26** |

**Verdict:** Of 54 tracked feature items, only **6 are fully implemented** (all in auth/registration), **16 are UI-only mocks**, **4 are schema-only**, and **26 are not implemented at all**. The product is a **prototype**, not a launched system.
