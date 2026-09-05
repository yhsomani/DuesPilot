import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  designation: z.string().max(200).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const GET = withAuth(async (_req, ctx, params) => {
  const customerId = params?.id;
  if (!customerId) return err("Missing customer id", 400);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
    select: { id: true, contacts: { orderBy: { createdAt: "asc" } } },
  });
  if (!customer) return err("Customer not found", 404);
  return ok(customer.contacts);
});

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const customerId = params?.id;
  if (!customerId) return err("Missing customer id", 400);

  const body = await readJson(req);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!customer) return err("Customer not found", 404);

  const contact = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    return tx.contact.create({
      data: {
        customerId,
        name: parsed.data.name.trim(),
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        designation: parsed.data.designation ?? null,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CONTACT_CREATE",
      entityType: "contact",
      entityId: contact.id,
      metadata: { customerId, name: contact.name, isPrimary: contact.isPrimary },
    },
    req
  );

  return ok(contact, 201);
});