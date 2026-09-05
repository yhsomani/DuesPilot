import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { reversePayment } from "@/lib/collections";
import { z } from "zod";

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = z
    .object({ action: z.literal("reverse") })
    .safeParse(body);
  if (!parsed.success) return err("Unsupported action", 400);

  const id = params?.id;
  if (!id) return err("Missing payment id", 400);

  await reversePayment(ctx.organizationId, ctx.userId, id);
  return ok({ reversed: true });
});