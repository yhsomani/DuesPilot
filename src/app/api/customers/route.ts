import { ok, withAuth } from "@/lib/server-context";
import { listCustomers } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const customers = await listCustomers(ctx.organizationId);
  return ok(customers);
});
