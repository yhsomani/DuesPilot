// MSME Statutory Penal Interest Engine under Sections 15 & 16 of the MSMED Act, 2006.
// Computes compound interest with monthly rests at three times the RBI Bank Rate on delayed payments.

export const DEFAULT_RBI_BANK_RATE = 6.75; // 6.75% p.a.
export const STATUTORY_MULTIPLIER = 3; // 3x RBI Bank Rate = 20.25% p.a.
export const STATUTORY_MAX_CREDIT_DAYS = 45; // Section 15 statutory maximum

export interface MsmeInterestCalculationParams {
  invoiceAmount: number;
  dueDate: string | Date;
  invoiceDate?: string | Date;
  settlementDate?: string | Date; // Date paid or reference evaluation date (default: today)
  rbiBankRate?: number; // Base rate in percent, e.g. 6.75
  agreedCreditDays?: number;
}

export interface MonthlyRestPeriod {
  monthIndex: number;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  openingPrincipal: number;
  interestEarned: number;
  closingPrincipal: number;
}

export interface MsmeInterestResult {
  principalAmount: number;
  invoiceDueDate: string;
  evaluationDate: string;
  overdueDays: number;
  rbiBankRate: number; // e.g. 6.75%
  statutoryAnnualRate: number; // e.g. 20.25%
  dailyRate: number;
  penalInterestAmount: number;
  totalClaimAmount: number;
  monthlyRests: MonthlyRestPeriod[];
}

/**
 * Calculates compound interest with monthly rests as mandated by Section 16 of the MSMED Act, 2006.
 */
export function calculateMsmePenalInterest({
  invoiceAmount,
  dueDate,
  settlementDate,
  rbiBankRate = DEFAULT_RBI_BANK_RATE,
}: MsmeInterestCalculationParams): MsmeInterestResult {
  if (invoiceAmount <= 0) {
    throw new Error("Invoice amount must be greater than zero");
  }

  const parsedDueDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const parsedSettlementDate = settlementDate
    ? typeof settlementDate === "string"
      ? new Date(settlementDate)
      : settlementDate
    : new Date();

  // If not yet overdue, 0 interest
  if (parsedSettlementDate <= parsedDueDate) {
    const annualRate = rbiBankRate * STATUTORY_MULTIPLIER;
    return {
      principalAmount: invoiceAmount,
      invoiceDueDate: parsedDueDate.toISOString().split("T")[0],
      evaluationDate: parsedSettlementDate.toISOString().split("T")[0],
      overdueDays: 0,
      rbiBankRate,
      statutoryAnnualRate: annualRate,
      dailyRate: annualRate / 365 / 100,
      penalInterestAmount: 0,
      totalClaimAmount: invoiceAmount,
      monthlyRests: [],
    };
  }

  const statutoryAnnualRate = rbiBankRate * STATUTORY_MULTIPLIER; // 20.25%
  const monthlyRate = statutoryAnnualRate / 12 / 100;

  // Calculate monthly rests
  const monthlyRests: MonthlyRestPeriod[] = [];
  let currentPrincipal = invoiceAmount;
  let currentDate = new Date(parsedDueDate.getTime());
  let monthCounter = 1;

  while (currentDate < parsedSettlementDate) {
    const nextMonthDate = new Date(currentDate.getTime());
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    const periodEnd = nextMonthDate > parsedSettlementDate ? parsedSettlementDate : nextMonthDate;
    const diffTime = Math.abs(periodEnd.getTime() - currentDate.getTime());
    const daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // For a complete calendar month, apply full monthly rate; for partial month, prorate by days
    const isFullMonth = nextMonthDate <= parsedSettlementDate;
    const periodInterest = isFullMonth
      ? currentPrincipal * monthlyRate
      : currentPrincipal * (statutoryAnnualRate / 365 / 100) * daysInPeriod;

    const roundedInterest = Math.round(periodInterest * 100) / 100;
    const closingPrincipal = Math.round((currentPrincipal + roundedInterest) * 100) / 100;

    monthlyRests.push({
      monthIndex: monthCounter,
      startDate: currentDate.toISOString().split("T")[0],
      endDate: periodEnd.toISOString().split("T")[0],
      daysInPeriod,
      openingPrincipal: currentPrincipal,
      interestEarned: roundedInterest,
      closingPrincipal,
    });

    currentPrincipal = closingPrincipal;
    currentDate = nextMonthDate;
    monthCounter++;
  }

  const totalOverdueDays = Math.ceil(
    Math.abs(parsedSettlementDate.getTime() - parsedDueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const penalInterestAmount = Math.round((currentPrincipal - invoiceAmount) * 100) / 100;
  const totalClaimAmount = Math.round((invoiceAmount + penalInterestAmount) * 100) / 100;

  return {
    principalAmount: invoiceAmount,
    invoiceDueDate: parsedDueDate.toISOString().split("T")[0],
    evaluationDate: parsedSettlementDate.toISOString().split("T")[0],
    overdueDays: totalOverdueDays,
    rbiBankRate,
    statutoryAnnualRate,
    dailyRate: statutoryAnnualRate / 365 / 100,
    penalInterestAmount,
    totalClaimAmount,
    monthlyRests,
  };
}

export interface CustomerInvoiceClaimSummary {
  invoiceId: string;
  invoiceNumber: string;
  principalAmount: number;
  outstandingAmount: number;
  dueDate: string;
  overdueDays: number;
  penalInterest: number;
  totalClaim: number;
}

export interface CustomerMsmeClaimSummary {
  totalPrincipal: number;
  totalOutstanding: number;
  totalPenalInterest: number;
  totalStatutoryClaim: number;
  rbiBankRate: number;
  statutoryAnnualRate: number;
  invoices: CustomerInvoiceClaimSummary[];
}

/**
 * Aggregates MSME statutory claims across multiple customer invoices.
 */
export function calculateCustomerMsmeClaim(
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    outstandingAmount: number;
    dueDate: string | Date;
  }>,
  rbiBankRate: number = DEFAULT_RBI_BANK_RATE,
  settlementDate: Date = new Date()
): CustomerMsmeClaimSummary {
  const invoiceSummaries: CustomerInvoiceClaimSummary[] = [];
  let totalPrincipal = 0;
  let totalOutstanding = 0;
  let totalPenalInterest = 0;

  for (const inv of invoices) {
    const calc = calculateMsmePenalInterest({
      invoiceAmount: inv.outstandingAmount,
      dueDate: inv.dueDate,
      settlementDate,
      rbiBankRate,
    });

    totalPrincipal += inv.amount;
    totalOutstanding += inv.outstandingAmount;
    totalPenalInterest += calc.penalInterestAmount;

    invoiceSummaries.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      principalAmount: inv.amount,
      outstandingAmount: inv.outstandingAmount,
      dueDate: typeof inv.dueDate === "string" ? inv.dueDate : inv.dueDate.toISOString().split("T")[0],
      overdueDays: calc.overdueDays,
      penalInterest: calc.penalInterestAmount,
      totalClaim: calc.totalClaimAmount,
    });
  }

  return {
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalPenalInterest: Math.round(totalPenalInterest * 100) / 100,
    totalStatutoryClaim: Math.round((totalOutstanding + totalPenalInterest) * 100) / 100,
    rbiBankRate,
    statutoryAnnualRate: rbiBankRate * STATUTORY_MULTIPLIER,
    invoices: invoiceSummaries,
  };
}
