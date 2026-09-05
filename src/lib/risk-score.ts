export interface RiskInput {
  totalOutstanding: number;
  totalOverdue: number;
  maxDaysOverdue: number;
  hasBrokenPromise: boolean;
  hasHistoricalPayment: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministic debt-profile risk score in 0..100.
 *
 * Weights:
 *  - 45 pts: overdue ratio (overdue / outstanding)
 *  - 35 pts: aging (0-90+ days)
 *  - 15 pts: broken-promise penalty
 *  - -5..+5: no payment history signals high uncertainty
 *
 * Stored on the customer and used by the queue and dashboard; never set
 * manually.
 */
export function computeRiskScore(input: RiskInput): number {
  if (input.totalOutstanding <= 0) return 0;
  const overdueRatio = clamp(input.totalOverdue / input.totalOutstanding, 0, 1);
  const ageFactor = clamp(input.maxDaysOverdue / 90, 0, 1);
  const historyTerm = input.hasHistoricalPayment ? -5 : 5;
  const score =
    overdueRatio * 45 +
    ageFactor * 35 +
    (input.hasBrokenPromise ? 15 : 0) +
    historyTerm;
  return Math.round(clamp(score, 0, 100));
}