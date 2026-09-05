import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { getCustomerDetail } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { mergeCustomers } from "@/lib/collections";
import { MANAGE_ROLES } from "@/lib/server-context";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

export const GET = withAuth(async (_req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Missing customer id", 400);
  const customer = await getCustomerDetail(ctx.organizationId, id);
  if (!customer) return err("Customer not found", 404);
  return ok(customer);
});

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  gstin: z.string().max(50).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const id = params?.id;
  if (!id) return err("Missing customer id", 400);

  const body = await readJson(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const existing = await prisma.customer.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true, name: true },
  });
  if (!existing) return err("Customer not found", 404);

  const data: Record<string, unknown> = {};
  if (typeof parsed.data.name === "string") data.name = parsed.data.name;
  if ("email" in parsed.data) data.email = parsed.data.email;
  if ("phone" in parsed.data) data.phone = parsed.data.phone;
  if ("gstin" in parsed.data) data.gstin = parsed.data.gstin;
  if ("status" in parsed.data) data.status = parsed.data.status;
  if ("notes" in parsed.data) data.notes = parsed.data.notes;

  await prisma.customer.update({ where: { id }, data });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CUSTOMER_UPDATE",
      entityType: "customer",
      entityId: id,
      metadata: data,
    },
    req
  );

  const updated = await getCustomerDetail(ctx.organizationId, id);
  return ok(updated);
});

const mergeSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1),
});

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const id = params?.id;
  if (!id) return err("Missing customer id", 400);

  const body = await readJson(req);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  await mergeCustomers(ctx.organizationId, ctx.userId, id, parsed.data.sourceIds);
  return ok({ merged: true });
});