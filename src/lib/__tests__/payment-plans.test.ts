import { describe, it, expect } from "vitest";
import {
  generateInstallmentSchedule,
  evaluatePaymentPlanStatus,
  allocatePaymentToInstallments,
  formatInstallmentSummary,
  Installment,
} from "../payment-plans";

describe("Payment Plans Engine", () => {
  describe("generateInstallmentSchedule", () => {
    it("generates equal installments with clean rounding totaling the exact sum", () => {
      const schedule = generateInstallmentSchedule(10000, 3, "monthly", new Date("2026-09-01"));
      expect(schedule).toHaveLength(3);

      const total = schedule.reduce((sum, inst) => sum + inst.amount, 0);
      expect(total).toBe(10000);

      expect(schedule[0].sequence).toBe(1);
      expect(schedule[0].amount).toBe(3333.33);
      expect(schedule[1].amount).toBe(3333.33);
      expect(schedule[2].amount).toBe(3333.34); // remainder adjusted on last installment
      expect(schedule[0].status).toBe("PENDING");
      expect(schedule[0].dueDate).toBe("2026-09-01");
    });

    it("generates weekly schedule dates correctly", () => {
      const schedule = generateInstallmentSchedule(7000, 2, "weekly", new Date("2026-09-01T00:00:00.000Z"));
      expect(schedule).toHaveLength(2);
      expect(schedule[0].dueDate).toBe("2026-09-01");
      expect(schedule[1].dueDate).toBe("2026-09-08");
    });

    it("generates biweekly schedule dates correctly", () => {
      const schedule = generateInstallmentSchedule(14000, 2, "biweekly", new Date("2026-09-01T00:00:00.000Z"));
      expect(schedule).toHaveLength(2);
      expect(schedule[0].dueDate).toBe("2026-09-01");
      expect(schedule[1].dueDate).toBe("2026-09-15");
    });

    it("throws when total amount is zero or negative", () => {
      expect(() => generateInstallmentSchedule(0, 3, "monthly")).toThrow(
        "Total amount must be greater than zero"
      );
      expect(() => generateInstallmentSchedule(-500, 3, "monthly")).toThrow(
        "Total amount must be greater than zero"
      );
    });

    it("throws when installment count is less than 2 or greater than 24", () => {
      expect(() => generateInstallmentSchedule(1000, 1, "monthly")).toThrow(
        "Number of installments must be between 2 and 24"
      );
      expect(() => generateInstallmentSchedule(1000, 25, "monthly")).toThrow(
        "Number of installments must be between 2 and 24"
      );
    });
  });

  describe("evaluatePaymentPlanStatus", () => {
    it("returns COMPLETED when all installments are kept or paid in full", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-09-01", amount: 1000, paidAmount: 1000, status: "KEPT" },
        { sequence: 2, dueDate: "2026-10-01", amount: 1000, paidAmount: 1000, status: "KEPT" },
      ];
      expect(evaluatePaymentPlanStatus(installments, new Date("2026-09-15"))).toBe("COMPLETED");
    });

    it("returns DELINQUENT if an installment has broken status or is past due with unpaid balance", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-08-01", amount: 1000, paidAmount: 0, status: "PENDING" },
        { sequence: 2, dueDate: "2026-10-01", amount: 1000, paidAmount: 0, status: "PENDING" },
      ];
      expect(evaluatePaymentPlanStatus(installments, new Date("2026-09-01"))).toBe("DELINQUENT");
    });

    it("returns ACTIVE when on track without overdue installments", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-09-01", amount: 1000, paidAmount: 1000, status: "KEPT" },
        { sequence: 2, dueDate: "2026-10-01", amount: 1000, paidAmount: 0, status: "PENDING" },
      ];
      expect(evaluatePaymentPlanStatus(installments, new Date("2026-09-15"))).toBe("ACTIVE");
    });

    it("returns CANCELLED if empty installments list", () => {
      expect(evaluatePaymentPlanStatus([])).toBe("CANCELLED");
    });
  });

  describe("allocatePaymentToInstallments", () => {
    it("allocates payment sequentially and marks completed milestones KEPT", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-09-01", amount: 1000, paidAmount: 0, status: "PENDING" },
        { sequence: 2, dueDate: "2026-10-01", amount: 1000, paidAmount: 0, status: "PENDING" },
      ];

      const res = allocatePaymentToInstallments(installments, 1500, new Date("2026-09-05"));
      expect(res.updatedInstallments[0].paidAmount).toBe(1000);
      expect(res.updatedInstallments[0].status).toBe("KEPT");
      expect(res.updatedInstallments[1].paidAmount).toBe(500);
      expect(res.updatedInstallments[1].status).toBe("PARTIALLY_PAID");
      expect(res.remainingUnallocated).toBe(0);
      expect(res.planStatus).toBe("ACTIVE");
    });

    it("handles overpayments by returning unallocated remainder", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-09-01", amount: 1000, paidAmount: 0, status: "PENDING" },
      ];

      const res = allocatePaymentToInstallments(installments, 1200, new Date("2026-09-05"));
      expect(res.updatedInstallments[0].paidAmount).toBe(1000);
      expect(res.updatedInstallments[0].status).toBe("KEPT");
      expect(res.remainingUnallocated).toBe(200);
      expect(res.planStatus).toBe("COMPLETED");
    });

    it("throws on negative payment amounts", () => {
      expect(() => allocatePaymentToInstallments([], -10)).toThrow(
        "Payment amount cannot be negative"
      );
    });
  });

  describe("formatInstallmentSummary", () => {
    it("formats installments into readable semicolon-separated string", () => {
      const installments: Installment[] = [
        { sequence: 1, dueDate: "2026-09-01", amount: 5000, paidAmount: 5000, status: "KEPT" },
        { sequence: 2, dueDate: "2026-10-01", amount: 5000, paidAmount: 0, status: "PENDING" },
      ];
      const summary = formatInstallmentSummary(installments);
      expect(summary).toContain("#1: ₹5,000 on 2026-09-01 (KEPT)");
      expect(summary).toContain("#2: ₹5,000 on 2026-10-01 (PENDING)");
    });

    it("handles empty list gracefully", () => {
      expect(formatInstallmentSummary([])).toBe("No scheduled installments");
    });
  });
});
