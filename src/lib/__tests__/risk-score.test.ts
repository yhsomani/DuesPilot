import { describe, expect, it } from "vitest";
import { computeRiskScore } from "@/lib/risk-score";

describe("computeRiskScore", () => {
  it("returns 0 when nothing is outstanding", () => {
    expect(
      computeRiskScore({
        totalOutstanding: 0,
        totalOverdue: 0,
        maxDaysOverdue: 0,
        hasBrokenPromise: false,
        hasHistoricalPayment: true,
      })
    ).toBe(0);
  });

  it("returns 0 for negative outstanding", () => {
    expect(
      computeRiskScore({
        totalOutstanding: -500,
        totalOverdue: 0,
        maxDaysOverdue: 0,
        hasBrokenPromise: false,
        hasHistoricalPayment: true,
      })
    ).toBe(0);
  });

  it("scores a healthy customer low", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 0,
      maxDaysOverdue: 0,
      hasBrokenPromise: false,
      hasHistoricalPayment: true,
    });
    expect(score).toBe(0);
  });

  it("weights full overdue at 45 points", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 100000,
      maxDaysOverdue: 0,
      hasBrokenPromise: false,
      hasHistoricalPayment: true,
    });
    expect(score).toBe(45 - 5);
  });

  it("weights 90+ days aging at 35 points", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 100000,
      maxDaysOverdue: 90,
      hasBrokenPromise: false,
      hasHistoricalPayment: true,
    });
    expect(score).toBe(45 + 35 - 5);
  });

  it("adds broken-promise penalty", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 0,
      maxDaysOverdue: 0,
      hasBrokenPromise: true,
      hasHistoricalPayment: true,
    });
    expect(score).toBe(15 - 5);
  });

  it("penalises missing payment history", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 0,
      maxDaysOverdue: 0,
      hasBrokenPromise: false,
      hasHistoricalPayment: false,
    });
    expect(score).toBe(5);
  });

  it("rewards historical payment", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 100000,
      maxDaysOverdue: 90,
      hasBrokenPromise: false,
      hasHistoricalPayment: true,
    });
    expect(score).toBe(45 + 35 - 5);
  });

  it("clamps to 100 and rounds", () => {
    const score = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 100000,
      maxDaysOverdue: 300,
      hasBrokenPromise: true,
      hasHistoricalPayment: false,
    });
    expect(score).toBeGreaterThan(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scales overdue ratio linearly", () => {
    const half = computeRiskScore({
      totalOutstanding: 100000,
      totalOverdue: 50000,
      maxDaysOverdue: 0,
      hasBrokenPromise: false,
      hasHistoricalPayment: true,
    });
    expect(half).toBe(18); // Math.round(0.5 * 45) - 5 = 18
  });
});