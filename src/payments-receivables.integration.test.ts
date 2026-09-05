import { describe, it, expect, afterAll } from "vitest";
import { importReceivables, getCustomerDetail } from "@/lib/repo";
import {
  createPromise,
  updatePromiseStatus,
  recordPayment,
  allocatePaymentManual,
  reversePayment,
  listPayments,
} from "@/lib/collections";
import { prisma } from "@/lib/prisma";
import { PromiseStatus } from "@/generated/prisma/client";
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

describe("payments: FIFO, manual allocation, promises, reversal (TODO-051)", () => {
  it("reconciles a payment via FIFO, exposes a remainder for manual allocation, auto-keeps promises, and reverses safely", async () => {
    const org = await createTestOrg("payments-spec");
    orgIds.push(org.id);

    const rows = [
      {
        customer: "Ledger Works",
        invoiceNumber: "PAY-A",
        invoiceDate: daysFromNowISO(-60),
        dueDate: daysFromNowISO(-30),
        amount: "3000",
        outstanding: "",
        email: "",
        phone: "",
      },
      {
        customer: "Ledger Works",
        invoiceNumber: "PAY-B",
        invoiceDate: daysFromNowISO(-40),
        dueDate: daysFromNowISO(-10),
        amount: "2000",
        outstanding: "",
        email: "",
        phone: "",
      },
      {
        customer: "Ledger Works",
        invoiceNumber: "PAY-C",
        invoiceDate: daysFromNowISO(-5),
        dueDate: daysFromNowISO(10),
        amount: "5000",
        outstanding: "",
        email: "",
        phone: "",
      },
    ];
    await importReceivables(org.id, rows, MAPPING);

    const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
    const invoiceA = await prisma.invoice.findFirst({
      where: { organizationId: org.id, invoiceNumber: "PAY-A" },
    });
    const invoiceB = await prisma.invoice.findFirst({
      where: { organizationId: org.id, invoiceNumber: "PAY-B" },
    });
    const invoiceC = await prisma.invoice.findFirst({
      where: { organizationId: org.id, invoiceNumber: "PAY-C" },
    });
    expect(customer && invoiceA && invoiceB && invoiceC).toBeTruthy();

    // Promise on the newest invoice, then renegotiate date+amount.
    const promise = await createPromise(org.id, null, {
      customerId: customer!.id,
      invoiceId: invoiceC!.id,
      amount: 5000,
      promiseDate: daysFromNowISO(10),
    });
    expect(promise.status).toBe("ACTIVE");

    const renegotiated = await updatePromiseStatus(org.id, null, promise.id, {
      status: "RENEGOTIATED",
      amount: 3000,
      promiseDate: daysFromNowISO(60),
    });
    expect(renegotiated.status).toBe("RENEGOTIATED");
    expect(renegotiated.amount).toBe(3000);
    expect(renegotiated.promiseDate).toBe(daysFromNowISO(60));

    const invoiceCAfter = await prisma.invoice.findUnique({ where: { id: invoiceC!.id } });
    expect(invoiceCAfter!.status).toBe("PROMISED");

    // Partial payment, FIFO wins oldest due date (PAY-A first).
    const partial = await recordPayment(org.id, null, {
      customerId: customer!.id,
      amount: 2500,
      paymentDate: daysFromNowISO(-1),
      reference: "C1-PMT-1",
      mode: "bank",
    });
    expect(partial.payment.allocations).toEqual([
      expect.objectContaining({ invoiceNumber: "PAY-A", amount: 2500 }),
    ]);
    expect(partial.payment.status).toBe("partially_allocated");

    const invoiceAAfter = await prisma.invoice.findUnique({ where: { id: invoiceA!.id } });
    expect(invoiceAAfter!.outstandingAmount).toBe(500);
    expect(invoiceAAfter!.status).toBe("PARTIALLY_PAID");

    // Manual allocation of the remainder.
    const allocated = await allocatePaymentManual(org.id, null, partial.payment.id, [
      { invoiceId: invoiceA!.id, amount: 500 },
    ]);
    expect(allocated.allocatedTotal).toBe(500);
    expect(allocated.payment.status).toBe("fully_allocated");
    expect(allocated.payment.allocations).toHaveLength(2);

    // Second payment clears PAY-B and accumulates enough to keep the promise (3000).
    const second = await recordPayment(org.id, null, {
      customerId: customer!.id,
      amount: 2000,
      paymentDate: daysFromNowISO(-1),
      reference: "C1-PMT-2",
      mode: "bank",
    });
    expect(second.keptPromises).toBe(1);
    const promiseAfter = await prisma.promiseToPay.findUnique({ where: { id: promise.id } });
    expect(promiseAfter!.status).toBe(PromiseStatus.KEPT);

    const invoiceBAfter = await prisma.invoice.findUnique({ where: { id: invoiceB!.id } });
    expect(invoiceBAfter!.status).toBe("PAID");
    expect(invoiceBAfter!.outstandingAmount).toBe(0);

    // A third payment partially covers PAY-C, then is reversed.
    const third = await recordPayment(org.id, null, {
      customerId: customer!.id,
      amount: 500,
      paymentDate: daysFromNowISO(-1),
      reference: "C1-PMT-3",
      mode: "bank",
    });
    expect(third.payment.allocations).toEqual([
      expect.objectContaining({ invoiceNumber: "PAY-C", amount: 500 }),
    ]);

    await reversePayment(org.id, null, third.payment.id);
    const invoiceCAfterReverse = await prisma.invoice.findUnique({ where: { id: invoiceC!.id } });
    expect(invoiceCAfterReverse!.outstandingAmount).toBe(5000);

    // Duplicate payment guard (same customer, amount, date, reference).
    await expect(
      recordPayment(org.id, null, {
        customerId: customer!.id,
        amount: 2500,
        paymentDate: daysFromNowISO(-1),
        reference: "C1-PMT-1",
        mode: "bank",
      })
    ).rejects.toMatchObject({ name: "BusinessRuleError", status: 409 });

    // Cannot allocate a reversed payment.
    await expect(
      allocatePaymentManual(org.id, null, third.payment.id, [
        { invoiceId: invoiceC!.id, amount: 500 },
      ])
    ).rejects.toMatchObject({ name: "BusinessRuleError", status: 409 });

    // Payment list reflects the reversal.
    const payments = await listPayments(org.id);
    const reversed = payments.find((p) => p.reference === "C1-PMT-3");
    expect(reversed).toBeDefined();
    expect(reversed!.status).toBe("reversed");

    // Customer totals: PAY-A 0, PAY-B 0, PAY-C back to 5000.
    const detail = await getCustomerDetail(org.id, customer!.id);
    expect(detail!.totalOutstanding).toBe(5000);
    expect(detail!.totalOverdue).toBe(0);
  });
});