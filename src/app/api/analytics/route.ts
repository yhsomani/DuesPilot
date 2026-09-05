import { ok, withAuth } from "@/lib/server-context";
import { computeAnalytics } from "@/lib/metrics";

export const GET = withAuth(async (_req, ctx) => {
  const data = await computeAnalytics(ctx.organizationId);
  return ok(data);
});