import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { listCustomers } from "@/lib/repo";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { MANAGE_ROLES } from "@/lib/server-context";
import { z } from "zod";

export const GET = withAuth(async (req, ctx) => {
  const search = new URL(req.url).searchParams.get("search") ?? undefined;
  const customers = await listCustomers(ctx.organizationId, search);
  return ok(customers);
});

const createSchema = z
  .object({
    name: z.string().min(2).max(200),
    email: z.string().email().max(254).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    gstin: z.string().max(50).nullable().optional(),
    status: z.enum(["active", "inactive"]).default("active"),
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
  const customer = await prisma.customer.create({
    data: {
      organizationId: ctx.organizationId,
      name: d.name,
      email: d.email,
      phone: d.phone,
      gstin: d.gstin,
      status: d.status,
      notes: d.notes,
    },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "CUSTOMER_CREATE",
      entityType: "customer",
      entityId: customer.id,
      metadata: { name: customer.name, manual: true },
    },
    req
  );

  return ok({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    gstin: customer.gstin,
    status: customer.status,
    notes: customer.notes,
    totalOutstanding: 0,
    totalOverdue: 0,
    riskScore: 0,
    lastPaymentAt: null,
    createdAt: customer.createdAt.toISOString(),
  } satisfies CustomerSummaryInput);
});

type CustomerSummaryInput = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  status: string;
  notes: string | null;
  totalOutstanding: number;
  totalOverdue: number;
  riskScore: number | null;
  lastPaymentAt: string | null;
  createdAt: string;
};
