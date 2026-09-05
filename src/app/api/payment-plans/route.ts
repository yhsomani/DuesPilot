import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES, VIEW_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import {
  generateInstallmentSchedule,
  InstallmentFrequency,
  evaluatePaymentPlanStatus,
} from "@/lib/payment-plans";
import { z } from "zod";

const createPlanSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  invoiceId: z.string().optional().nullable(),
  totalAmount: z.number().positive("Total amount must be positive"),
  numberOfInstallments: z.number().int().min(2).max(24),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  startDate: z.string().optional(),
  note: z.string().optional(),
});

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const whereClause: { organizationId: string; type: string; customerId?: string } = {
    organizationId: ctx.organizationId,
    type: "PAYMENT_PLAN_CREATED",
  };

  if (customerId) {
    whereClause.customerId = customerId;
  }

  const planEvents = await prisma.collectionEvent.findMany({
    where: whereClause,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      invoice: {
        select: { id: true, invoiceNumber: true, amount: true, outstandingAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const plans = planEvents.map((evt) => {
    const meta = (evt.metadata as Record<string, unknown>) || {};
    const installments = (meta.installments as Array<{
      sequence: number;
      dueDate: string;
      amount: number;
      paidAmount: number;
      status: "PENDING" | "KEPT" | "PARTIALLY_PAID" | "BROKEN";
    }>) || [];

    const status = evaluatePaymentPlanStatus(installments);

    return {
      id: evt.id,
      customerId: evt.customerId,
      customer: evt.customer,
      invoiceId: evt.invoiceId,
      invoice: evt.invoice,
      totalAmount: meta.totalAmount || 0,
      numberOfInstallments: meta.numberOfInstallments || installments.length,
      frequency: meta.frequency || "monthly",
      installments,
      status,
      note: meta.note as string | undefined,
      createdAt: evt.createdAt.toISOString(),
    };
  });

  return ok({ plans });
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Validation failed", 400);
  }

  const {
    customerId,
    invoiceId,
    totalAmount,
    numberOfInstallments,
    frequency,
    startDate: rawStartDate,
    note,
  } = parsed.data;

  // Verify customer belongs to organization
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
  });

  if (!customer) {
    return err("Customer not found", 404);
  }

  const startDate = rawStartDate ? new Date(rawStartDate) : new Date();
  const installments = generateInstallmentSchedule(
    totalAmount,
    numberOfInstallments,
    frequency as InstallmentFrequency,
    startDate
  );

  // Create transactional batch: create PromiseToPay for each milestone + CollectionEvent
  const planResult = await prisma.$transaction(async (tx) => {
    // 1. Create individual promises for each milestone so they appear in promise queues
    const createdPromises = await Promise.all(
      installments.map((inst) =>
        tx.promiseToPay.create({
          data: {
            organizationId: ctx.organizationId,
            customerId,
            invoiceId: invoiceId || null,
            amount: inst.amount,
            promiseDate: new Date(inst.dueDate),
            source: "payment_plan",
            confidence: 85,
            status: "ACTIVE",
            note: `Installment ${inst.sequence}/${numberOfInstallments} (${frequency})${note ? `: ${note}` : ""}`,
          },
        })
      )
    );

    // 2. Record CollectionEvent with complete schedule
    const event = await tx.collectionEvent.create({
      data: {
        organizationId: ctx.organizationId,
        customerId,
        invoiceId: invoiceId || null,
        type: "PAYMENT_PLAN_CREATED",
        description: `Structured payment plan: ${numberOfInstallments} ${frequency} installments totaling ₹${totalAmount.toLocaleString("en-IN")}`,
        createdById: ctx.userId,
        metadata: {
          totalAmount,
          numberOfInstallments,
          frequency,
          startDate: startDate.toISOString().split("T")[0],
          installments: JSON.parse(JSON.stringify(installments)),
          promiseIds: createdPromises.map((p) => p.id),
          note,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { event, promises: createdPromises };
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PAYMENT_PLAN_CREATE",
      entityType: "payment_plan",
      entityId: planResult.event.id,
      metadata: {
        customerId,
        totalAmount,
        installmentsCount: numberOfInstallments,
        frequency,
      },
    },
    req
  );

  return ok(
    {
      planId: planResult.event.id,
      installments,
      promisesCreated: planResult.promises.length,
    },
    201
  );
});
