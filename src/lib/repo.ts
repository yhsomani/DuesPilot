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

const now = new Date();

function daysOverdue(dueDate: Date): number {
  const diff = now.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function daysUntilDue(dueDate: Date): number {
  const diff = dueDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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
        select: { id: true, dueDate: true, amount: true, outstandingAmount: true, status: true },
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

    const latestPromise = c.promisesToPay[0];
    const lastEvent = c.collectionEvents[0];
    const mostOverdue = overdueInvoices.reduce((a, b) =>
      daysOverdue(a.dueDate) >= daysOverdue(b.dueDate) ? a : b
    );
    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.outstandingAmount, 0);
    const promiseBroken = latestPromise?.status === PromiseStatus.BROKEN;

    let priority: QueuePriority = "low";
    const days = daysOverdue(mostOverdue.dueDate);
    if (promiseBroken || days > 30 || totalOverdue > 400000) priority = "high";
    else if (days > 7 || (c.riskScore ?? 0) > 70) priority = "medium";

    const status = promiseBroken
      ? "Promise broken"
      : lastEvent
      ? statusView(lastEvent.type)
      : `${days} days overdue`;

    const nextAction =
      priority === "high"
        ? promiseBroken || days > 30
          ? "Call now"
          : "Resolve dispute"
        : priority === "medium"
        ? "WhatsApp follow-up"
        : "Send due date notice";

    items.push({
      id: c.id,
      customerId: c.id,
      customer: c.name,
      initials: initials(c.name),
      amount: totalOverdue,
      daysOverdue: days,
      status,
      lastAction: lastEvent ? lastEvent.description : "No previous action",
      nextAction,
      priority,
      promiseBroken,
    });
  }

  const order: Record<QueuePriority, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);
  return items;
}

/* ------------------------------- Customers ------------------------------- */

export async function listCustomers(
  organizationId: string
): Promise<CustomerSummary[]> {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: CUSTOMER_SUMMARY,
    orderBy: { totalOutstanding: "desc" },
  });
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    initials: initials(c.name),
    email: c.email,
    phone: c.phone,
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
      customer: inv.customer.name,
      date: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      amount: inv.amount,
      outstanding: inv.outstandingAmount,
      status: inv.status,
      daysOverdue: daysOverdue(inv.dueDate),
    }));
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

/* -------------------------------- Settings ------------------------------- */

export async function getOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) return null;
  return {
    name: org.name,
    gstin: org.gstin,
    industry: org.industry,
    city: org.city,
    usersCount: org.usersCount,
  };
}

/* --------------------------------- Import -------------------------------- */

export async function importReceivables(
  organizationId: string,
  rows: Record<string, string>[],
  mapping: ImportColumnMapping
): Promise<ImportResult> {
  const customersMap = new Map<string, string>();
  const invoicesCreated: string[] = [];

  for (const row of rows) {
    const get = (key: keyof ImportColumnMapping) =>
      row[mapping[key]]?.trim() ?? "";

    const customerName = get("customerName");
    const invoiceNumber = get("invoiceNumber");
    const invoiceDateStr = get("invoiceDate");
    const dueDateStr = get("dueDate");
    const amountStr = get("amount");
    if (!customerName || !invoiceNumber || !dueDateStr || !amountStr) continue;

    const amount = parseAmount(amountStr);
    if (Number.isNaN(amount) || amount <= 0) continue;

    // Resolve or create the customer (scoped to this organization).
    let customerId = customersMap.get(customerName.toLowerCase());
    if (!customerId) {
      const existing = await prisma.customer.findFirst({
        where: { organizationId, name: customerName },
        select: { id: true },
      });
      customerId = existing?.id;
      if (!customerId) {
        const created = await prisma.customer.create({
          data: { organizationId, name: customerName },
        });
        customerId = created.id;
      }
      customersMap.set(customerName.toLowerCase(), customerId);
    }

    const dueDate = parseDate(dueDateStr);
    if (!dueDate) continue;

    const invoiceDate = parseDate(invoiceDateStr) ?? new Date();

    // Skip duplicates within the same organization.
    const existingInv = await prisma.invoice.findFirst({
      where: { organizationId, invoiceNumber },
      select: { id: true },
    });
    if (existingInv) continue;

    const outstanding = parseAmount(get("outstanding")) || amount;

    await prisma.invoice.create({
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
  }

  // Refresh aggregate outstanding/overdue on affected customers.
  await refreshCustomerTotals(organizationId);

  const totalAmount = invoicesCreated.length
    ? await prisma.invoice
        .findMany({
          where: { organizationId, invoiceNumber: { in: invoicesCreated } },
          select: { amount: true },
        })
        .then((rows) => rows.reduce((s, r) => s + r.amount, 0))
    : 0;

  return {
    customersCreated: customersMap.size,
    invoicesCreated: invoicesCreated.length,
    totalAmount,
  };
}

async function refreshCustomerTotals(organizationId: string) {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    select: { id: true },
  });
  for (const c of customers) {
    const invs = await prisma.invoice.findMany({
      where: { customerId: c.id },
      select: { amount: true, outstandingAmount: true, dueDate: true },
    });
    const totalOutstanding = invs.reduce((s, i) => s + i.outstandingAmount, 0);
    const totalOverdue = invs
      .filter((i) => i.outstandingAmount > 0 && daysOverdue(i.dueDate) > 0)
      .reduce((s, i) => s + i.outstandingAmount, 0);
    await prisma.customer.update({
      where: { id: c.id },
      data: { totalOutstanding, totalOverdue },
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
