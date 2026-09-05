import { err, ok, requireRole, withAuth, VIEW_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import {
  calculateMsmePenalInterest,
  calculateCustomerMsmeClaim,
  DEFAULT_RBI_BANK_RATE,
} from "@/lib/msme-interest";

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const invoiceId = searchParams.get("invoiceId");
  const rbiRateParam = searchParams.get("rbiBankRate");
  const settlementDateParam = searchParams.get("settlementDate");

  const rbiBankRate = rbiRateParam ? parseFloat(rbiRateParam) : DEFAULT_RBI_BANK_RATE;
  if (isNaN(rbiBankRate) || rbiBankRate <= 0) {
    return err("Invalid RBI Bank Rate", 400);
  }

  const settlementDate = settlementDateParam ? new Date(settlementDateParam) : new Date();
  if (isNaN(settlementDate.getTime())) {
    return err("Invalid settlement date format", 400);
  }

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: ctx.organizationId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, gstin: true },
        },
      },
    });

    if (!invoice) {
      return err("Invoice not found in this organization", 404);
    }

    const calc = calculateMsmePenalInterest({
      invoiceAmount: invoice.outstandingAmount,
      dueDate: invoice.dueDate,
      settlementDate,
      rbiBankRate,
    });

    return ok({
      type: "invoice_calculation",
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        outstandingAmount: invoice.outstandingAmount,
        dueDate: invoice.dueDate.toISOString().split("T")[0],
        status: invoice.status,
      },
      customer: invoice.customer,
      calculation: calc,
    });
  }

  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: ctx.organizationId,
      },
    });

    if (!customer) {
      return err("Customer not found in this organization", 404);
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        organizationId: ctx.organizationId,
        status: { in: ["OVERDUE", "OPEN", "PARTIALLY_PAID", "DUE_SOON", "PROMISED", "PROMISE_BROKEN"] },
        outstandingAmount: { gt: 0 },
      },
      orderBy: { dueDate: "asc" },
    });

    const claimSummary = calculateCustomerMsmeClaim(
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        outstandingAmount: inv.outstandingAmount,
        dueDate: inv.dueDate,
      })),
      rbiBankRate,
      settlementDate
    );

    return ok({
      type: "customer_claim_aggregate",
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin,
      },
      claim: claimSummary,
    });
  }

  return err("Either customerId or invoiceId must be provided", 400);
});
