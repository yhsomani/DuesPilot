import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { generateLegalNoticeText, type LegalNoticeType } from "@/lib/legal-notices";
import { calculateCustomerMsmeClaim, DEFAULT_RBI_BANK_RATE } from "@/lib/msme-interest";
import { z } from "zod";

const generateNoticeSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  invoiceIds: z.array(z.string()).optional(),
  noticeType: z.enum([
    "MSME_SECTION_15_16",
    "LEGAL_DEMAND_FINAL",
    "CHEQUE_DISHONOUR_138",
    "CONCILIATION_INTIMATION",
  ] as const).default("MSME_SECTION_15_16"),
  cureDays: z.number().int().min(1).max(60).optional().default(15),
  rbiBankRate: z.number().positive().optional().default(DEFAULT_RBI_BANK_RATE),
  udyamNumber: z.string().optional(),
  bankDetails: z
    .object({
      accountName: z.string().min(1),
      accountNumber: z.string().min(1),
      bankName: z.string().min(1),
      ifscCode: z.string().min(1),
      upiId: z.string().optional(),
    })
    .optional(),
  chequeDetails: z
    .object({
      chequeNumber: z.string().min(1),
      chequeDate: z.string().min(1),
      drawnBank: z.string().min(1),
      dishonourDate: z.string().min(1),
      dishonourReason: z.string().min(1),
    })
    .optional(),
  logCollectionEvent: z.boolean().optional().default(true),
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = generateNoticeSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid notice request", 400);
  }

  const {
    customerId,
    invoiceIds,
    noticeType,
    cureDays,
    rbiBankRate,
    udyamNumber,
    bankDetails,
    chequeDetails,
    logCollectionEvent,
  } = parsed.data;

  // 1. Fetch Debtor Customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!customer) {
    return err("Customer not found in this organization", 404);
  }

  // 2. Fetch Creditor Organization
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
  });

  if (!org) {
    return err("Organization not found", 404);
  }

  // 3. Fetch Invoices
  const invoiceWhere: Record<string, unknown> = {
    customerId,
    organizationId: ctx.organizationId,
    status: { in: ["OVERDUE", "OPEN", "PARTIALLY_PAID", "DUE_SOON", "PROMISED", "PROMISE_BROKEN"] },
    outstandingAmount: { gt: 0 },
  };

  if (invoiceIds && invoiceIds.length > 0) {
    invoiceWhere.id = { in: invoiceIds };
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    orderBy: { dueDate: "asc" },
  });

  if (invoices.length === 0) {
    return err("No overdue or unpaid invoices found for this customer", 400);
  }

  // 4. Calculate Statutory Interest and Claim Table
  const claimSummary = calculateCustomerMsmeClaim(
    invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      outstandingAmount: inv.outstandingAmount,
      dueDate: inv.dueDate,
    })),
    rbiBankRate
  );

  const primaryContact = customer.contacts[0];
  const todayStr = new Date().toISOString().split("T")[0];
  const refNumber = `DP-NOT-${customer.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  // 5. Generate Legal Notice Content
  const generatedNotice = generateLegalNoticeText(noticeType as LegalNoticeType, {
    referenceNumber: refNumber,
    date: todayStr,
    creditor: {
      name: org.name,
      gstin: org.gstin || undefined,
      city: org.city || undefined,
      udyamNumber: udyamNumber || "UDYAM-REGISTERED-CREDITOR",
    },
    debtor: {
      name: customer.name,
      contactPerson: primaryContact?.name || undefined,
      gstin: customer.gstin || undefined,
      email: primaryContact?.email || customer.email || undefined,
      phone: primaryContact?.phone || customer.phone || undefined,
    },
    invoices: claimSummary.invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.dueDate, // or original invoice date
      dueDate: inv.dueDate,
      amount: inv.principalAmount,
      outstandingAmount: inv.outstandingAmount,
      overdueDays: inv.overdueDays,
      penalInterest: inv.penalInterest,
      totalClaim: inv.totalClaim,
    })),
    totalPrincipal: claimSummary.totalOutstanding,
    totalPenalInterest: claimSummary.totalPenalInterest,
    totalStatutoryClaim: claimSummary.totalStatutoryClaim,
    rbiBankRate: claimSummary.rbiBankRate,
    statutoryAnnualRate: claimSummary.statutoryAnnualRate,
    cureDays,
    bankDetails,
    chequeDetails,
  });

  // 6. Optionally record CollectionEvent
  if (logCollectionEvent) {
    await prisma.collectionEvent.create({
      data: {
        organizationId: ctx.organizationId,
        customerId,
        type: "legal_notice_generated",
        description: `Generated ${generatedNotice.title} (Ref: ${refNumber}) for claim ₹${claimSummary.totalStatutoryClaim.toLocaleString("en-IN")}`,
        createdById: ctx.userId,
        metadata: {
          referenceNumber: refNumber,
          noticeType,
          totalPrincipal: claimSummary.totalOutstanding,
          totalPenalInterest: claimSummary.totalPenalInterest,
          totalStatutoryClaim: claimSummary.totalStatutoryClaim,
          cureDays,
        },
      },
    });

    // Write audit trail
    await writeAudit(
      {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: "LEGAL_NOTICE_CREATE",
        entityType: "legal_notice",
        entityId: refNumber,
        metadata: {
          customerId,
          noticeType,
          totalClaim: claimSummary.totalStatutoryClaim,
          invoicesCount: invoices.length,
        },
      },
      req
    );
  }

  return ok({
    referenceNumber: refNumber,
    noticeType,
    title: generatedNotice.title,
    subject: generatedNotice.subject,
    body: generatedNotice.body,
    claimSummary,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    creditor: {
      id: org.id,
      name: org.name,
      gstin: org.gstin,
    },
  });
});
