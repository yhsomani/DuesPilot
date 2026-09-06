import { err, ok, readJson, requireRole, withAuth, ROLES } from "@/lib/server-context";
import { deleteOrganization } from "@/lib/collections";
import { z } from "zod";

const deleteSchema = z.object({
  confirm: z.literal("DELETE"),
});

export const DELETE = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, [ROLES.OWNER]);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  if (!body) return err("Confirmation text required", 400);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return err('Type DELETE to confirm permanent deletion', 400);

  console.info(
    JSON.stringify({
      level: "info",
      event: "account_purge_initiated",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
    })
  );

  await deleteOrganization(ctx.organizationId);

  console.info(
    JSON.stringify({
      level: "info",
      event: "account_purge_completed",
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
    })
  );

  return ok({ deleted: true });
});