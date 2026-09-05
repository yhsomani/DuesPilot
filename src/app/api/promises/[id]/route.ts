import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { updatePromiseStatus } from "@/lib/collections";
import type { PromiseStatusView } from "@/lib/types";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["KEPT", "BROKEN", "RENEGOTIATED"]),
  amount: z.number().positive().optional(),
  promiseDate: z.string().optional(),
  note: z.string().optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const id = params?.id;
  if (!id) return err("Missing promise id", 400);

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const promise = await updatePromiseStatus(ctx.organizationId, ctx.userId, id, {
    status: parsed.data.status as PromiseStatusView,
    amount: parsed.data.amount,
    promiseDate: parsed.data.promiseDate,
    note: parsed.data.note,
  });
  return ok(promise);
});