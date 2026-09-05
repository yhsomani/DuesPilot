import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { createPromise } from "@/lib/collections";
import { listPromises } from "@/lib/repo";
import { z } from "zod";

const schema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  promiseDate: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  source: z.string().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
});

export const GET = withAuth(async (_req, ctx) => {
  const promises = await listPromises(ctx.organizationId);
  return ok(promises);
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const promise = await createPromise(ctx.organizationId, ctx.userId, {
    ...parsed.data,
    idempotencyKey: req.headers.get("idempotency-key"),
  });
  return ok(promise, 201);
});