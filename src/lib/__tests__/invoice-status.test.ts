import { describe, expect, it } from "vitest";
import { invoiceStatusMeta } from "@/lib/invoice-status";

const inPast = (days: number) => new Date(Date.now() - days * 864e5);
const inFuture = (days: number) => new Date(Date.now() + days * 864e5);

describe("invoiceStatusMeta", () => {
  it("keeps fixed stored statuses unchanged", () => {
    for (const status of ["PAID", "DRAFT", "DISPUTED", "CANCELLED"]) {
      const meta = invoiceStatusMeta({
        status,
        amount: 1000,
        outstandingAmount: 1000,
        dueDate: inPast(5),
      });
      expect(meta.view).toBe(status);
    }
  });

  it("derives PAID from zero outstanding even if stored OPEN", () => {
    const meta = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 0,
      dueDate: inPast(5),
    });
    expect(meta.view).toBe("PAID");
    expect(meta.isOverdue).toBe(false);
  });

  it("derives OVERDUE from the due date regardless of stored value", () => {
    const meta = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 1000,
      dueDate: inPast(9),
    });
    expect(meta.view).toBe("OVERDUE");
    expect(meta.isOverdue).toBe(true);
    expect(meta.daysOverdue).toBe(9);
  });

  it("shows PARTIALLY_PAID only inside the due window", () => {
    const meta = invoiceStatusMeta({
      status: "PARTIALLY_PAID",
      amount: 1000,
      outstandingAmount: 400,
      dueDate: inFuture(10),
    });
    expect(meta.view).toBe("PARTIALLY_PAID");
    expect(meta.isOverdue).toBe(false);
  });

  it("shows an overdue partial as OVERDUE", () => {
    const meta = invoiceStatusMeta({
      status: "PARTIALLY_PAID",
      amount: 1000,
      outstandingAmount: 400,
      dueDate: inPast(5),
    });
    expect(meta.view).toBe("OVERDUE");
    expect(meta.isOverdue).toBe(true);
  });

  it("shows DUE_SOON within 7 days", () => {
    const meta = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 1000,
      dueDate: inFuture(4),
    });
    expect(meta.view).toBe("DUE_SOON");
  });

  it("shows OPEN beyond 7 days", () => {
    const meta = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 1000,
      dueDate: inFuture(20),
    });
    expect(meta.view).toBe("OPEN");
    expect(meta.isOverdue).toBe(false);
  });

  it("reflects invoice due-date changes via a fresh reference date", () => {
    const dueSoon = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 1000,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    expect(dueSoon.view).toBe("DUE_SOON");

    const past = invoiceStatusMeta({
      status: "OPEN",
      amount: 1000,
      outstandingAmount: 1000,
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
    expect(past.view).toBe("OVERDUE");
  });
});