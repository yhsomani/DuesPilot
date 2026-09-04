import { ok, withAuth } from "@/lib/server-context";
import { getDashboard } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const data = await getDashboard(ctx.organizationId);
  return ok(data);
});
