# BRD — DuesPilot Collections Operating System

| Attribute | Value |
| --- | --- |
| **Document name** | Business Requirements Document |
| **Project name** | DuesPilot |
| **Version** | 1.0.0 |
| **Analysis date** | 2026-09-04 |
| **Status** | DRAFT — reflects current codebase (commit `d037888`) |
| **Source of truth** | Repository + marketing copy in `src/app/page.tsx`; schema in `prisma/schema.prisma` |
| **Related artifacts** | `PRD.md`, `REQUIREMENT_TRACEABILITY_MATRIX.md`, `FEATURE_STATUS_MATRIX.md`, `PAGE_COMPONENT_INVENTORY.md`, `PRODUCTION_READINESS_CHECKLIST.md`, `CREDENTIALS_AND_INTEGRATIONS_MATRIX.md`, `GAP_REGISTER.md` |

> Evidence labels: **CODEBASE-VERIFIED** / **DOCUMENTED-ONLY** / **PROPOSED** / **UNVERIFIED** / **AMBIGUOUS**.

---

## 1. Business Context

### 1.1 Problem
Indian B2B SMEs routinely face delayed invoice payments, absorbing working-capital pressure and risking legal escalation. Collections are typically tracked in aging spreadsheets, chased manually, without record of prior interactions.

**CODEBASE-VERIFIED problem framing (landing copy, `src/app/page.tsx`):**
> "Too many businesses lose money to slow payers. You chase invoices manually, hoping for the best."
> "You'll never build a dependable collections pipeline with an aging spreadsheet."

### 1.2 Opportunity
DuesPilot positions itself as an automated Collections Operating System that converts receivables into a prioritized, daily, low-friction collection routine, replacing manual chasing with guided, automated follow-up.

---

## 2. Market Context (as asserted on landing page)

**DOCUMENTED-ONLY (marketing numbers; must be re-validated before use in external materials):**
- ₹55,244 Cr total MSME delayed-payment claims received on MSME Samadhaan.
- 2,56,892 delayed-payment applications filed.
- 9.45 Cr Udyam registrations.
- Claimed savings: "Save 30+ hours a month" per user; "Get paid 22 days faster" on average.

**Evidence note:** These are landing-page assertions (**UNVERIFIED**; no cited source, no internal computation). Re-validate before public claims.

### 2.3 Target segment
Indian B2B SMEs selling on credit: distributors, manufacturers, service providers, traders. **AMBIGUOUS** — no explicit ICP document; derived from landing language ("B2B", Udyam/MSME framing).

---

## 3. Business Objectives

| Objective ID | Objective | Metric (proposed) | Current Evidence |
| --- | --- | --- | --- |
| OBJ-1 | Reduce DSO for SME users | % reduction in average DSO | **Not achievable yet** — no data pipeline |
| OBJ-2 | Reduce manual collections effort | hours saved/month | Not measurable — no automation |
| OBJ-3 | Increase on-time / recovered payment rate | collection effectiveness index (CEI) | Not measurable |
| OBJ-4 | Product adoption / activation | signups→imported invoices→first queue action | No analytics SDK, no activation instrumentation |
| OBJ-5 | Monetization | MRR from Starter/Growth/Pro tiers | **No billing implemented** |

**Verdict:** All business objectives are PROPOSED targets. The current build cannot yet demonstrate any of them because none of the required data flows exist.

---

## 4. Value Proposition

**CODEBASE-VERIFIED (marketing):**
> "Turn your receivables into a coordinated daily operation."
Import → Prioritize → Automate → Track → Pay → Analyze.

**Current realized value:** Only the *vision* is realized (UI). A registrant today gets a real account and session, then is shown **mock data** — they cannot see their own receivables, cannot trigger a follow-up, cannot get paid. **The core value loop is not yet implemented.**

---

## 5. Success Metrics (KPIs)

Proposed North-Star and guardrail metrics (all require future instrumentation):
- **North-Star:** Number of weekly collection actions completed → dollars recovered.
- Activation: % of signups who import ≥1 receivable and complete ≥1 queue action.
- Engagement: DAU/WAU among collectors; sessions per week; queue completion rate.
- Outcome: CEI, DSO trend, promise-to-payment conversion.
- Retention: 30/90-day cohort retention; churn reasons.
- Revenue: MRR/ARR, ARPU, upgrade rate, CAC : LTV.

**None of these are currently tracked** — no analytics or event instrumentation in code.

---

## 6. Stakeholders

| Stakeholder | Interest | Notes / AMBIGUITY |
| --- | --- | --- |
| Business owner (SME) | Fast cash recovery, low effort | Buyer & champion |
| Finance manager | Accurate reconciliation, aging visibility | Power user |
| Collector | Daily prioritized action list | Primary daily user |
| Sales | Credit decisions, customer context | Read-mostly |
| Investor/founder | Growth to revenue | Needs activation + retention mechanics |
| Regulator/legal | Consumer/credit-law compliance | India-specific; **not addressed** |

---

## 7. Existing Business Rules & Policies (implemented)

| Rule ID | Rule | Enforcement | Status |
| --- | --- | --- | --- |
| BR-01 | Register: name≥2, valid email, password≥8, company≥2 | zod client+server | **Implemented** (`register/route.ts:6`, `register/page.tsx:8`) |
| BR-02 | Email unique per account | Schema `User.email @unique`; 409 on duplicate | **Implemented** |
| BR-03 | Passwords stored hashed (bcrypt, cost 12) | `register/route.ts:35` | **Implemented** |
| BR-04 | New signup role = OWNER | `register/route.ts:46` | **Implemented** |
| BR-05 | Authenticated users reach dashboard; others redirect to login | `proxy.ts` cookie check | **Implemented** (cookie-presence only) |
| BR-06 | Invoice `invoiceNumber` unique per org | Schema `@@unique([organizationId, invoiceNumber])` | **Schema only** (no write path) |
| BR-07 | Payment allocation to invoices (numerator/denominator) | `PaymentAllocation` model | **Schema only** |
| BR-08 | Minimum/maximum password complexity, lockout, session expiry | — | **AMBIGUOUS** — not defined; business must specify |
| BR-09 | Free-trial duration & pricing enforcement | — | **Not defined**; pricing is marketing-only |
| BR-10 | Data retention, deletion timelines | — | **Not defined** |
| BR-11 | SLA on automated follow-up cadence | — | **Not defined** |
| BR-12 | Grace period / Dunning schedules per segment | — | **Not defined** |
| BR-13 | Interest/late-fee policy (India: e.g., MPCB/interest under MSME) | — | **Not defined** (legal input required) |

---

## 8. Functional Requirements (business narrative)

> Full ID-level traceability in `REQUIREMENT_TRACEABILITY_MATRIX.md`. These are the business-level statements; status given.

1. Browser-based system usable by non-technical SME staff (**IMPLEMENTED for UI, backend pending**).
2. Company-based multi-tenant accounts (**backend partial: org created at registration; no tenant-scoped data reads**).
3. User roles controlling feature access (**NOT IMPLEMENTED** — needs role permissions matrix as a business decision).
4. Import receivables from CSV/Excel/Tally/ERP (**IMPORT is UI-only; Excel/Tally not wired**).
5. Automatic daily prioritization of accounts (**NOT IMPLEMENTED**).
6. Automated communication: email, WhatsApp, SMS (**NOT IMPLEMENTED** — no providers).
7. Track promise-to-pay and flag broken promises (**NOT IMPLEMENTED** in backend; UI mock only).
8. Record & reconcile payments (**NOT IMPLEMENTED**).
9. Handle disputes with categories & workflows (**NOT IMPLEMENTED**).
10. Interactive analytics & reporting (**UI mock only**).
11. Audit trail of every collection action (**schema only, not written**).
12. Data export & account deletion (GDPR/DPDP-analogous) (**NOT IMPLEMENTED**).
13. Email/WhatsApp delivery status & read receipts (**NOT IMPLEMENTED**).
14. Configurable collection workflows/cadence (**schema only**).
15. Alerting/escalation to owner on high-risk accounts (**NOT IMPLEMENTED**).

---

## 9. Non-Functional Requirements (business level)

| NFR Area | Requirement |
| --- | --- |
| Availability | 99.9% during business hours (proposed) |
| Performance | Dashboard <2s; actions <1s (proposed) |
| Security | bcrypt password hashing (**implemented**); RBAC + RLS (**to build**); secrets not in repo (**implemented — `.env` ignored**) |
| Compliance | India compliance (GST-invoice context, DPDP 2023, MSME interest) — **legal counsel required** |
| Usability | Mobile + desktop; guided onboarding (**partial**); Gmail/WhatsApp-muscle-memory UX |
| Reliability | Idempotent import; guard against duplicate sends, double payments |
| Auditability | Tamper-evident audit log for legal/collections disputes |

---

## 10. Proposed Business Roles & Permissions Matrix

> **AMBIGUOUS — BUSINESS DECISION REQUIRED.** The schema defines six roles but grants no permissions. The following is a *proposal* to confirm/refine; nothing here is implemented.

| Capability | OWNER | ADMIN | FIN_MGR | COLLECTOR | SALES | VIEWER |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| View dashboard/queue | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Work queue actions (call/remind) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Import receivables | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Record payment/promise | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Modify invoices/customers | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Approve escalations/waivers | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage integrations/settings/billing | ✓ | ✓(part) | ✗ | ✗ | ✗ | ✗ |
| View analytics | ✓ | ✓ | ✓ | ✓ | ✗ | partial |
| Manage users/invites | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit log access | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 11. Legal & Regulatory Considerations (PROPOSED — to validate with counsel)

- **MSME delayed-payment interest** (MSMED Act): reference in automated dunning copy must be legally vetted.
- **DPDP Act 2023** (India): personal-data handling of customer contacts; consent; data minimization.
- **WhatsApp Business API** policy compliance (template messages; opt-in).
- **Payment data**: any payment-link or gateway usage requires PCI-DSS vetted provider (avoid storing raw card data — schema has none).
- **Telecom/unsolicited communication**: SMS/DND compliance for marketing vs. transactional messaging.
- **Consumer protection / fair-debt** practices if extended beyond B2B.

**No legal review exists in the repo. UNVERIFIED / PROPOSED.**

---

## 12. Pricing (marketing-only; NOT operational)

From landing page (`page.tsx` pricing section):

| Plan | Price/mo (₹) | Positioning |
| --- | --- | --- |
| Starter | 999 | Entry |
| Growth | 2,499 | Middle |
| Pro | 5,999 | Advanced |

**No billing model, plan gating, subscriptions, or payment provider is implemented.** Monetization is `PROPOSED`/undelivered. Whether to implement Stripe/Razorpay, and plan entitlement mapping, is an **AMBIGUOUS business decision**.

---

## 13. Go-To-Market & Onboarding

**Proposed funnel (from landing journey):**
Landing → value props → pricing → belief builder → CTA ("Start free trial" / "Get Started" / "Import my receivables") → `/register` → `/login` → `/dashboard`.

**Current funnel reality:** The CTAs all route to `/register` (fixed and verified). After registration and login, the user lands on a **mock dashboard** with no real data, and import never persists. **The activation loop is broken.**

---

## 14. Business Risks

| Risk | Severity | Current Mitigation | Gap |
| --- | --- | --- | --- |
| Core value unproven (no real data flow) | High | — | Must wire data before value promise |
| No tests/CI → regressions | High | — | Shoulder added test suite + pipeline |
| External integrations absent | High | — | Blocks automation value prop |
| Open registration abuse/brute force | Medium | public endpoint | Add rate limiting + abuse control |
| No RBAC/RLS → data leaks across orgs | High | — | Must build before multi-user launch |
| Weak default NEXTAUTH_SECRET | Medium | `.env` ignored | Rotate for production **UNVERIFIED** |
| Compliance (DPDP/msme/WhatsApp) | Medium-High | — | Counsel review required |
| Competing on price vs. established CRMs | Medium | — | Need ICP differentiation; **AMBIGUOUS** |
| Scope creep (16 features, all partial) | Medium | — | Prioritize minimal lovable loop |

---

## 15. Business Decision Log (items requiring a human decision)

| # | Decision | Options | Impact | Status |
| --- | --- | --- | --- | --- |
| D1 | Which roles get which permissions? | Confirm/refine §10 matrix | RBAC build | **OPEN** |
| D2 | Free-trial length & paywall point? | e.g., 14-day trial vs. freemium | Activation/monetization | **OPEN** |
| D3 | Which providers first (email, WhatsApp, SMS, payments, AI)? | Prioritize | Automation milestone | **OPEN** |
| D4 | What is the minimal lovable loop to launch? | e.g., Import→Queue→Manual reminder→Promise→Payment | Roadmap | **OPEN** |
| D5 | Password/security policy specifics | length/complexity/lockout | BR-08 | **OPEN** |
| D6 | Data retention/deletion policy | durations | BR-10/compliance | **OPEN** |
| D7 | Language/localization scope | EN-only vs. regional | NFR/i18n | **OPEN** |
| D8 | Legal/compliance scope & counsel | which regions | §11 | **OPEN** |

---

## 16. Prioritization Recommendation (proposed MVP slice)

To make DuesPilot deliver its promise, focus on the **Minimal Lovable Loop** before adding features:
1. **Persist import** (IMP-004) — turn mock → real receivables.
2. **Real queue** from DB with priority scoring (QUEUE-001/003).
3. **Manual actions logged** (call/email/WhatsApp reminder) that write `CollectionEvent` + `Message` + `AuditLog`.
4. **Promise recording** (PROM-003) and status transitions (`PromiseToPay`).
5. **Payment recording + allocation** (PAY-002/003).
6. Then a **single communication provider** (email first — lowest friction) to make follow-ups real.
7. Then RBAC/RLS + tests + CI before multi-user production.

This converts 15 mock screens into a defensible, demonstrable product while keeping scope bounded.
