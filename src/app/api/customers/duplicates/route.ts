import { ok, withAuth } from "@/lib/server-context";
import { listDuplicateGroups } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const groups = await listDuplicateGroups(ctx.organizationId);
  return ok(groups);
});