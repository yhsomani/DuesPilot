import { err, ok, withAuth } from "@/lib/server-context";
import { getCustomerDetail } from "@/lib/repo";

export const GET = withAuth(async (_req, ctx, params) => {
  const id = params?.id;
  if (!id) return err("Missing customer id", 400);
  const customer = await getCustomerDetail(ctx.organizationId, id);
  if (!customer) return err("Customer not found", 404);
  return ok(customer);
});
