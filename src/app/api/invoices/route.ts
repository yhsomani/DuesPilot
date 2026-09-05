import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { listInvoices, queryInvoices, refreshCustomerTotals } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { MANAGE_ROLES } from "@/lib/server-context";
import { z } from "zod";

function parseStatus(raw: string | null) {
  if (!raw) return undefined;
  const allowed = ["open", "overdue", "due_soon", "disputed", "paid", "promised", "partial"] as const;
  return (allowed as readonly string[]).includes(raw)
    ? (raw as (typeof allowed)[number])
    : undefined;
}

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = parseStatus(url.searchParams.get("status"));
  const pageRaw = url.searchParams.get("page");
  const page = pageRaw ? Number(pageRaw) : undefined;
  const pageSizeRaw = url.searchParams.get("pageSize");

  if (page === undefined && !search && !status) {
    const invoices = await listInvoices(ctx.organizationId);
    return ok(invoices);
  }

  const result = await queryInvoices(ctx.organizationId, {
    search,
    status,
    page,
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
  });
  return ok(result);
});

const createSchema = z
  .object({
    customerId: z.string().min(1),
    invoiceNumber: z.string().min(1).max(100),
    amount: z.number().positive(),
    invoiceDate: z.string().date(),
    dueDate: z.string().date(),
    currency: z.string().max(5).default("INR"),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const d = parsed.data;
  const customer = await prisma.customer.findFirst({
    where: { id: d.customerId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!customer) return err("Customer not found", 404);

  const invoiceDate = new Date(`${d.invoiceDate}T00:00:00.000Z`);
  const dueDate = new Date(`${d.dueDate}T00:00:00.000Z`);
  if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(dueDate.getTime())) {
    return err("Invalid date", 400);
  }

  const existing = await prisma.invoice.findUnique({
    where: {
      organizationId_invoiceNumber: {
        organizationId: ctx.organizationId,
        invoiceNumber: d.invoiceNumber,
      },
    },
    select: { id: true },
  });
  if (existing) return err("Invoice number already exists", 409);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      customerId: customer.id,
      invoiceNumber: d.invoiceNumber,
      invoiceDate,
      dueDate,
      amount: d.amount,
      outstandingAmount: d.amount,
      status: "OPEN",
      currency: d.currency,
      notes: d.notes,
      source: "manual",
    },
  });

  await refreshCustomerTotals(ctx.organizationId);

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "INVOICE_CREATE",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount },
    },
    req
  );

  return ok(
    {
      id: invoice.id,
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      amount: invoice.amount,
      outstanding: invoice.outstandingAmount,
      status: invoice.status,
      daysOverdue: 0,
      customer: d.customerId,
    },
    201
  );
});