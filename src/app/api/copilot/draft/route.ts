import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
  ACTION_ROLES,
} from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { generateDunningDraft, type DunningTone } from "@/lib/copilot";
import { InvoiceStatus } from "@/generated/prisma/client";
import { z } from "zod";

const draftSchema = z.object({
  customerId: z.string().min(1),
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "FIRM", "MSME_STATUTORY_DEMAND"]),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS"]),
  paymentLink: z.string().optional(),
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { customerId, tone, channel, paymentLink } = parsed.data;
  const organizationId = ctx.organizationId;

  const [customer, org, invoices] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.invoice.findMany({
      where: {
        customerId,
        organizationId,
        status: { in: [InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  if (!customer) {
    return err("Customer not found", 404);
  }

  const now = new Date();
  let totalOverdue = 0;
  let oldestInvoiceDaysOverdue = 0;

  for (const inv of invoices) {
    const balance = inv.outstandingAmount ?? inv.amount;
    totalOverdue += balance;
    const diffMs = now.getTime() - new Date(inv.dueDate).getTime();
    const dpd = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    if (dpd > oldestInvoiceDaysOverdue) {
      oldestInvoiceDaysOverdue = dpd;
    }
  }

  // If no open invoices, default to customer outstanding amount
  if (totalOverdue === 0 && customer.totalOutstanding > 0) {
    totalOverdue = customer.totalOutstanding;
    oldestInvoiceDaysOverdue = 15;
  }

  const draftResult = await generateDunningDraft({
    customerName: customer.name,
    contactName: customer.name,
    totalOverdue,
    oldestInvoiceDaysOverdue,
    invoicesCount: invoices.length || 1,
    isMsmeCreditor: true, // Default to MSME protection enabled
    msmePenalInterest: Math.round(totalOverdue * 0.05), // Estimated penal interest
    tone: tone as DunningTone,
    channel,
    paymentLink,
    senderOrgName: org?.name || "DuesPilot Creditor",
  });

  return ok(draftResult);
});
