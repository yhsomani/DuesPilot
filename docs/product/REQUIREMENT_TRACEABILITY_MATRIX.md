# Requirement Traceability Matrix — DuesPilot

| Attribute | Value |
| --- | --- |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Basis** | Codebase audit (commit `d037888`) ↔ BRD functional requirements ↔ PRD feature IDs ↔ repository evidence files |

**Legend:**
- **Status:** `Implemented` / `UI Only` / `Backend Only` / `Schema Only` / `Config Only` / `Documented Only` / `Not Implemented`
- **Evidence:** primary repo file(s) supporting the claim.
- Blank/`—` evidence means **no implementation exists** (status will be `Not Implemented`).

---

## BR → Feature Traceability

| BR (§8 BRD) | Business Requirement | PRD Feature ID(s) | Status | Evidence |
| --- | --- | --- | --- | --- |
| BR-F1 | Browser-based usable SAP for SME staff | All | Partially | UI renders on desktop+mobile via Tailwind |
| BR-F2 | Company multi-tenant accounts | AUTH-001, IMP-004 | Partial (org create only) | `register/route.ts:38-46`; no tenant-scoped reads |
| BR-F3 | Role-based feature access | AUTH-007 | **Not Implemented** | schema enum only |
| BR-F4 | Import receivables (CSV/Excel/Tally) | IMP-001..004 | UI Only (CSV) | `import/page.tsx`; Excel/Tally not wired |
| BR-F5 | Automatic daily prioritization | QUEUE-001, QUEUE-003 | UI Only (mock) | `queue/page.tsx:19`; scoring not implemented |
| BR-F6 | Automated email/WhatsApp/SMS | COMM-002..005 | **Not Implemented** | no provider |
| BR-F7 | Track promise-to-pay / flag broken | PROM-001..005 | UI Only (mock) | `promises/page.tsx:20`; no lifecycle |
| BR-F8 | Record & reconcile payments | PAY-001..004 | **Not Implemented** | placeholder page |
| BR-F9 | Handle disputes with workflows | DIP-001..003 | **Not Implemented** | placeholder page |
| BR-F10 | Analytics & reporting | ANL-001..003 | UI Only (mock) | `analytics/page.tsx` |
| BR-F11 | Audit trail | AUDIT-001 | Schema Only | `AuditLog` model; never written |
| BR-F12 | Data export & account deletion | SET-003, SET-004 | **Not Implemented** | no-op buttons |
| BR-F13 | Delivery status / read receipts | COMM-005 | Schema Only | `MessageStatus` enum; no logic |
| BR-F14 | Configurable workflows/cadence | WF-001 | Schema Only | `CollectionWorkflow`/`WorkflowAction`; no engine |
| BR-F15 | Escalation alerts on high-risk | QUEUE-004, WF-001 | UI Only (mock) | static `nextAction`; no alerting |

## BR → Policy Traceability

| BR-P (§7 BRD) | Policy | Status | Evidence |
| --- | --- | --- | --- |
| BR-P1 | Register validation rules | **Implemented** | `register/route.ts:6`, `register/page.tsx:8` |
| BR-P2 | Email uniqueness | **Implemented** | schema `@unique`; `register/route.ts:28` (409) |
| BR-P3 | bcrypt password hashing (cost 12) | **Implemented** | `register/route.ts:35` |
| BR-P4 | New-user role = OWNER | **Implemented** | `register/route.ts:46` |
| BR-P5 | Dashboard requires session | **Implemented** | `src/proxy.ts:27` |
| BR-P6 | Invoice number unique per org | Schema Only | schema `@@unique([organizationId, invoiceNumber])` |
| BR-P7 | Payment allocation | Schema Only | `PaymentAllocation` model |
| BR-P8 | Password complexity/lockout/expiry | **Not Defined** | — (AMBL: BRD D5) |
| BR-P9 | Trial duration / paywall | **Not Defined** | marketing only (`page.tsx`) |
| BR-P10 | Data retention/deletion | **Not Defined** | — (BRD D6) |
| BR-P11 | Follow-up SLA/cadence | **Not Defined** | — |
| BR-P12 | Dunning schedules per segment | **Not Defined** | — |
| BR-P13 | Interest/late-fee policy | **Not Defined** | — (legal input) |

## Feature → Code Traceability

| Feature ID | Feature | Implementing code | Supporting schema | Status |
| --- | --- | --- | --- | --- |
| AUTH-001 | Registration | `register/page.tsx` + `api/register/route.ts` | Organization, User | **Implemented** |
| AUTH-002 | Login | `login/page.tsx` + `api/auth/[...nextauth]` + `auth.ts` | User | **Implemented** |
| AUTH-003 | JWT session | `auth.ts:47` | — | **Implemented** |
| AUTH-004 | Route protection | `proxy.ts:27` | — | **Implemented** (cookie presence) |
| AUTH-005 | Register validation | `register/route.ts:6`, `register/page.tsx:8` | — | **Implemented** |
| AUTH-006 | Login validation | `login/page.tsx:24-34` | — | **Implemented** |
| AUTH-007 | RBAC | — | User.role | **Not Implemented** |
| AUTH-008 | Password reset | — | VerificationToken | **Not Implemented** |
| AUTH-009 | Email verification | — | User.emailVerified | **Not Implemented** |
| AUTH-010 | Logout | `auth.ts:6` (signOut only) | — | **Partial** (no UI) |
| AUTH-011 | OAuth | — | Account | **Not Implemented** |
| AUTH-012 | Invite team | — | Organization.usersCount | **Not Implemented** |
| IMP-001 | CSV upload | `import/page.tsx` (PapaParse) | — | **UI Only** |
| IMP-002 | Column mapping | `import/page.tsx:57-98` | — | **UI Only** |
| IMP-003 | Preview | `import/page.tsx:305` | — | **UI Only** |
| IMP-004 | Persist import | `import/page.tsx:119` (fake timeout) | Invoice/Customer | **Not Implemented** |
| IMP-005 | Excel/Tally support | — | — | **Not Implemented** (marketing claim) |
| QUEUE-001 | Prioritized queue | `queue/page.tsx:19` | — | **UI Only (mock)** |
| QUEUE-002 | Priority filter | `queue/page.tsx:106` | — | **UI Only (mock)** |
| QUEUE-003 | Real priority scoring | — | Invoice | **Not Implemented** |
| QUEUE-004 | Next-action generation | `queue/page.tsx` | — | **UI Only (mock)** |
| CUST-001 | Customer list w/ search/sort | `customers/page.tsx:21,121` | — | **UI Only (mock)** |
| CUST-002 | Customer detail | `customers/[id]/page.tsx:6` | — | **UI Only; broken per-id** (always mock) |
| CUST-003 | Customer CRUD | — | Customer/Contact | **Not Implemented** |
| INV-001 | Invoice list w/ filter | `invoices/page.tsx:20` | — | **UI Only (mock)** |
| INV-002 | Invoice CRUD | — | Invoice/InvoiceItem | **Not Implemented** |
| PROM-001 | Promise list w/ filter | `promises/page.tsx:20` | — | **UI Only (mock)** |
| PROM-002 | Promise stats | `promises/page.tsx:97` | — | **UI Only (mock)** |
| PROM-003 | Record promise | — | PromiseToPay | **Not Implemented** |
| PROM-004 | AI promise extraction | — | PromiseToPay.source | **Not Implemented** (marketing) |
| PROM-005 | Auto-mark broken | — | PromiseToPay | **Not Implemented** |
| PAY-001 | Payment list | `payments/page.tsx` (placeholder) | — | **Not Implemented** |
| PAY-002 | Record payment | — | Payment | **Not Implemented** |
| PAY-003 | Allocation/matching | — | PaymentAllocation | **Not Implemented** |
| PAY-004 | Bank import / auto-match | — | — | **Not Implemented** (marketing) |
| DIP-001 | Dispute list | `disputes/page.tsx` (placeholder) | — | **Not Implemented** |
| DIP-002 | Log dispute | — | Dispute | **Not Implemented** |
| DIP-003 | Categories/resolution | — | Dispute | **Not Implemented** (marketing) |
| COMM-001 | Comms hub | `communications/page.tsx` (placeholder) | — | **Not Implemented** |
| COMM-002 | Send message | — | Message | **Not Implemented** |
| COMM-003 | Email delivery | — | — | **Not Implemented** |
| COMM-004 | WhatsApp delivery | — | — | **Not Implemented** |
| COMM-005 | Delivery/read status | — | MessageStatus enum | **Schema Only** |
| ANL-001 | KPI cards | `analytics/page.tsx:5` | — | **UI Only (mock)** |
| ANL-002 | Monthly chart | `analytics/page.tsx:14` | — | **UI Only (mock)** |
| ANL-003 | Top overdue customers | `analytics/page.tsx:80` | — | **UI Only (mock)** |
| SET-001 | Org settings form | `settings/page.tsx` | — | **UI Only** (no save) |
| SET-002 | Notification toggles | `settings/page.tsx:40` | — | **UI Only** (no save) |
| SET-003 | Export all data | — | — | **Not Implemented** |
| SET-004 | Delete account | — | — | **Not Implemented** |
| SET-005 | Save changes | — | — | **Not Implemented** |
| WF-001 | Workflow engine | — | CollectionWorkflow/WorkflowAction | **Schema Only** |
| AUDIT-001 | Audit log capture | — | AuditLog | **Schema Only** |
| INT-001 | Integration credentials | — | IntegrationCredential | **Schema Only** |

## User Story → Feature Traceability

| Story | Feature(s) | Status |
| --- | --- | --- |
| US-AUTH-01 register | AUTH-001, AUTH-005 | Implemented |
| US-AUTH-02 login | AUTH-002, AUTH-006 | Implemented |
| US-AUTH-03 logout | AUTH-010 | **Missing** |
| US-IMP-01 upload/map | IMP-001..003 | UI Only |
| US-IMP-02 save import | IMP-004 | **Missing** |
| US-QUEUE-01 today's actions | QUEUE-001 | UI (mock) |
| US-CUST-01 customer detail | CUST-002 | UI (mock), broken per-id |
| US-PROM-01 record promise | PROM-003 | **Missing** |
| US-PAY-01 record/match payment | PAY-002/003 | **Missing** |
| US-ANL-01 collection KPIs | ANL-001..003 | UI (mock) |

## Requirement ↔ Test Traceability

| Requirement | Requires automated test | Test exists? |
| --- | --- | --- |
| All implemented validation rules (register/login) | Yes | **No** |
| AUTH session guard | Yes | **No** |
| Future domain APIs (import, queue, promises, payments) | Yes | **No** |
| Security controls (RBAC, RLS, rate limit) | Yes | **No** |

**Test traceability verdict:** The repository contains **zero tests, zero test framework, and zero test script** (`package.json` has no `test` script). No requirement has automated coverage. This is a critical production gap (see `PRODUCTION_READINESS_CHECKLIST.md`).
