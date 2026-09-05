import { describe, it, expect } from "vitest";
import {
  calculateDaysRelative,
  evaluateInvoiceRuleMatch,
  evaluateAllCadenceRules,
  DEFAULT_CADENCE_RULES,
  WorkflowRule,
  CadenceContextInvoice,
} from "../workflows";

describe("Workflow Cadence Engine (src/lib/workflows.ts)", () => {
  const refDate = new Date("2026-09-05T00:00:00.000Z");

  const baseInvoice: CadenceContextInvoice = {
    id: "inv_123",
    invoiceNumber: "INV-2026-001",
    amount: 50000,
    outstandingAmount: 50000,
    dueDate: "2026-09-04T00:00:00.000Z", // 1 day overdue on 2026-09-05
    status: "OVERDUE",
    customerId: "cust_456",
    customerName: "Acme Corp",
    customerEmail: "finance@acme.com",
    customerPhone: "+919876543210",
    customerRiskScore: 65,
    hasActiveDispute: false,
    hasActivePromise: false,
    lastContactedAt: null,
  };

  it("calculates relative days accurately", () => {
    // 1 day overdue
    expect(calculateDaysRelative("2026-09-04T00:00:00.000Z", refDate)).toBe(1);
    // 15 days overdue
    expect(calculateDaysRelative("2026-08-21T00:00:00.000Z", refDate)).toBe(15);
    // 3 days before due date
    expect(calculateDaysRelative("2026-09-08T00:00:00.000Z", refDate)).toBe(-3);
  });

  it("matches T+1 day overdue rule when invoice is 1 day overdue", () => {
    const rule: WorkflowRule = {
      id: "r1",
      name: "T+1 Rule",
      triggerType: "OVERDUE",
      daysRelative: 1,
      minAmount: 1000,
      channel: "WHATSAPP",
      enabled: true,
    };

    const result = evaluateInvoiceRuleMatch(baseInvoice, rule, refDate);
    expect(result.matches).toBe(true);
  });

  it("matches T-3 days due soon rule when invoice is due in 3 days", () => {
    const dueSoonInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      dueDate: "2026-09-08T00:00:00.000Z", // Due in 3 days
    };

    const rule: WorkflowRule = {
      id: "r_due_3",
      name: "T-3 Rule",
      triggerType: "DUE_SOON",
      daysRelative: -3,
      minAmount: 1000,
      channel: "EMAIL",
      enabled: true,
    };

    const result = evaluateInvoiceRuleMatch(dueSoonInvoice, rule, refDate);
    expect(result.matches).toBe(true);
  });

  it("skips rule when invoice is fully paid", () => {
    const settledInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      outstandingAmount: 0,
    };

    const rule = DEFAULT_CADENCE_RULES[1]; // T+1 rule
    const result = evaluateInvoiceRuleMatch(settledInvoice, rule, refDate);
    expect(result.matches).toBe(false);
    expect(result.reason).toContain("fully settled");
  });

  it("skips rule when invoice has active dispute", () => {
    const disputedInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      hasActiveDispute: true,
    };

    const rule = DEFAULT_CADENCE_RULES[1];
    const result = evaluateInvoiceRuleMatch(disputedInvoice, rule, refDate);
    expect(result.matches).toBe(false);
    expect(result.reason).toContain("dispute");
  });

  it("skips rule when customer has active promise to pay", () => {
    const promisedInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      hasActivePromise: true,
    };

    const rule = DEFAULT_CADENCE_RULES[1];
    const result = evaluateInvoiceRuleMatch(promisedInvoice, rule, refDate);
    expect(result.matches).toBe(false);
    expect(result.reason).toContain("promise to pay");
  });

  it("enforces cooldown period to prevent spamming", () => {
    const recentlyContactedInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      lastContactedAt: new Date("2026-09-04T18:00:00.000Z"), // 6 hours ago
    };

    const rule: WorkflowRule = {
      id: "r1",
      name: "T+1 Rule",
      triggerType: "OVERDUE",
      daysRelative: 1,
      channel: "EMAIL",
      enabled: true,
      cooldownHours: 24,
    };

    const result = evaluateInvoiceRuleMatch(recentlyContactedInvoice, rule, refDate);
    expect(result.matches).toBe(false);
    expect(result.reason).toContain("cooldown");
  });

  it("skips when customer missing channel contact info", () => {
    const noEmailInvoice: CadenceContextInvoice = {
      ...baseInvoice,
      customerEmail: null,
    };

    const rule: WorkflowRule = {
      id: "r1",
      name: "Email Rule",
      triggerType: "OVERDUE",
      daysRelative: 1,
      channel: "EMAIL",
      enabled: true,
    };

    const result = evaluateInvoiceRuleMatch(noEmailInvoice, rule, refDate);
    expect(result.matches).toBe(false);
    expect(result.reason).toContain("email address");
  });

  it("evaluates all candidate invoices against default cadence rules", () => {
    const invoices: CadenceContextInvoice[] = [
      {
        ...baseInvoice,
        id: "inv_1",
        dueDate: "2026-09-04T00:00:00.000Z", // 1 day overdue
      },
      {
        ...baseInvoice,
        id: "inv_2",
        dueDate: "2026-08-21T00:00:00.000Z", // 15 days overdue
      },
      {
        ...baseInvoice,
        id: "inv_3",
        dueDate: "2026-09-08T00:00:00.000Z", // 3 days before due
      },
      {
        ...baseInvoice,
        id: "inv_4",
        dueDate: "2026-09-01T00:00:00.000Z", // 4 days overdue (no matching rule)
      },
    ];

    const matched = evaluateAllCadenceRules(invoices, DEFAULT_CADENCE_RULES, refDate);
    expect(matched.length).toBe(3);
    expect(matched.map((m) => m.invoice.id)).toEqual(["inv_1", "inv_2", "inv_3"]);
  });
});
