import { daysOverdue, daysUntilDue } from "@/lib/dates";

export type InvoiceStatusView =
  | "DRAFT"
  | "OPEN"
  | "DUE_SOON"
  | "OVERDUE"
  | "DISPUTED"
  | "PROMISED"
  | "PROMISE_BROKEN"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export interface InvoiceStatusInput {
  status: string;
  amount: number;
  outstandingAmount: number;
  dueDate: Date;
}

export interface InvoiceStatusMeta {
  view: InvoiceStatusView;
  daysOverdue: number;
  isOverdue: boolean;
}

const FIXED: InvoiceStatusView[] = [
  "PAID",
  "DRAFT",
  "DISPUTED",
  "PROMISED",
  "PROMISE_BROKEN",
  "CANCELLED",
];

/**
 * Effective invoice status. OVERDUE and DUE_SOON are always *derived* from
 * the due date + outstanding amount instead of being stored, so stale stored
 * values can never corrupt the queue or the aging view. PARTIALLY_PAID is
 * shown only when still within the due window (overdue partials read OVERDUE).
 */
export function invoiceStatusMeta(inv: InvoiceStatusInput): InvoiceStatusMeta {
  const daysOver = daysOverdue(inv.dueDate);
  const stored = inv.status.toUpperCase() as InvoiceStatusView;
  let view: InvoiceStatusView;

  if ((FIXED as string[]).includes(stored)) {
    view = stored;
  } else if (inv.outstandingAmount <= 0) {
    view = "PAID";
  } else if (
    stored === "PARTIALLY_PAID" ||
    inv.outstandingAmount < inv.amount
  ) {
    view =
      daysOver > 0
        ? "OVERDUE"
        : stored === "PARTIALLY_PAID"
        ? "PARTIALLY_PAID"
        : "OPEN";
  } else if (daysOver > 0) {
    view = "OVERDUE";
  } else if (daysUntilDue(inv.dueDate) <= 7) {
    view = "DUE_SOON";
  } else {
    view = "OPEN";
  }

  return { view, daysOverdue: daysOver, isOverdue: view === "OVERDUE" };
}