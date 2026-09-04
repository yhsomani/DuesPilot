import { ok, withAuth } from "@/lib/server-context";
import { listInvoices } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx) => {
  const invoices = await listInvoices(ctx.organizationId);
  return ok(invoices);
});
