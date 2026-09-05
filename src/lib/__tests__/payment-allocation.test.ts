import { describe, expect, it } from "vitest";
import { allocatePayment, nextInvoiceStatus } from "@/lib/payment-allocation";

const inv = (id: string, outstanding: number, amount = outstanding) => ({
  id,
  amount,
  outstandingAmount: outstanding,
});

describe("allocatePayment (FIFO)", () => {
  it("allocates across invoices oldest-first until exhausted", () => {
    const rows = [inv("A", 100), inv("B", 50), inv("C", 30)];
    const r = allocatePayment(120, rows);
    expect(r.entries).toEqual([
      { invoiceId: "A", amount: 100 },
      { invoiceId: "B", amount: 20 },
    ]);
    expect(r.allocatedTotal).toBe(120);
    expect(r.status).toBe("fully_allocated");
  });

  it("marks overpayment as partially_allocated", () => {
    const rows = [inv("A", 100)];
    const r = allocatePayment(150, rows);
    expect(r.entries).toEqual([{ invoiceId: "A", amount: 100 }]);
    expect(r.allocatedTotal).toBe(100);
    expect(r.status).toBe("partially_allocated");
  });

  it("returns unmatched when no invoices have outstanding", () => {
    const r = allocatePayment(100, []);
    expect(r.entries).toEqual([]);
    expect(r.allocatedTotal).toBe(0);
    expect(r.status).toBe("unmatched");
  });

  it("honours explicit allocations, clamping to outstanding and remaining", () => {
    const rows = [inv("A", 100), inv("B", 50)];
    const r = allocatePayment(60, rows, [
      { invoiceId: "B", amount: 500 }, // clamp to outstanding 50
      { invoiceId: "A", amount: 0 },
      { invoiceId: "A", amount: 100 }, // only 10 left
    ]);
    expect(r.entries).toEqual([
      { invoiceId: "B", amount: 50 },
      { invoiceId: "A", amount: 10 },
    ]);
    expect(r.allocatedTotal).toBe(60);
    expect(r.status).toBe("fully_allocated");
  });

  it("skips unknown invoice ids in explicit allocations", () => {
    const r = allocatePayment(50, [inv("A", 30)], [
      { invoiceId: "NOPE", amount: 50 },
      { invoiceId: "A", amount: 20 },
    ]);
    expect(r.entries).toEqual([{ invoiceId: "A", amount: 20 }]);
    expect(r.status).toBe("partially_allocated");
  });

  it("ignores negative explicit amounts", () => {
    const rows = [inv("A", 100)];
    const r = allocatePayment(50, rows, [{ invoiceId: "A", amount: -10 }]);
    expect(r.entries).toEqual([]);
    expect(r.status).toBe("unmatched");
  });
});

describe("nextInvoiceStatus", () => {
  it("marks fully paid as PAID", () => {
    expect(nextInvoiceStatus("OPEN", 0, 100)).toBe("PAID");
  });
  it("marks partial as PARTIALLY_PAID", () => {
    expect(nextInvoiceStatus("OPEN", 40, 100)).toBe("PARTIALLY_PAID");
  });
  it("keeps OPEN when unchanged", () => {
    expect(nextInvoiceStatus("OPEN", 100, 100)).toBe("OPEN");
  });
  it("does not change DISPUTED/CANCELLED/DRAFT", () => {
    expect(nextInvoiceStatus("DISPUTED", 0, 100)).toBe("DISPUTED");
    expect(nextInvoiceStatus("CANCELLED", 0, 100)).toBe("CANCELLED");
    expect(nextInvoiceStatus("DRAFT", 90, 100)).toBe("DRAFT");
  });
});