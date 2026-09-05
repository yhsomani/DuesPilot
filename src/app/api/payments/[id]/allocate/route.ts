import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { allocatePaymentManual } from "@/lib/collections";
import { z } from "zod";

const allocationItem = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

const schema = z.object({
  allocations: z.array(allocationItem).min(1),
});

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const id = params?.id;
  if (!id) return err("Missing payment id", 400);

  const result = await allocatePaymentManual(
    ctx.organizationId,
    ctx.userId,
    id,
    parsed.data.allocations
  );
  return ok(result);
});