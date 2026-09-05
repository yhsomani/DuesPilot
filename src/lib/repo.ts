import { prisma } from "@/lib/prisma";
import type {
  AgingBucket,
  CustomerContact,
  CustomerDetailData,
  CustomerInvoice,
  CustomerSummary,
  CustomerTimelineEvent,
  DashboardStats,
  ImportColumnMapping,
  ImportResult,
  InvoiceRow,
  OrganizationSettings,
  PromiseRow,
  PromiseStatusView,
  QueueItem,
  QueuePriority,
} from "@/lib/types";
import { InvoiceStatus, PromiseStatus, type Prisma } from "@/generated/prisma/client";
import { daysOverdue, daysUntilDue } from "@/lib/dates";
import { computeQueueItem } from "@/lib/queue-item";
import { computeRiskScore } from "@/lib/risk-score";
import { consumeIdempotencyKey } from "@/lib/idempotency";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function statusView(raw: string): string {
  return raw.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CUSTOMER_FULL = {
  contacts: true,
  invoices: true,
  promisesToPay: true,
  collectionEvents: true,
  payments: true,
} satisfies Prisma.CustomerInclude;

const CUSTOMER_SUMMARY = {
  _count: { select: { invoices: true } },
} satisfies Prisma.CustomerInclude;

/* ------------------------------- Dashboard ------------------------------- */

export async function getDashboard(organizationId: string) {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      totalOutstanding: true,
      totalOverdue: true,
      riskScore: true,
      status: true,
    },
  });
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    select: {
      id: true,
      amount: true,
      outstandingAmount: true,
      dueDate: true,
      status: true,
    },
  });
  const promises = await prisma.promiseToPay.findMany({
    where: { organizationId, status: PromiseStatus.BROKEN },
    select: { amount: true },
  });

  const stats: DashboardStats = {
    totalReceivables: invoices.reduce((s, i) => s + i.outstandingAmount, 0),
    totalOverdue: customers.reduce((s, c) => s + c.totalOverdue, 0),
    totalDueSoon: invoices
      .filter((i) => {
        const d = daysUntilDue(i.dueDate);
        return d > 0 && d <= 7;
      })
      .reduce((s, i) => s + i.outstandingAmount, 0),
    highRisk: customers
      .filter((c) => (c.riskScore ?? 0) > 70)
      .reduce((s, c) => s + c.totalOutstanding, 0),
    promiseBroken: promises.reduce((s, p) => s + p.amount, 0),
    customersOverdue: customers.filter((c) => c.totalOverdue > 0).length,
  };

  const buckets: { label: string; min: number; max: number }[] = [
    { label: "Current", min: 0, max: 0 },
    { label: "1-30 days", min: 1, max: 30 },
    { label: "31-60 days", min: 31, max: 60 },
    { label: "61-90 days", min: 61, max: 90 },
    { label: "90+ days", min: 91, max: Number.MAX_SAFE_INTEGER },
  ];
  const aging = buckets.map((b) => {
    const inBucket = invoices.filter((i) => {
      const d = daysOverdue(i.dueDate);
      return b.label === "Current" ? d === 0 : d >= b.min && d <= b.max;
    });
    return {
      label: b.label,
      amount: inBucket.reduce((s, i) => s + i.outstandingAmount, 0),
      count: inBucket.length,
    } as AgingBucket;
  });

  return { stats, aging };
}

/* --------------------------------- Queue --------------------------------- */

export async function getQueue(organizationId: string): Promise<QueueItem[]> {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: {
      invoices: {
        select: {
          id: true,
          dueDate: true,
          amount: true,
          outstandingAmount: true,
          status: true,
          dispute: { select: { id: true } },
        },
      },
      promisesToPay: {
        select: { id: true, promiseDate: true, amount: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      collectionEvents: {
        select: { createdAt: true, type: true, description: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      payments: { select: { id: true } },
    },
  });

  const items: QueueItem[] = [];

  for (const c of customers) {
    const overdueInvoices = c.invoices.filter(
      (i) => i.outstandingAmount > 0 && daysOverdue(i.dueDate) > 0
    );
    if (overdueInvoices.length === 0) continue;

    // Skip customers whose only overdue balances are under dispute.
    const collectibleOverdue = overdueInvoices.filter((i) => !i.dispute);
    if (collectibleOverdue.length === 0) continue;

    const latestPromise = c.promisesToPay[0];
    const lastEvent = c.collectionEvents[0];
    const mostOverdue = collectibleOverdue.reduce((a, b) =>
      daysOverdue(a.dueDate) >= daysOverdue(b.dueDate) ? a : b
    );
    const totalOverdue = collectibleOverdue.reduce(
      (s, i) => s + i.outstandingAmount,
      0
    );
    const promiseBroken = latestPromise?.status === PromiseStatus.BROKEN;

    const computed = computeQueueItem({
      promiseBroken,
      mostOverdueDueDate: mostOverdue.dueDate,
      totalOverdue,
      riskScore: c.riskScore ?? 0,
      lastEventType: lastEvent?.type ?? null,
    });

    items.push({
      id: c.id,
      customerId: c.id,
      customer: c.name,
      initials: initials(c.name),
      amount: totalOverdue,
      daysOverdue: computed.daysOverdue,
      status: computed.status,
      lastAction: lastEvent ? lastEvent.description : "No previous action",
      nextAction: computed.nextAction,
      priority: computed.priority,
      why: computed.why,
      promiseBroken,
      promiseId: promiseBroken ? latestPromise?.id ?? null : null,
    });
  }

  const order: Record<QueuePriority, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);
  return items;
}

/* ------------------------------- Customers ------------------------------- */

export async function listCustomers(
  organizationId: string,
  search?: string
): Promise<CustomerSummary[]> {
  const term = search?.trim();
  const customers = await prisma.customer.findMany({
    where: {
      organizationId,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: CUSTOMER_SUMMARY,
    orderBy: { totalOutstanding: "desc" },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    initials: initials(c.name),
    email: c.email,
    phone: c.phone,
    gstin: c.gstin ?? null,
    totalOutstanding: c.totalOutstanding,
    totalOverdue: c.totalOverdue,
    invoicesCount: c._count.invoices,
    riskScore: c.riskScore ?? 0,
    lastPaymentAt: c.lastPaymentAt?.toISOString() ?? null,
    status: c.status,
  }));
}

export async function getCustomerDetail(
  organizationId: string,
  customerId: string
): Promise<CustomerDetailData | null> {
  const c = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: CUSTOMER_FULL,
  });
  if (!c) return null;

  const contacts: CustomerContact[] = (c.contacts ?? []).map((ct) => ({
    id: ct.id,
    name: ct.name,
    designation: ct.designation,
    phone: ct.phone,
    email: ct.email,
    isPrimary: ct.isPrimary,
  }));

  const invoices: CustomerInvoice[] = (c.invoices ?? [])
    .map((inv) => ({
      id: inv.id,
      number: inv.invoiceNumber,
      date: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      amount: inv.amount,
      outstanding: inv.outstandingAmount,
      status: statusView(inv.status),
      daysOverdue: daysOverdue(inv.dueDate),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  type Event = { date: string; type: string; text: string; status?: string };

  const eventSource: Event[] = [
    ...(c.promisesToPay ?? []).map((p) => ({
      date: p.promiseDate.toISOString(),
      type: "promise",
      text: `Promise of ${formatAmount(p.amount)}${
        p.source && p.source !== "manual" ? ` (${p.source})` : ""
      }`,
      status: p.status === PromiseStatus.BROKEN ? "broken" : undefined,
    })),
    ...(c.collectionEvents ?? []).map((ev) => ({
      date: ev.createdAt.toISOString(),
      type: "message",
      text: ev.description,
    })),
    ...(c.payments ?? []).map((p) => ({
      date: p.paymentDate.toISOString(),
      type: "payment",
      text: `Payment received: ${formatAmount(p.amount)}${
        p.reference ? ` (${p.reference})` : ""
      }`,
      status: p.status === "received" ? "matched" : undefined,
    })),
  ];

  const timeline: CustomerTimelineEvent[] = eventSource
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25)
    .map((e, i) => ({ id: `${i}`, ...e }));

  return {
    id: c.id,
    name: c.name,
    initials: initials(c.name),
    email: c.email,
    phone: c.phone,
    gstin: c.gstin,
    totalOutstanding: c.totalOutstanding,
    totalOverdue: c.totalOverdue,
    riskScore: c.riskScore ?? 0,
    status: c.status,
    notes: c.notes,
    contacts,
    invoices,
    timeline,
  };
}

/* -------------------------------- Invoices ------------------------------- */

export async function listInvoices(
  organizationId: string
): Promise<InvoiceRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });
    return invoices.map((inv) => ({
      id: inv.id,
      number: inv.invoiceNumber,
      customerId: inv.customerId,
      customer: inv.customer.name,
      date: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      amount: inv.amount,
      outstanding: inv.outstandingAmount,
      status: inv.status,
      daysOverdue: daysOverdue(inv.dueDate),
    }));
}

export interface InvoiceQuery {
  search?: string;
  status?: "open" | "overdue" | "due_soon" | "disputed" | "paid" | "promised" | "partial";
  page?: number;
  pageSize?: number;
}

export async function queryInvoices(
  organizationId: string,
  q: InvoiceQuery
): Promise<{ items: InvoiceRow[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const statusFilters: Prisma.InvoiceWhereInput[] = [];
  switch (q.status) {
    case "open":
      statusFilters.push({
        status: { in: [InvoiceStatus.OPEN, InvoiceStatus.DRAFT] },
        outstandingAmount: { gt: 0 },
      });
      break;
    case "overdue":
      statusFilters.push({
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DISPUTED] },
        outstandingAmount: { gt: 0 },
        dueDate: { lt: now },
      });
      break;
    case "due_soon":
      statusFilters.push({
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        outstandingAmount: { gt: 0 },
        dueDate: { gte: now, lte: inSevenDays },
      });
      break;
    case "disputed":
      statusFilters.push({ status: InvoiceStatus.DISPUTED });
      break;
    case "paid":
      statusFilters.push({ status: { in: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } });
      break;
    case "promised":
      statusFilters.push({ status: { in: [InvoiceStatus.PROMISED, InvoiceStatus.PROMISE_BROKEN] } });
      break;
    case "partial":
      statusFilters.push({ status: InvoiceStatus.PARTIALLY_PAID });
      break;
  }

  const where: Prisma.InvoiceWhereInput = {
    organizationId,
    AND: [
      ...statusFilters,
      q.search?.trim()
        ? {
            OR: [
              { invoiceNumber: { contains: q.search.trim(), mode: "insensitive" } },
              { customer: { name: { contains: q.search.trim(), mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: invoices.map((inv) => ({
      id: inv.id,
      number: inv.invoiceNumber,
      customerId: inv.customerId,
      customer: inv.customer.name,
      date: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      amount: inv.amount,
      outstanding: inv.outstandingAmount,
      status: inv.status,
      daysOverdue: daysOverdue(inv.dueDate),
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/* -------------------------------- Promises ------------------------------- */

export async function listPromises(
  organizationId: string
): Promise<PromiseRow[]> {
  const promises = await prisma.promiseToPay.findMany({
    where: { organizationId },
    include: {
      customer: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { promiseDate: "asc" },
  });
  return promises.map((p) => ({
    id: p.id,
    customerId: p.customerId,
    customer: p.customer.name,
    initials: initials(p.customer.name),
    amount: p.amount,
    promiseDate: p.promiseDate.toISOString(),
    source: p.source,
    confidence: p.confidence,
    status: (p.status as string) as PromiseStatusView,
    invoiceNumber: p.invoice?.invoiceNumber ?? null,
  }));
}

export async function getInvoiceDetail(
  organizationId: string,
  invoiceId: string
): Promise<import("@/lib/types").InvoiceDetail | null> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      customer: { select: { id: true, name: true } },
      items: true,
      payments: {
        include: { payment: true },
        orderBy: { createdAt: "asc" },
      },
      collectionEvents: { orderBy: { createdAt: "asc" } },
      promisesToPay: { orderBy: { createdAt: "asc" } },
      dispute: true,
    },
  });
  if (!inv) return null;

  const timeline: import("@/lib/types").InvoiceTimelineEvent[] = [];

  for (const alloc of inv.payments) {
    const p = alloc.payment;
    timeline.push({
      id: alloc.id,
      date: p.paymentDate.toISOString(),
      type: "payment",
      summary: `₹${alloc.amount.toFixed(2)} allocated`,
      detail: `Payment${p.reference ? ` ref: ${p.reference}` : ""}${p.mode ? ` (${p.mode})` : ""}`,
    });
  }

  for (const ev of inv.collectionEvents) {
    timeline.push({
      id: ev.id,
      date: ev.createdAt.toISOString(),
      type: "event",
      summary: ev.type,
      detail: ev.description,
    });
  }

  for (const pt of inv.promisesToPay) {
    timeline.push({
      id: pt.id,
      date: pt.promiseDate.toISOString(),
      type: "promise",
      summary: `₹${pt.amount.toFixed(2)} by ${new Date(pt.promiseDate).toLocaleDateString("en-IN")}`,
      detail: pt.note ?? undefined,
    });
  }

  if (inv.dispute) {
    timeline.push({
      id: inv.dispute.id,
      date: inv.dispute.createdAt.toISOString(),
      type: "dispute",
      summary: inv.dispute.reason,
      detail: inv.dispute.status,
    });
  }

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    id: inv.id,
    number: inv.invoiceNumber,
    customerId: inv.customer.id,
    customerName: inv.customer.name,
    date: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    amount: inv.amount,
    outstanding: inv.outstandingAmount,
    status: inv.status,
    currency: inv.currency,
    notes: inv.notes,
    items: inv.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
      amount: i.amount,
    })),
    allocations: inv.payments.map((a) => ({
      id: a.id,
      paymentRef: a.payment.reference ?? null,
      paymentDate: a.payment.paymentDate.toISOString(),
      mode: a.payment.mode ?? null,
      amount: a.amount,
    })),
    timeline,
  };
}

export async function exportOrganizationData(organizationId: string) {
  const [
    org,
    customers,
    invoices,
    invoicesWithItems,
    payments,
    allocations,
    promises,
    disputes,
    events,
    contacts,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, gstin: true, industry: true, city: true },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoice.findMany({ where: { organizationId } }),
    prisma.invoiceItem.findMany({
      where: { invoice: { organizationId } },
    }),
    prisma.payment.findMany({ where: { organizationId } }),
    prisma.paymentAllocation.findMany({
      where: { payment: { organizationId } },
    }),
    prisma.promiseToPay.findMany({ where: { organizationId } }),
    prisma.dispute.findMany({
      where: { invoice: { organizationId } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.collectionEvent.findMany({ where: { organizationId } }),
    prisma.contact.findMany({ where: { customer: { organizationId } } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    organization: org,
    customers: customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastPaymentAt: c.lastPaymentAt?.toISOString() ?? null,
    })),
    invoices: invoices.map((i) => ({
      ...i,
      invoiceDate: i.invoiceDate.toISOString(),
      dueDate: i.dueDate.toISOString(),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    invoiceItems: invoicesWithItems,
    payments: payments.map((p) => ({
      ...p,
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    allocations: allocations.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    promises: promises.map((p) => ({
      ...p,
      promiseDate: p.promiseDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    disputes: disputes.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      updatedAt: d.updatedAt.toISOString(),
    })),
    collectionEvents: events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    contacts,
  };
}

export interface NotificationRow {
  id: string;
  createdAt: string;
  kind: "promise_broken" | "dispute_open" | "promise_due_today" | "system";
  title: string;
  message: string;
  link?: string;
}

export async function listNotifications(
  organizationId: string
): Promise<NotificationRow[]> {
  const now = new Date();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  const [broken, disputes, duePromises] = await Promise.all([
    prisma.promiseToPay.findMany({
      where: {
        organizationId,
        status: "BROKEN",
        updatedAt: { gte: new Date(now.getTime() - SEVEN_DAYS) },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.dispute.findMany({
      where: {
        status: "open",
        invoice: { organizationId },
      },
      include: {
        invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.promiseToPay.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        promiseDate: { lte: now },
      },
      include: { customer: { select: { name: true, id: true } } },
      orderBy: { promiseDate: "asc" },
      take: 5,
    }),
  ]);

  const notifications: NotificationRow[] = [];

  for (const p of broken) {
    notifications.push({
      id: p.id,
      createdAt: p.updatedAt.toISOString(),
      kind: "promise_broken",
      title: `Broken promise – ${p.customer.name}`,
      message: `₹${p.amount.toFixed(2)} promised by ${new Date(p.promiseDate).toLocaleDateString("en-IN")} was not kept.`,
      link: `/dashboard/promises`,
    });
  }

  for (const d of disputes) {
    notifications.push({
      id: d.id,
      createdAt: d.createdAt.toISOString(),
      kind: "dispute_open",
      title: `New dispute – ${d.invoice.invoiceNumber}`,
      message: `${d.invoice.customer.name}: ${d.reason}`,
      link: `/dashboard/disputes`,
    });
  }

  for (const p of duePromises) {
    notifications.push({
      id: p.id,
      createdAt: p.promiseDate.toISOString(),
      kind: "promise_due_today",
      title: `Promise due – ${p.customer.name}`,
      message: `₹${p.amount.toFixed(2)} is due today. Follow up.`,
      link: `/dashboard/customers/${p.customer.id}`,
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return notifications.slice(0, 20);
}

/* -------------------------------- Disputes -------------------------------- */

export async function listDuplicateGroups(
  organizationId: string
): Promise<import("@/lib/types").DuplicateGroup[]> {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      totalOutstanding: true,
      _count: { select: { invoices: true } },
    },
  });

  const groups = new Map<
    string,
    import("@/lib/types").DuplicateGroup["members"]
  >();
  for (const c of customers) {
    const key = c.name.toLowerCase().replace(/\s+/g, " ").trim();
    const members = groups.get(key) ?? [];
    members.push({
      id: c.id,
      name: c.name,
      invoicesCount: c._count.invoices,
      totalOutstanding: c.totalOutstanding,
    });
    groups.set(key, members);
  }

  return [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .sort((a, b) => b[1][0].totalOutstanding - a[1][0].totalOutstanding)
    .map(([key, members]) => ({ key, members }));
}

export async function listDisputes(
  organizationId: string
): Promise<import("@/lib/types").DisputeRow[]> {
  const disputes = await prisma.dispute.findMany({
    where: { invoice: { organizationId } },
    include: {
      invoice: {
        select: { invoiceNumber: true, customer: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return disputes.map((d) => ({
    id: d.id,
    invoiceId: d.invoiceId,
    invoiceNumber: d.invoice.invoiceNumber,
    customer: d.invoice.customer.name,
    reason: d.reason,
    category: d.category,
    status: d.status,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }));
}

/* -------------------------------- Settings ------------------------------- */

export async function getOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  const [org, realUserCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.count({ where: { organizationId } }),
  ]);
  if (!org) return null;
  const workingDays = (org.workingDays as { days: number[] } | null)?.days ?? null;
  const holidays = (org.holidays as string[] | null) ?? null;
  return {
    name: org.name,
    gstin: org.gstin,
    industry: org.industry,
    city: org.city,
    usersCount: realUserCount,
    businessHoursStart: org.businessHoursStart,
    businessHoursEnd: org.businessHoursEnd,
    workingDays,
    holidays,
    automationsPaused: org.automationsPaused,
  };
}

/* --------------------------------- Import -------------------------------- */

export async function importReceivables(
  organizationId: string,
  rows: Record<string, string>[],
  mapping: ImportColumnMapping,
  idempotencyKey?: string | null
): Promise<ImportResult> {
  const issues: { row: number; reason: string }[] = [];
  const MAX_REPORTED_ISSUES = 500;

  const { customersCreated, invoicesCreated, totalAmount } =
    await prisma.$transaction(
      async (tx) => {
        await consumeIdempotencyKey(
          tx,
          organizationId,
          idempotencyKey,
          "import:receivables"
        );
        const customersMap = new Map<string, string>();
        const seenInvoices = new Set<string>();
        const invoicesCreated: string[] = [];
        let customersCreated = 0;
        let totalAmount = 0;

        const pushIssue = (row: number, reason: string) => {
          if (issues.length < MAX_REPORTED_ISSUES) issues.push({ row, reason });
        };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const line = i + 2; // 1-based + header row

        const get = (key: keyof ImportColumnMapping) =>
          row[mapping[key]]?.trim() ?? "";

        const customerName = get("customerName");
        const invoiceNumber = get("invoiceNumber");
        const invoiceDateStr = get("invoiceDate");
        const dueDateStr = get("dueDate");
        const amountStr = get("amount");

        if (!customerName) {
          pushIssue(line, "Missing customer name");
          continue;
        }
        if (!invoiceNumber) {
          pushIssue(line, "Missing invoice number");
          continue;
        }
        if (!dueDateStr) {
          pushIssue(line, "Missing due date");
          continue;
        }
        if (!amountStr) {
          pushIssue(line, "Missing amount");
          continue;
        }

        const amount = parseAmount(amountStr);
        if (Number.isNaN(amount) || amount <= 0) {
          pushIssue(line, `Invalid amount "${amountStr}"`);
          continue;
        }

        const dueDate = parseDate(dueDateStr);
        if (!dueDate) {
          pushIssue(line, `Invalid due date "${dueDateStr}"`);
          continue;
        }

        if (seenInvoices.has(invoiceNumber)) {
          pushIssue(line, `Duplicate invoice number "${invoiceNumber}" in file`);
          continue;
        }
        seenInvoices.add(invoiceNumber);

        // Resolve or create the customer (scoped to this organization).
        let customerId = customersMap.get(customerName.toLowerCase());
        if (!customerId) {
          const existing = await tx.customer.findFirst({
            where: { organizationId, name: customerName },
            select: { id: true },
          });
          customerId = existing?.id;
          if (!customerId) {
            const created = await tx.customer.create({
              data: { organizationId, name: customerName },
            });
            customerId = created.id;
            customersCreated++;
          }
          customersMap.set(customerName.toLowerCase(), customerId);
        }

        // Skip duplicates already present in this organization.
        const existingInv = await tx.invoice.findFirst({
          where: { organizationId, invoiceNumber },
          select: { id: true },
        });
        if (existingInv) {
          pushIssue(line, `Invoice "${invoiceNumber}" already exists`);
          continue;
        }

        const invoiceDate = parseDate(invoiceDateStr) ?? new Date();
        const outstanding = parseAmount(get("outstanding")) || amount;

        await tx.invoice.create({
          data: {
            organizationId,
            customerId,
            invoiceNumber,
            invoiceDate: invoiceDate,
            dueDate,
            amount,
            outstandingAmount: Math.min(outstanding, amount),
            status: InvoiceStatus.OPEN,
            source: "csv",
          },
        });
        invoicesCreated.push(invoiceNumber);
        totalAmount += amount;
      }

      return { customersCreated, invoicesCreated, totalAmount };
    },
      { timeout: 60_000 }
    );

  // Refresh aggregate outstanding/overdue (runs outside the tx, best-effort).
  if (invoicesCreated.length > 0) {
    await refreshCustomerTotals(organizationId);
  }

  const validRows = invoicesCreated.length;
  return {
    customersCreated,
    invoicesCreated: validRows,
    totalAmount,
    processedRows: rows.length,
    validRows,
    skippedRows: rows.length - validRows,
    issues,
  };
}

export async function refreshCustomerTotals(organizationId: string) {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    select: { id: true },
  });
  for (const c of customers) {
    const [invs, promises, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { customerId: c.id },
        select: { amount: true, outstandingAmount: true, dueDate: true },
      }),
      prisma.promiseToPay.findMany({
        where: { customerId: c.id },
        select: { status: true },
      }),
      prisma.payment.findMany({
        where: { customerId: c.id },
        select: { id: true },
      }),
    ]);
    const totalOutstanding = invs.reduce((s, i) => s + i.outstandingAmount, 0);
    const totalOverdue = invs
      .filter((i) => i.outstandingAmount > 0 && daysOverdue(i.dueDate) > 0)
      .reduce((s, i) => s + i.outstandingAmount, 0);
    const maxDaysOverdue = invs
      .filter((i) => i.outstandingAmount > 0)
      .reduce((m, i) => Math.max(m, daysOverdue(i.dueDate)), 0);
    const riskScore = computeRiskScore({
      totalOutstanding,
      totalOverdue,
      maxDaysOverdue,
      hasBrokenPromise: promises.some(
        (p) => p.status === PromiseStatus.BROKEN
      ),
      hasHistoricalPayment: payments.length > 0,
    });
    await prisma.customer.update({
      where: { id: c.id },
      data: { totalOutstanding, totalOverdue, riskScore },
    });
  }
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.\-]/g, "");
  if (!cleaned) return 0;
  // Handle Indian "1,00,000" style already stripped by regex above.
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function parseDate(value: string): Date | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, yRaw] = dmy;
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const date = new Date(y, Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  // ISO yyyy-mm-dd
  const iso = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
