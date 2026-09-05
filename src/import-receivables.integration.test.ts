import { describe, it, expect, afterAll } from "vitest";
import { importReceivables, getCustomerDetail } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import {
  MAPPING,
  daysFromNowISO,
  createTestOrg,
  cleanupOrgs,
} from "@/test-utils/integration-utils";

const orgIds: string[] = [];

afterAll(async () => {
  await cleanupOrgs(orgIds);
});

function invoiceRow(number: string, amount: string, dueDate: string): Record<string, string> {
  return {
    customer: "Acme Traders",
    invoiceNumber: number,
    invoiceDate: daysFromNowISO(-60),
    dueDate,
    amount,
    outstanding: "",
    email: "billing@acme.example",
    phone: "",
  };
}

describe("import: receivables (TODO-051)", () => {
  it("imports valid rows, reports invalid rows, and idempotently skips duplicates", async () => {
    const org = await createTestOrg("import-spec");
    orgIds.push(org.id);

    const rows = [
      invoiceRow("IMP-101", "10000", daysFromNowISO(-20)), // overdue, unpaid
      invoiceRow("IMP-102", "5000", daysFromNowISO(10)), // not yet due
      invoiceRow("IMP-103", "", daysFromNowISO(5)), // invalid: missing amount
      invoiceRow("IMP-101", "10000", daysFromNowISO(-20)), // duplicate in-file
    ];

    const first = await importReceivables(org.id, rows, MAPPING);

    expect(first.customersCreated).toBe(1);
    expect(first.invoicesCreated).toBe(2);
    expect(first.validRows).toBe(2);
    expect(first.skippedRows).toBe(2);
    expect(first.issues).toHaveLength(2);
    expect(first.issues.map((i) => i.reason)).toContainEqual(
      expect.stringContaining("Invalid amount")
    );
    expect(first.issues.map((i) => i.reason)).toContainEqual(
      expect.stringContaining("Duplicate invoice number")
    );
    expect(first.totalAmount).toBe(15000);

    const detail = await getCustomerDetail(org.id, org.id /* placeholder */);
    expect(detail).toBeNull();

    const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
    expect(customer).not.toBeNull();
    const loaded = await getCustomerDetail(org.id, customer!.id);
    expect(loaded!.totalOutstanding).toBe(15000);
    expect(loaded!.totalOverdue).toBe(10000); // only IMP-101 is past due
    expect(loaded!.invoices).toHaveLength(2);
  });

  it("skips invoices that already exist on a second import (natural-key dedupe)", async () => {
    const org = await createTestOrg("import-dedupe");
    orgIds.push(org.id);

    const rows = [
      invoiceRow("IMP-D1", "7000", daysFromNowISO(-5)),
      invoiceRow("IMP-D2", "3000", daysFromNowISO(-5)),
    ];

    const first = await importReceivables(org.id, rows, MAPPING);
    expect(first.invoicesCreated).toBe(2);

    const second = await importReceivables(org.id, rows, MAPPING);
    expect(second.invoicesCreated).toBe(0);
    expect(second.validRows).toBe(0);
    expect(second.skippedRows).toBe(2);
    expect(second.issues.every((i) => i.reason.includes("already exists"))).toBe(true);

    const count = await prisma.invoice.count({ where: { organizationId: org.id } });
    expect(count).toBe(2);
  });

  it("rejects a replayed idempotency key with a 409 BusinessRuleError", async () => {
    const org = await createTestOrg("import-idem");
    orgIds.push(org.id);

    const rows = [invoiceRow("IMP-K1", "4000", daysFromNowISO(-5))];
    const key = "import/receivables/org/test-1";

    const first = await importReceivables(org.id, rows, MAPPING, key);
    expect(first.invoicesCreated).toBe(1);

    await expect(importReceivables(org.id, rows, MAPPING, key)).rejects.toMatchObject({
      name: "BusinessRuleError",
      status: 409,
    });

    const keys = await prisma.idempotencyKey.count({ where: { organizationId: org.id } });
    expect(keys).toBe(1);
  });
});