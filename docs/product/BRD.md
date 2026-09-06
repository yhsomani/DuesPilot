# BRD — DuesPilot Collections Operating System

| Attribute | Value |
| --- | --- |
| **Document name** | Business Requirements Document |
| **Project name** | DuesPilot |
| **Version** | 2.0.0 |
| **Analysis date** | 2026-09-04 |
| **Status** | CURRENT — reflects the implemented system (Phases 1–15, post-`83e6ebd`) |
| **Source of truth** | Repository; statuses per `docs/MASTER_TODO.md` |
| **Related artifacts** | `PRD.md`, `REQUIREMENT_TRACEABILITY_MATRIX.md`, `FEATURE_STATUS_MATRIX.md`, `PAGE_COMPONENT_INVENTORY.md`, `PRODUCTION_READINESS_CHECKLIST.md`, `CREDENTIALS_AND_INTEGRATIONS_MATRIX.md`, `GAP_REGISTER.md` |

> Quality gate (verified 2026-09-05): `tsc --noEmit`, `npm run lint`, `npm test` (209/209, 27 files), `npm run build` all green.

---

## 1. Business Context

### 1.1 Problem
Indian B2B SMEs routinely face delayed invoice payments, absorbing working-capital pressure and risking legal escalation. Collections are typically tracked in aging spreadsheets, chased manually, without a record of prior interactions.

**CODEBASE-VERIFIED problem framing (landing copy, `src/app/page.tsx`):**
> "Too many businesses lose money to slow payers. You chase invoices manually, hoping for the best."
> "You'll never build a dependable collections pipeline with an aging spreadsheet."

### 1.2 Opportunity
DuesPilot is an automated Collections Operating System that converts receivables into a prioritized, daily, low-friction collection routine. Unlike the earlier mock prototype, the **core loop is now functional**: receivable import → prioritized queue → guided actions → promise tracking → payment reconciliation → analytics, all against real, tenant-scoped data.

---

## 2. Market Context (as asserted on landing page)

**Marketing numbers (`UNVERIFIED` — no cited source, no internal computation; re-validate before public use):**
- ₹55,244 Cr total MSME delayed-payment claims received on MSME Samadhaan.
- 2,56,892 delayed-payment applications filed.
- 9.45 Cr Udyam registrations.
- Saved "30+ hours a month" per user; "Get paid 22 days faster".

### 2.3 Target segment
Indian B2B SMEs selling on credit: distributors, manufacturers, service providers, traders. **AMBIGUOUS** — no explicit ICP document; derived from landing language (B2B, Udyam/MSME framing).

---

## 3. Business Objectives

| Objective ID | Objective | Metric | Current Evidence |
| --- | --- | --- | --- |
| OBJ-1 | Reduce DSO | % reduction in average DSO | **Measurable** — DSO computed in `src/lib/metrics.ts` + `/api/analytics` |
| OBJ-2 | Reduce manual collections effort | hours saved/month | Partially measurable — guided queue/actions; no effort instrumentation |
| OBJ-3 | Increase on-time / recovered payment rate | collection effectiveness index (CEI) | **Measurable** — CEI computed in metrics service |
| OBJ-4 | Product adoption / activation | signups→imported→first queue action | Partially — first-run onboarding CTA; no activation analytics SDK |
| OBJ-5 | Monetization | MRR | **Not achievable** — billing not implemented (Blocked, TODO-049) |

**Verdict:** OBJ-1 and OBJ-3 (collections outcomes) are now measurable from real data via the analytics service. OBJ-5 (monetization) and full activation instrumentation remain blocked/unbuilt.

---

## 4. Value Proposition

**CODEBASE-VERIFIED (marketing):**
> "Turn your receivables into a coordinated daily operation."
Import → Prioritize → Automate → Track → Pay → Analyze.

**Current realized value:** The **core collection loop is implemented** — a registrant imports real receivables, sees a prioritized tenant-scoped queue with explanations, records promises/actions/payments/disputes, and views real analytics. **The "Automate" pillar (proactive email/WhatsApp/SMS follow-up) remains blocked** on external providers; billing is not yet monetized.

---

## 5. Success Metrics (KPIs)

- **North-Star:** Number of weekly collection actions completed → dollars recovered. **Partially trackable** via collection events; no dedicated instrumentation.
- Activation: signups who import ≥1 receivable and complete ≥1 queue action — **partially supported** (first-run onboarding); no analytics SDK.
- Engagement: queue completion rate — **trackable** via queue/collection-event data.
- Outcome: CEI, DSO trend, promise-to-payment conversion — **trackable** via `src/lib/metrics.ts`.
- Retention / revenue / CAC-LTV — **not instrumented** (no product analytics or billing).

---

## 6. Stakeholders

| Stakeholder | Interest | Notes / AMBIGUITY |
| --- | --- | --- |
| Business owner (SME) | Fast cash recovery, low effort | Buyer & champion; full manage (OWNER) |
| Finance manager | Accurate reconciliation, aging visibility | Power user; import + payment actions |
| Collector | Daily prioritized action list | Primary daily user; collections mutations |
| Sales | Credit decisions, customer context | Read/view, no mutations |
| Investor/founder | Growth to revenue | Needs activation + retention mechanics |
| Regulator/legal | Consumer/credit-law compliance | India-specific; **not addressed** (counsel input required) |

---

## 7. Existing Business Rules & Policies (implemented)

| Rule ID | Rule | Enforcement | Status |
| --- | --- | --- | --- |
| BR-01 | Register: name≥2, valid email, password≥8, company≥2 | zod client + server | **Implemented** |
| BR-02 | Email unique per account | schema `@unique`; 409 on duplicate | **Implemented** |
| BR-03 | Passwords hashed (bcrypt, cost 12) | register | **Implemented** |
| BR-04 | New signup = OWNER | register | **Implemented** |
| BR-05 | Authenticated users reach `/dashboard/*`; others redirect to login | `src/proxy.ts` session cookie | **Implemented** |
| BR-06 | Invoice `invoiceNumber` unique per org | schema `@@unique([organizationId, invoiceNumber])`; import enforces | **Implemented** |
| BR-07 | Payment allocation to invoices | `src/lib/payment-allocation.ts` (FIFO/explicit), `PaymentAllocation` model | **Implemented** |
| BR-08 | RBAC: collections mutations by ACTION_ROLES; settings/import/team by MANAGE_ROLES | server guards | **Implemented** |
| BR-09 | Tenant isolation (org scoping) | `withAuth` + `src/lib/repo.ts` | **Implemented** (app-layer; DB RLS pending) |
| BR-10 | Rate limiting | register 5/10min per IP; mutating calls 300/min per user | **Implemented** |
| BR-11 | Promise auto-sweep ACTIVE→BROKEN | `/api/jobs/promise-sweep` (CRON_SECRET, idempotent; **not scheduled — infra pending**) | **Implemented (endpoint); scheduler blocked** |
| BR-12 | Password complexity/lockout/expiry | — | **AMBIGUOUS/Not defined** (BRD D5) |
| BR-13 | Free-trial duration & pricing enforcement | — | **Not defined**; billing blocked |
| BR-14 | Data retention / deletion timelines | — | **Not defined** (D6) |
| BR-15 | Follow-up SLA / dunning schedules | — | **Not defined**; automation blocked |
| BR-16 | Interest/late-fee policy (India: MSME) | — | **Not defined** (legal input) |

---

## 8. Functional Requirements (business narrative)

> Full ID-level traceability in `REQUIREMENT_TRACEABILITY_MATRIX.md`. Status given per requirement.

1. Browser-based system usable by non-technical SME staff (**IMPLEMENTED** — real, tenant-scoped UI + API).
2. Company-based multi-tenant accounts (**IMPLEMENTED** — org at registration + org-scoped repo layer).
3. User roles controlling feature access (**IMPLEMENTED** — RBAC via ACTION_ROLES/MANAGE_ROLES + last-owner protection).
4. Import receivables from CSV (**IMPLEMENTED** — CSV via PapaParse + transactional batch; **Excel/Tally NOT wired**).
5. Automatic prioritization of accounts (**IMPLEMENTED** — computed queue priority + "why here?").
6. Automated communication: email, WhatsApp, SMS (**NOT BUILT / BLOCKED** — no providers).
7. Track promise-to-pay and flag broken promises (**IMPLEMENTED** — lifecycle + auto-sweep).
8. Record & reconcile payments (**IMPLEMENTED** — FIFO/explicit allocation, reversals, invoice transitions).
9. Handle disputes with categories & workflows (**IMPLEMENTED** — categories + resolve; disputed excluded from queue).
10. Interactive analytics & reporting (**IMPLEMENTED** — DSO/CEI/adherence/overdue + 6-month series).
11. Audit trail of collections actions (**IMPLEMENTED** — `src/lib/audit.ts`).
12. Data export & account deletion (DPDP-analogous) (**IMPLEMENTED** — `/api/export`, `/api/account`).
13. Email/WhatsApp delivery status & read receipts (**NOT BUILT** — `MessageStatus` schema-only).
14. Configurable collection workflows/cadence (**SCHEMA-ONLY** — models present; no execution engine).
15. Alerting/escalation to owner on high-risk accounts (**PARTIAL** — derived in-app notifications + escalation banner; no outbound alerts).

---

## 9. Non-Functional Requirements (business level)

| NFR Area | Requirement | Status |
| --- | --- | --- |
| Availability | 99.9% during business hours | Proposed target; no managed infra (Blocked) |
| Performance | Dashboard <2s; actions <1s | Proposed; no measured budgets |
| Security | bcrypt (**done**); RBAC (**done** — app layer); RLS (**to build**); secrets not in repo (**done**) | Mostly implemented; RLS pending |
| Compliance | India compliance (GST-invoice context, DPDP 2023, MSME interest) | Legal counsel required |
| Usability | Mobile + desktop; guided onboarding | Onboarding + first-run CTA implemented |
| Reliability | Idempotent import; guard duplicate sends/payments | Import + payment dup-guard done; sends blocked |
| Auditability | Audit log for legal/collections disputes | Implemented (`audit.ts`) |

---

## 10. Business Roles & Permissions Matrix

**Implemented** (post-Phase 2 RBAC overhaul), not merely proposed:

| Capability | OWNER | ADMIN | FIN_MGR | COLLECTOR | SALES | VIEWER |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| View dashboard/queue/analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Collections mutations (promises/payments/events/disputes) — ACTION_ROLES | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Import receivables — MANAGE_ROLES | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage settings/export/account — MANAGE_ROLES | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage team (invite/roles/remove) — MANAGE_ROLES + OWNER/ADMIN | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Approve escalations/waivers | n/a | n/a | n/a | n/a | n/a | n/a |

> Note: exact per-capability assignment of the ACTION_ROLES/MANAGE_ROLES sets is coded in `src/lib/` (roles.ts) — the precise membership of each role is **implemented but not re-confirmed in this doc** (I-cannot-confirm exact set per role beyond the documented ACTION_ROLES/MANAGE_ROLES guards). Last-owner protection prevents removing the final OWNER.

---

## 11. Legal & Regulatory Considerations (PROPOSED — validate with counsel)

- **MSME delayed-payment interest** (MSMED Act): dunning copy must be legally vetted.
- **DPDP Act 2023** (India): personal-data handling of customer contacts; consent; data minimization. Account deletion/export now **implemented** (aligns with DPDP-style rights); full compliance review still required.
- **WhatsApp Business API** policy compliance (templates; opt-in) — relevant when WhatsApp is unblocked.
- **Payment data**: any payment-link/gateway use requires PCI-DSS-vetted provider (schema stores no raw card data).
- **Telecom/DND** for SMS — relevant when SMS is unblocked.
- **Consumer protection / fair-debt** if extended beyond B2B.

**No legal review exists in the repo. UNVERIFIED / PROPOSED.**

---

## 12. Pricing (marketing-only; NOT operational)

From landing page (`page.tsx` pricing section):

| Plan | Price/mo (₹) | Positioning |
| --- | --- | --- |
| Starter | 999 | Entry |
| Growth | 2,499 | Middle |
| Pro | 5,999 | Advanced |

**No billing model, plan gating, subscriptions, or payment provider is implemented (Blocked, TODO-049).** Whether to implement Stripe/Razorpay, and plan entitlement mapping, is an **AMBIGUOUS business decision** (depends on unblocking billing).

---

## 13. Go-To-Market & Onboarding

**Proposed funnel:** Landing → value props → pricing → CTA → `/register` → `/login` → `/dashboard`.

**Current funnel reality:** CTAs route to `/register` (verified). After registration and login the user lands on a **real dashboard** showing real aggregate data; when `totalReceivables=0` a first-run onboarding CTA guides them to import. Import persists real data with honest counts. **The activation loop is now functional** (activation instrumentation/monetization still pending).

---

## 14. Business Risks

| Risk | Severity | Current Mitigation | Gap |
| --- | --- | --- | --- |
| Core value unproven (no real data flow) | **Resolved** | Real DB-backed features | — |
| Regressions | Medium | 209/209 unit tests across 27 files + CI pipeline | integration + E2E blocked (TODO-051/052) |
| External integrations absent | High | — | Blocks automation value prop (email/WA/SMS) |
| Open registration abuse | Medium | Rate limiting (5/10min per IP) | — |
| Tenant data leak across orgs | Low-Medium | App-layer org scoping | DB RLS pending |
| Compliance (DPDP/MSME/WhatsApp) | Medium-High | — | Counsel review required |
| Competing on price vs CRMs | Medium | — | ICP differentiation; AMBIGUOUS |
| Promise-sweep not scheduled | Medium | Endpoint + CRON_SECRET ready | Cron provisioning (TODO-058) |
| Pending migrations (NotificationPreference, org cols, idempotency) | Medium | Graceful fallbacks coded | Migration pending |
| npm audit: 4 high (transitive via Prisma) | Low (accepted) | Tracked; only non-breaking fix unavailable | Accepted risk |

---

## 15. Business Decision Log (open decisions)

| # | Decision | Options | Impact | Status |
| --- | --- | --- | --- | --- |
| D1 | Which providers first (email, WhatsApp, SMS, payments, AI)? | Prioritize | Automation milestone | **OPEN** (email recommended) |
| D2 | Billing provider + plan entitlement mapping | Stripe/Razorpay; tier mapping | Monetization | **OPEN** |
| D3 | Password/security policy specifics | length/complexity/lockout | BR-12 | **OPEN** |
| D4 | Data retention/deletion policy | durations | BR-14/compliance | **OPEN** |
| D5 | Language/localization scope | EN-only vs regional | NFR/i18n | **OPEN** |
| D6 | Legal/compliance scope & counsel | which regions | §11 | **OPEN** |
| D7 | Outbound follow-up cadence / dunning schedules | per segment | BR-15 | **OPEN** |

> Note: Roles-permissions is no longer open — RBAC is implemented (see §10); only fine-grained micro-decisions about specific role membership remain if the business wants changes.

---

## 16. Prioritization Recommendation (next slice)

Most of the original minimal-lovable-loop is now built. Recommended next steps, in order:
1. **Run pending migrations** (NotificationPreference, org columns, IdempotencyKey store).
2. **Provision the promise-sweep cron** (and scheduler) — completes automation loop (TODO-058).
3. **Unblock email provider** (lowest-friction automation win) — Message lifecycle + templates + manual send (TODO-042).
4. **Fill integration tests** (TODO-051) once a Postgres is available, then E2E (TODO-052).
5. **Managed prod infra**: managed PG, RLS, backups/PITR, staging/prod, Sentry DSN.
6. **Billing/entitlements** (TODO-049) to monetize.

These convert the now-functional product into a fully automated, deployable, monitored system.
