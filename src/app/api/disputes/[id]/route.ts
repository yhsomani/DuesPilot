import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { resolveDispute } from "@/lib/collections";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["resolved", "withdrawn", "rejected"]),
  notes: z.string().optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const id = params?.id;
  if (!id) return err("Missing dispute id", 400);

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  await resolveDispute(ctx.organizationId, ctx.userId, id, parsed.data);
  return ok({ updated: true });
});