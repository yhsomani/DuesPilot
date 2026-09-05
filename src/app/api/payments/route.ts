import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import {
  listPayments,
  queryPayments,
  recordPayment,
} from "@/lib/collections";
import { z } from "zod";

const allocationItem = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

const schema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  mode: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  allocations: z.array(allocationItem).optional(),
});

export const GET = withAuth(async (req, ctx) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const pageRaw = url.searchParams.get("page");
  const pageSizeRaw = url.searchParams.get("pageSize");

  if (pageRaw === null && !search && !status) {
    const payments = await listPayments(ctx.organizationId);
    return ok(payments);
  }

  const result = await queryPayments(ctx.organizationId, {
    search,
    status,
    page: pageRaw ? Number(pageRaw) : undefined,
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
  });
  return ok(result);
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await recordPayment(ctx.organizationId, ctx.userId, {
    ...parsed.data,
    idempotencyKey: req.headers.get("idempotency-key"),
  });
  return ok(result, 201);
});