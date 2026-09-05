import { withAuth, VIEW_ROLES, requireRole, ok } from "@/lib/server-context";
import { getOrganizationSubscription, PLAN_DEFINITIONS } from "@/lib/billing";

export const GET = withAuth(async (_req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const subscription = await getOrganizationSubscription(ctx.organizationId);

  return ok({
    subscription,
    plans: Object.values(PLAN_DEFINITIONS),
  });
});
