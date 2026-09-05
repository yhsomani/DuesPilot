import { describe, expect, it } from "vitest";
import {
  interpolateTemplate,
  getTemplateById,
  DEFAULT_TEMPLATES,
  TEMPLATE_VARIABLES,
} from "@/lib/templates";

describe("interpolateTemplate", () => {
  it("interpolates multiple variables correctly", () => {
    const template = "Hello {{customerName}}, your invoice {{invoiceNumber}} of {{amount}} is due on {{dueDate}}.";
    const vars = {
      customerName: "Acme Corp",
      invoiceNumber: "INV-001",
      amount: "₹50,000",
      dueDate: "15 Oct 2026",
    };
    const rendered = interpolateTemplate(template, vars);
    expect(rendered).toBe("Hello Acme Corp, your invoice INV-001 of ₹50,000 is due on 15 Oct 2026.");
  });

  it("handles whitespace inside brackets", () => {
    const template = "Reminder: {{ customerName }} - Amount: {{  amount  }}";
    const vars = {
      customerName: "Bharat Tech",
      amount: 12500,
    };
    const rendered = interpolateTemplate(template, vars);
    expect(rendered).toBe("Reminder: Bharat Tech - Amount: 12500");
  });

  it("falls back to [key] when variable is missing or null", () => {
    const template = "Invoice {{invoiceNumber}} for {{missingVar}} has balance {{nullVar}}.";
    const vars = {
      invoiceNumber: "INV-999",
      nullVar: null,
    };
    const rendered = interpolateTemplate(template, vars);
    expect(rendered).toBe("Invoice INV-999 for [missingVar] has balance [nullVar].");
  });

  it("returns empty string if template text is empty", () => {
    expect(interpolateTemplate("", {})).toBe("");
  });
});

describe("DEFAULT_TEMPLATES", () => {
  it("contains all critical collection template categories", () => {
    const categories = DEFAULT_TEMPLATES.map((t) => t.category);
    expect(categories).toContain("reminder");
    expect(categories).toContain("overdue");
    expect(categories).toContain("demand");
    expect(categories).toContain("promise");
    expect(categories).toContain("receipt");
    expect(categories).toContain("dispute");
  });

  it("retrieves template by ID", () => {
    const t = getTemplateById("payment-reminder");
    expect(t).toBeDefined();
    expect(t?.name).toBe("Upcoming Payment Reminder");
    expect(t?.channel).toBe("EMAIL");
  });

  it("returns null for non-existent template ID", () => {
    expect(getTemplateById("non-existent-id")).toBeNull();
  });

  it("all templates have valid subjects, bodies, and required tags", () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.description).toBeTruthy();
      // Test template rendering with dummy data
      const renderedSubject = interpolateTemplate(t.subject, {
        invoiceNumber: "INV-01",
        dueDate: "2026-09-10",
        companyName: "DuesPilot Corp",
        daysOverdue: 5,
      });
      expect(renderedSubject).not.toContain("{{");
    }
  });
});

describe("TEMPLATE_VARIABLES", () => {
  it("has non-empty variable list with keys, labels, and examples", () => {
    expect(TEMPLATE_VARIABLES.length).toBeGreaterThan(5);
    for (const v of TEMPLATE_VARIABLES) {
      expect(v.key).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.example).toBeTruthy();
    }
  });
});
