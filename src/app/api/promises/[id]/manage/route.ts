import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { managePromise } from "@/lib/collections";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["mark_broken", "mark_kept", "add_note"]),
  note: z.string().min(1).max(2000),
});

export const POST = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const id = params?.id;
  if (!id) return err("Missing promise id", 400);

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  await managePromise(ctx.organizationId, ctx.userId, id, parsed.data);
  return ok({ updated: true });
});