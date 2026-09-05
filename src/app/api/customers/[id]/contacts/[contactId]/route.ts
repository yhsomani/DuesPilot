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
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  designation: z.string().max(200).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const customerId = params?.id;
  const contactId = params?.contactId;
  if (!customerId || !contactId) return err("Missing ids", 400);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customer: { id: customerId, organizationId: ctx.organizationId } },
  });
  if (!contact) return err("Contact not found", 404);

  const body = await readJson(req);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const data: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") data.name = parsed.data.name;
  if ("email" in parsed.data) data.email = parsed.data.email;
  if ("phone" in parsed.data) data.phone = parsed.data.phone;
  if ("designation" in parsed.data) data.designation = parsed.data.designation;
  if (typeof parsed.data.isPrimary === "boolean") data.isPrimary = parsed.data.isPrimary;

  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }
    return tx.contact.update({ where: { id: contactId }, data });
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CONTACT_UPDATE",
      entityType: "contact",
      entityId: contactId,
      metadata: { customerId, ...data },
    },
    req
  );

  return ok(updated);
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const customerId = params?.id;
  const contactId = params?.contactId;
  if (!customerId || !contactId) return err("Missing ids", 400);

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customer: { id: customerId, organizationId: ctx.organizationId } },
  });
  if (!contact) return err("Contact not found", 404);

  await prisma.contact.delete({ where: { id: contactId } });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CONTACT_DELETE",
      entityType: "contact",
      entityId: contactId,
      metadata: { customerId, name: contact.name },
    },
    req
  );

  return ok({ deleted: true });
});