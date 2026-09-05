import { prisma } from "@/lib/prisma";

export interface AnalyticsKpi {
  label: string;
  value: number | null;
  suffix: string;
  hint: string;
}

export interface MonthCollection {
  month: string;
  collected: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKpi[];
  series: MonthCollection[];
  openDisputes: number;
  activePromises: number;
}

export async function computeAnalytics(
  organizationId: string
): Promise<AnalyticsData> {
  const now = new Date();
  const nowMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nowMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    outstandingAgg,
    overdueAgg,
    collected30d,
    collectedThisMonth,
    kept,
    broken,
    activePromises,
    openDisputes,
    monthsAgg,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { organizationId },
      _sum: { outstandingAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        outstandingAmount: { gt: 0 },
        dueDate: { lt: now },
        status: { notIn: ["PAID", "CANCELLED", "DISPUTED"] },
      },
      _sum: { outstandingAmount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, paymentDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, paymentDate: { gte: nowMonthStart, lt: nowMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.promiseToPay.count({ where: { organizationId, status: "KEPT" } }),
    prisma.promiseToPay.count({ where: { organizationId, status: "BROKEN" } }),
    prisma.promiseToPay.count({
      where: { organizationId, status: "ACTIVE", promiseDate: { gte: now } },
    }),
    prisma.dispute.count({
      where: { status: "open", invoice: { organizationId } },
    }),
    prisma.payment.groupBy({
      by: ["paymentDate"],
      where: { organizationId },
      _sum: { amount: true },
    }),
  ]);

  const outstanding = outstandingAgg._sum.outstandingAmount ?? 0;
  const overdue = overdueAgg._sum.outstandingAmount ?? 0;
  const collected30 = collected30d._sum.amount ?? 0;
  const collectedMonth = collectedThisMonth._sum.amount ?? 0;

  // DSO (approximation over trailing 30 days).
  let dso: number | null = null;
  if (collected30 > 0) {
    dso = Math.round((outstanding / (collected30 / 30)) * 10) / 10;
  }

  // Collection effectiveness = share of this month's flow that got collected.
  let cei: number | null = null;
  const flow = collectedMonth + outstanding;
  if (flow > 0) {
    cei = Math.round((collectedMonth / flow) * 1000) / 10;
  }

  // Promise adherence.
  let adherence: number | null = null;
  const resolved = kept + broken;
  if (resolved > 0) {
    adherence = Math.round((kept / resolved) * 1000) / 10;
  }

  const kpis: AnalyticsKpi[] = [
    {
      label: "Days Sales Outstanding",
      value: dso,
      suffix: "days",
      hint: "Approximated as current outstanding ÷ average daily collections (trailing 30 days).",
    },
    {
      label: "Collection Effectiveness Index",
      value: cei,
      suffix: "%",
      hint: "Share of this month's receivable flow captured as cash.",
    },
    {
      label: "Promise Adherence",
      value: adherence,
      suffix: "%",
      hint: "Promises kept ÷ promises resolved.",
    },
    {
      label: "Overdue Ratio",
      value: outstanding > 0 ? Math.round((overdue / outstanding) * 1000) / 10 : 0,
      suffix: "%",
      hint: "Overdue balance as a share of total outstanding.",
    },
  ];

  const byMonth = new Map<string, number>();
  for (const g of monthsAgg) {
    const key = g.paymentDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    byMonth.set(key, (byMonth.get(key) ?? 0) + (g._sum.amount ?? 0));
  }
  const series: MonthCollection[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    series.push({ month: key, collected: byMonth.get(key) ?? 0 });
  }

  return { kpis, series, openDisputes, activePromises };
}