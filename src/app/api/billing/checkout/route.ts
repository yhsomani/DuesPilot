import { withAuth, MANAGE_ROLES, requireRole, ok, err, readJson } from "@/lib/server-context";
import { PLAN_DEFINITIONS, PlanTier, BillingCycle } from "@/lib/billing";
import { writeAudit } from "@/lib/audit";

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = ((await readJson(req)) || {}) as Record<string, unknown>;
  const planTier = body.planTier as PlanTier;
  const billingCycle = ((body.billingCycle as string) || "monthly") as BillingCycle;

  if (!planTier || !PLAN_DEFINITIONS[planTier]) {
    return err("Invalid planTier selected. Choose FREE, STARTER, GROWTH, or PRO.", 400);
  }

  const selectedPlan = PLAN_DEFINITIONS[planTier];
  const amountINR =
    billingCycle === "yearly"
      ? selectedPlan.yearlyPriceINR
      : selectedPlan.monthlyPriceINR;

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const checkoutUrl = `/dashboard/settings?tab=billing&upgraded=${planTier}`;

  // Write audit log
  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "SETTINGS_UPDATE",
      entityType: "billing",
      metadata: {
        planTier,
        billingCycle,
        amountINR,
        orderId,
      },
    },
    req
  );

  return ok({
    success: true,
    orderId,
    amountINR,
    currency: "INR",
    planTier,
    billingCycle,
    checkoutUrl,
    message: `Subscription configured for ${selectedPlan.name} (${billingCycle}).`,
  });
});
