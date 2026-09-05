import { describe, expect, it } from "vitest";
import {
  sanitizeCsvValue,
  generateSanitizedCsv,
  validatePasswordComplexity,
} from "@/lib/security";

describe("sanitizeCsvValue (CWE-1236 Mitigation)", () => {
  it("prepends single quote to formula injection triggers", () => {
    expect(sanitizeCsvValue("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(sanitizeCsvValue("+12345")).toBe("'+12345");
    expect(sanitizeCsvValue("-SUM(A1:A10)")).toBe("'-SUM(A1:A10)");
    expect(sanitizeCsvValue("@HYPERLINK('http://evil.com')")).toBe("'@HYPERLINK('http://evil.com')");
    expect(sanitizeCsvValue("\tTabPrepend")).toBe("'\tTabPrepend");
    expect(sanitizeCsvValue("\rCarriagePrepend")).toBe(`"'\rCarriagePrepend"`);
  });

  it("leaves standard safe values unaltered", () => {
    expect(sanitizeCsvValue("Acme Enterprises")).toBe("Acme Enterprises");
    expect(sanitizeCsvValue(25000)).toBe("25000");
    expect(sanitizeCsvValue("")).toBe("");
    expect(sanitizeCsvValue(null)).toBe("");
    expect(sanitizeCsvValue(undefined)).toBe("");
  });

  it("escapes internal quotes and wraps commas in double quotes", () => {
    expect(sanitizeCsvValue('Acme "Super" Logistics')).toBe('"Acme ""Super"" Logistics"');
    expect(sanitizeCsvValue("Acme, Logistics")).toBe('"Acme, Logistics"');
    expect(sanitizeCsvValue("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });
});

describe("generateSanitizedCsv", () => {
  it("generates correctly formatted, sanitized CSV content", () => {
    const columns = [
      { key: "name", label: "Customer Name" },
      { key: "amount", label: "Amount" },
      { key: "notes", label: "Notes" },
    ];

    const data = [
      { name: "Acme Corp", amount: 5000, notes: "Regular buyer" },
      { name: "=HYPERLINK()", amount: 100, notes: "Contains, comma" },
    ];

    const csv = generateSanitizedCsv(columns, data);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Customer Name,Amount,Notes");
    expect(lines[1]).toBe("Acme Corp,5000,Regular buyer");
    expect(lines[2]).toBe(`'=HYPERLINK(),100,"Contains, comma"`);
  });
});

describe("validatePasswordComplexity", () => {
  it("rejects passwords under 8 characters", () => {
    const res = validatePasswordComplexity("Ab1!");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("at least 8 characters");
  });

  it("rejects passwords missing uppercase", () => {
    const res = validatePasswordComplexity("lowercase123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("uppercase");
  });

  it("rejects passwords missing lowercase", () => {
    const res = validatePasswordComplexity("UPPERCASE123");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("lowercase");
  });

  it("rejects passwords missing numbers", () => {
    const res = validatePasswordComplexity("PasswordWithoutNumber");
    expect(res.valid).toBe(false);
    expect(res.message).toContain("numeric digit");
  });

  it("accepts strong valid passwords", () => {
    const res = validatePasswordComplexity("SecurePass123!");
    expect(res.valid).toBe(true);
    expect(res.message).toBeUndefined();
  });
});
