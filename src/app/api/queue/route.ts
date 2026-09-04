import { ok, withAuth } from "@/lib/server-context";
import { getQueue } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const queue = await getQueue(ctx.organizationId);
  return ok(queue);
});
