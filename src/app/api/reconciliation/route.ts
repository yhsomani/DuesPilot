import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
  ACTION_ROLES,
} from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import {
  parseBankStatementCsv,
  matchTransactionsAgainstReceivables,
  type OpenInvoiceForMatch,
  type CustomerForMatch,
  type BankTransaction,
} from "@/lib/bank-reconciliation";
import { recordPayment } from "@/lib/collections";
import { writeAudit } from "@/lib/audit";
import { InvoiceStatus } from "@/generated/prisma/client";
import { z } from "zod";

const parseAndMatchSchema = z.object({
  action: z.literal("parse_and_match"),
  csvContent: z.string().optional(),
  transactions: z
    .array(
      z.object({
        id: z.string(),
        date: z.string(),
        valueDate: z.string().optional(),
        narration: z.string(),
        reference: z.string(),
        creditAmount: z.number().positive(),
        balance: z.number().optional(),
      })
    )
    .optional(),
});

const confirmedAllocationSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

const confirmedMatchSchema = z.object({
  transactionId: z.string(),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  paymentDate: z.string(),
  reference: z.string().optional(),
  mode: z.string().optional(),
  allocations: z.array(confirmedAllocationSchema).min(1),
});

const confirmAndAllocateSchema = z.object({
  action: z.literal("confirm_and_allocate"),
  matches: z.array(confirmedMatchSchema).min(1),
});

const schema = z.discriminatedUnion("action", [
  parseAndMatchSchema,
  confirmAndAllocateSchema,
]);

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const organizationId = ctx.organizationId;

  if (parsed.data.action === "parse_and_match") {
    let transactions: BankTransaction[] = [];
    let parseErrors: string[] = [];

    if (parsed.data.csvContent) {
      const parseResult = parseBankStatementCsv(parsed.data.csvContent);
      transactions = parseResult.transactions;
      parseErrors = parseResult.errors;
    } else if (parsed.data.transactions) {
      transactions = parsed.data.transactions;
    } else {
      return err("Provide either csvContent or transactions array", 400);
    }

    if (transactions.length === 0) {
      return ok({
        transactions: [],
        matches: [],
        summary: { total: 0, highConfidence: 0, mediumConfidence: 0, unmatched: 0, totalAmount: 0 },
        parseErrors,
      });
    }

    // Fetch open invoices and active customers
    const [invoices, customers] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: [InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID] },
        },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.customer.findMany({
        where: { organizationId },
        select: { id: true, name: true, gstin: true, phone: true },
      }),
    ]);

    const openInvoicesForMatch: OpenInvoiceForMatch[] = invoices.map((inv) => {
      const balance = inv.outstandingAmount ?? inv.amount;
      const paidAmount = Math.max(0, inv.amount - balance);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.name || "Unknown",
        amount: inv.amount,
        paidAmount,
        balance,
        dueDate: inv.dueDate.toISOString(),
      };
    });

    const customersForMatch: CustomerForMatch[] = customers.map((c) => ({
      id: c.id,
      name: c.name,
      gstin: c.gstin,
      phone: c.phone,
    }));

    const matches = matchTransactionsAgainstReceivables(
      transactions,
      openInvoicesForMatch,
      customersForMatch
    );

    const highConfidence = matches.filter((m) => m.confidenceLevel === "HIGH").length;
    const mediumConfidence = matches.filter((m) => m.confidenceLevel === "MEDIUM").length;
    const unmatched = matches.filter((m) => m.confidenceLevel === "UNMATCHED").length;
    const totalAmount = transactions.reduce((acc, t) => acc + t.creditAmount, 0);

    return ok({
      transactions,
      matches,
      summary: {
        total: transactions.length,
        highConfidence,
        mediumConfidence,
        unmatched,
        totalAmount,
      },
      parseErrors,
    });
  }

  // Handle confirm_and_allocate
  const results = [];
  let successfulAllocations = 0;
  let totalReconciledAmount = 0;

  for (const match of parsed.data.matches) {
    try {
      const paymentResult = await recordPayment(organizationId, ctx.userId, {
        customerId: match.customerId,
        amount: match.amount,
        paymentDate: match.paymentDate,
        mode: match.mode || "BANK_TRANSFER",
        reference: match.reference,
        allocations: match.allocations,
      });

      successfulAllocations++;
      totalReconciledAmount += match.amount;
      results.push({
        transactionId: match.transactionId,
        status: "SUCCESS",
        paymentId: paymentResult.payment.id,
        keptPromises: paymentResult.keptPromises,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Allocation error";
      results.push({
        transactionId: match.transactionId,
        status: "FAILED",
        error: msg,
      });
    }
  }

  await writeAudit({
    organizationId,
    userId: ctx.userId,
    action: "BATCH_RECONCILIATION_ALLOCATE",
    entityType: "RECONCILIATION",
    entityId: `recon_${Date.now()}`,
    metadata: {
      totalProcessed: parsed.data.matches.length,
      successfulAllocations,
      totalReconciledAmount,
    },
  });

  return ok({
    success: true,
    totalProcessed: parsed.data.matches.length,
    successfulAllocations,
    totalReconciledAmount,
    results,
  });
});
