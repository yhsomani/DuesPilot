import { ok, withAuth } from "@/lib/server-context";
import { listNotifications } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const notifications = await listNotifications(ctx.organizationId);
  return ok(notifications);
});