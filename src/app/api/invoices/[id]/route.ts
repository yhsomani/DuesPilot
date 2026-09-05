import { err, ok, withAuth } from "@/lib/server-context";
import { getInvoiceDetail } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Missing invoice id", 400);
  const detail = await getInvoiceDetail(ctx.organizationId, id);
  if (!detail) return err("Invoice not found", 404);
  return ok(detail);
});