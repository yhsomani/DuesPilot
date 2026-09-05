export interface AllocatableInvoice {
  id: string;
  amount: number;
  outstandingAmount: number;
}

export interface AllocationEntry {
  invoiceId: string;
  amount: number;
}

export type AllocationStatus =
  | "unmatched"
  | "fully_allocated"
  | "partially_allocated";

export interface AllocationResult {
  entries: AllocationEntry[];
  allocatedTotal: number;
  status: AllocationStatus;
}

/**
 * Pure FIFO payment allocation: invoices are already ordered oldest-due-first
 * by the caller; a payment pays down outstanding balances in that order
 * (extra is left unallocated rather than overpaying any invoice).
 */
export function allocatePayment(
  amount: number,
  invoiceRows: AllocatableInvoice[],
  explicit?: AllocationEntry[] | null
): AllocationResult {
  const entries: AllocationEntry[] = [];

  if (explicit && explicit.length > 0) {
    let remaining = amount;
    for (const a of explicit) {
      if (remaining <= 0) break;
      const inv = invoiceRows.find((i) => i.id === a.invoiceId);
      if (!inv) continue;
      const alloc = Math.min(
        inv.outstandingAmount,
        Math.max(0, Number(a.amount)),
        remaining
      );
      if (alloc <= 0) continue;
      entries.push({ invoiceId: inv.id, amount: alloc });
      remaining -= alloc;
    }
  } else {
    let remaining = amount;
    for (const inv of invoiceRows) {
      if (remaining <= 0) break;
      const alloc = Math.min(inv.outstandingAmount, remaining);
      entries.push({ invoiceId: inv.id, amount: alloc });
      remaining -= alloc;
    }
  }

  const allocatedTotal = entries.reduce((s, a) => s + a.amount, 0);
  const status: AllocationStatus =
    allocatedTotal <= 0
      ? "unmatched"
      : allocatedTotal >= amount
      ? "fully_allocated"
      : "partially_allocated";

  return { entries, allocatedTotal, status };
}

/**
 * Pure invoice status transition after a payment reduces outstanding.
 * DISPUTED/CANCELLED/DRAFT never change from allocation alone.
 */
export function nextInvoiceStatus(
  stored: string,
  newOutstanding: number,
  amount: number
): string {
  if (
    stored === "DISPUTED" ||
    stored === "CANCELLED" ||
    stored === "DRAFT"
  ) {
    return stored;
  }
  if (newOutstanding <= 0) return "PAID";
  if (newOutstanding < amount) return "PARTIALLY_PAID";
  return "OPEN";
}