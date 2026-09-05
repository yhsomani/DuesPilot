import { err, ok, readJson, requireRole, withAuth, ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/lib/audit";
import { generatePaymentLink } from "@/lib/payment-links";
import { z } from "zod";

const createLinkSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  amount: z.number().positive("Amount must be positive"),
  invoiceId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  description: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Validation failed", 400);
  }

  const { customerId, amount, invoiceId, invoiceNumber, description, expiresInDays } = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
  });

  if (!customer) {
    return err("Customer not found", 404);
  }

  const result = await generatePaymentLink({
    customerId,
    customerName: customer.name,
    customerEmail: customer.email || undefined,
    customerPhone: customer.phone || undefined,
    amount,
    invoiceId: invoiceId || undefined,
    invoiceNumber: invoiceNumber || undefined,
    description,
    expiresInDays,
  });

  // Record collection event for traceability
  await prisma.collectionEvent.create({
    data: {
      organizationId: ctx.organizationId,
      customerId,
      invoiceId: invoiceId || null,
      type: "payment_link_created",
      description: `Generated dynamic settlement link (${result.provider}): ${result.paymentUrl}`,
      createdById: ctx.userId,
      metadata: {
        linkId: result.linkId,
        amount: result.amount,
        provider: result.provider,
        paymentUrl: result.paymentUrl,
        upiDeepLink: result.upiDeepLink,
        expiresAt: result.expiresAt,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "PAYMENT_LINK_CREATE",
      entityType: "payment_link",
      entityId: result.linkId,
      metadata: {
        customerId,
        amount: result.amount,
        provider: result.provider,
      },
    },
    req
  );

  return ok({ link: result }, 201);
});
