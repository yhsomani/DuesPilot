import { describe, it, expect } from "vitest";
import {
  calculateMsmePenalInterest,
  calculateCustomerMsmeClaim,
  DEFAULT_RBI_BANK_RATE,
  STATUTORY_MULTIPLIER,
} from "../msme-interest";

describe("MSME Statutory Penal Interest Engine (Sections 15 & 16)", () => {
  describe("calculateMsmePenalInterest", () => {
    it("returns 0 penal interest if the invoice is not yet overdue", () => {
      const result = calculateMsmePenalInterest({
        invoiceAmount: 100000,
        dueDate: "2026-10-01",
        settlementDate: "2026-09-01",
      });

      expect(result.overdueDays).toBe(0);
      expect(result.penalInterestAmount).toBe(0);
      expect(result.totalClaimAmount).toBe(100000);
      expect(result.statutoryAnnualRate).toBe(DEFAULT_RBI_BANK_RATE * STATUTORY_MULTIPLIER);
      expect(result.monthlyRests).toHaveLength(0);
    });

    it("calculates 3x RBI bank rate compound interest for overdue periods", () => {
      // 100,000 INR overdue by 2 full months
      const result = calculateMsmePenalInterest({
        invoiceAmount: 100000,
        dueDate: "2026-06-01",
        settlementDate: "2026-08-01",
        rbiBankRate: 6.75, // 20.25% p.a. -> 1.6875% per month
      });

      expect(result.overdueDays).toBeGreaterThan(58);
      expect(result.statutoryAnnualRate).toBe(20.25);
      expect(result.monthlyRests.length).toBeGreaterThanOrEqual(2);
      expect(result.penalInterestAmount).toBeGreaterThan(3300);
      expect(result.totalClaimAmount).toBe(100000 + result.penalInterestAmount);
    });

    it("throws error for zero or negative invoice amount", () => {
      expect(() =>
        calculateMsmePenalInterest({
          invoiceAmount: 0,
          dueDate: "2026-01-01",
        })
      ).toThrow("Invoice amount must be greater than zero");
    });
  });

  describe("calculateCustomerMsmeClaim", () => {
    it("aggregates multiple overdue invoices with their statutory interest", () => {
      const invoices = [
        {
          id: "inv-1",
          invoiceNumber: "INV-101",
          amount: 50000,
          outstandingAmount: 50000,
          dueDate: "2026-05-01",
        },
        {
          id: "inv-2",
          invoiceNumber: "INV-102",
          amount: 100000,
          outstandingAmount: 80000,
          dueDate: "2026-07-01",
        },
      ];

      const claim = calculateCustomerMsmeClaim(invoices, 6.75, new Date("2026-09-01"));

      expect(claim.totalPrincipal).toBe(150000);
      expect(claim.totalOutstanding).toBe(130000);
      expect(claim.totalPenalInterest).toBeGreaterThan(0);
      expect(claim.totalStatutoryClaim).toBe(claim.totalOutstanding + claim.totalPenalInterest);
      expect(claim.invoices).toHaveLength(2);
      expect(claim.invoices[0].invoiceNumber).toBe("INV-101");
    });
  });
});
