// Multi-installment payment plan calculation and reconciliation engine.

export type InstallmentFrequency = "weekly" | "biweekly" | "monthly";
export type InstallmentStatus = "PENDING" | "KEPT" | "PARTIALLY_PAID" | "BROKEN";
export type PaymentPlanStatus = "ACTIVE" | "COMPLETED" | "DELINQUENT" | "CANCELLED";

export interface Installment {
  sequence: number;
  dueDate: string; // ISO string YYYY-MM-DD
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  notes?: string;
}

export interface PaymentPlanSchedule {
  totalAmount: number;
  numberOfInstallments: number;
  frequency: InstallmentFrequency;
  startDate: string;
  installments: Installment[];
  status: PaymentPlanStatus;
  totalPaid: number;
  remainingAmount: number;
}

/**
 * Calculates a structured multi-installment schedule from total amount and frequency.
 * Handles rounding so the sum of installments exactly equals totalAmount.
 */
export function generateInstallmentSchedule(
  totalAmount: number,
  numberOfInstallments: number,
  frequency: InstallmentFrequency,
  startDate: Date = new Date()
): Installment[] {
  if (totalAmount <= 0) {
    throw new Error("Total amount must be greater than zero");
  }
  if (numberOfInstallments < 2 || numberOfInstallments > 24) {
    throw new Error("Number of installments must be between 2 and 24");
  }

  const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100;
  const installments: Installment[] = [];
  let accumulated = 0;

  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(startDate.getTime());

    if (frequency === "weekly") {
      dueDate.setDate(dueDate.getDate() + i * 7);
    } else if (frequency === "biweekly") {
      dueDate.setDate(dueDate.getDate() + i * 14);
    } else if (frequency === "monthly") {
      dueDate.setMonth(dueDate.getMonth() + i);
    }

    const isLast = i === numberOfInstallments - 1;
    const amount = isLast
      ? Math.round((totalAmount - accumulated) * 100) / 100
      : baseAmount;

    accumulated += amount;

    installments.push({
      sequence: i + 1,
      dueDate: dueDate.toISOString().split("T")[0],
      amount,
      paidAmount: 0,
      status: "PENDING",
    });
  }

  return installments;
}

/**
 * Evaluates the overall payment plan status based on installments and reference date.
 */
export function evaluatePaymentPlanStatus(
  installments: Installment[],
  referenceDate: Date = new Date()
): PaymentPlanStatus {
  if (installments.length === 0) return "CANCELLED";

  const allKept = installments.every(
    (inst) => inst.status === "KEPT" || inst.paidAmount >= inst.amount
  );
  if (allKept) return "COMPLETED";

  const todayStr = referenceDate.toISOString().split("T")[0];
  const hasBroken = installments.some(
    (inst) => inst.status === "BROKEN" || (inst.dueDate < todayStr && inst.paidAmount < inst.amount)
  );

  if (hasBroken) return "DELINQUENT";
  return "ACTIVE";
}

/**
 * Allocates a payment amount chronologically across pending installments.
 */
export function allocatePaymentToInstallments(
  installments: Installment[],
  paymentAmount: number,
  referenceDate: Date = new Date()
): {
  updatedInstallments: Installment[];
  remainingUnallocated: number;
  planStatus: PaymentPlanStatus;
} {
  if (paymentAmount < 0) {
    throw new Error("Payment amount cannot be negative");
  }

  let remaining = paymentAmount;
  const updated: Installment[] = installments.map((inst) => ({ ...inst }));

  for (const inst of updated) {
    if (remaining <= 0) break;
    const unpaidOnInst = Math.max(0, inst.amount - inst.paidAmount);
    if (unpaidOnInst <= 0) continue;

    const alloc = Math.min(unpaidOnInst, remaining);
    inst.paidAmount = Math.round((inst.paidAmount + alloc) * 100) / 100;
    remaining = Math.round((remaining - alloc) * 100) / 100;

    if (inst.paidAmount >= inst.amount) {
      inst.status = "KEPT";
    } else if (inst.paidAmount > 0) {
      inst.status = "PARTIALLY_PAID";
    }
  }

  const planStatus = evaluatePaymentPlanStatus(updated, referenceDate);

  return {
    updatedInstallments: updated,
    remainingUnallocated: remaining,
    planStatus,
  };
}

/**
 * Formats an installment schedule into a readable summary string.
 */
export function formatInstallmentSummary(installments: Installment[]): string {
  if (installments.length === 0) return "No scheduled installments";

  return installments
    .map(
      (inst) =>
        `#${inst.sequence}: ₹${inst.amount.toLocaleString("en-IN")} on ${inst.dueDate} (${inst.status})`
    )
    .join("; ");
}
