import { ok, withAuth } from "@/lib/server-context";
import { listPromises } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const promises = await listPromises(ctx.organizationId);
  return ok(promises);
});
