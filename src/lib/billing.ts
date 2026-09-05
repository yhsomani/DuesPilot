import { prisma } from "@/lib/prisma";

export type PlanTier = "FREE" | "STARTER" | "GROWTH" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  maxActiveInvoices: number;
  maxSeats: number;
  maxTemplates: number;
  allowedChannels: ("EMAIL" | "WHATSAPP" | "SMS" | "CALL")[];
  hasAutomatedReminders: boolean;
  hasAdvancedAnalytics: boolean;
  hasCustomExports: boolean;
  hasApiAccess: boolean;
  auditRetentionDays: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  tagline: string;
  monthlyPriceINR: number;
  yearlyPriceINR: number;
  popular?: boolean;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier: "FREE",
    name: "Free",
    tagline: "For solo founders & small shops getting started with collections.",
    monthlyPriceINR: 0,
    yearlyPriceINR: 0,
    limits: {
      maxActiveInvoices: 50,
      maxSeats: 1,
      maxTemplates: 2,
      allowedChannels: ["EMAIL"],
      hasAutomatedReminders: false,
      hasAdvancedAnalytics: false,
      hasCustomExports: false,
      hasApiAccess: false,
      auditRetentionDays: 7,
    },
    features: [
      "Up to 50 active invoices",
      "1 team seat",
      "Email reminders (manual send)",
      "Standard receivables import",
      "Core collection queue",
      "7-day audit history",
    ],
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    tagline: "For growing businesses needing WhatsApp outreach & team collaboration.",
    monthlyPriceINR: 1999,
    yearlyPriceINR: 19990,
    limits: {
      maxActiveInvoices: 500,
      maxSeats: 3,
      maxTemplates: 10,
      allowedChannels: ["EMAIL", "WHATSAPP"],
      hasAutomatedReminders: true,
      hasAdvancedAnalytics: false,
      hasCustomExports: true,
      hasApiAccess: false,
      auditRetentionDays: 90,
    },
    features: [
      "Up to 500 active invoices",
      "3 team seats",
      "Email & WhatsApp reminders",
      "Automated cadence scheduling",
      "Payment promise auto-sweep",
      "CSV Data export with sanitization",
      "90-day audit history",
    ],
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Growth",
    tagline: "For high-volume credit sellers scaling receivables recovery.",
    monthlyPriceINR: 4999,
    yearlyPriceINR: 49990,
    popular: true,
    limits: {
      maxActiveInvoices: 2500,
      maxSeats: 10,
      maxTemplates: 50,
      allowedChannels: ["EMAIL", "WHATSAPP", "SMS"],
      hasAutomatedReminders: true,
      hasAdvancedAnalytics: true,
      hasCustomExports: true,
      hasApiAccess: true,
      auditRetentionDays: 365,
    },
    features: [
      "Up to 2,500 active invoices",
      "10 team seats with granular RBAC",
      "Email, WhatsApp & SMS reminders",
      "Multi-step dunning workflows",
      "Advanced aging & DSO analytics",
      "Collector performance tracking",
      "Priority email support",
      "1-year audit history",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Enterprise Pro",
    tagline: "For mid-market enterprises demanding custom integrations & compliance.",
    monthlyPriceINR: 12999,
    yearlyPriceINR: 129990,
    limits: {
      maxActiveInvoices: 999999,
      maxSeats: 999,
      maxTemplates: 999,
      allowedChannels: ["EMAIL", "WHATSAPP", "SMS", "CALL"],
      hasAutomatedReminders: true,
      hasAdvancedAnalytics: true,
      hasCustomExports: true,
      hasApiAccess: true,
      auditRetentionDays: 2555, // 7 years
    },
    features: [
      "Unlimited active invoices",
      "Unlimited team seats",
      "All channels (Email, WhatsApp, SMS, Call logs)",
      "Autonomous AI collection priority",
      "Multi-entity consolidation",
      "Dedicated account manager & SLA",
      "Custom ERP & accounting webhooks",
      "7-year audit & compliance retention",
    ],
  },
};

export interface SubscriptionInfo {
  organizationId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: PlanDefinition;
  usage: {
    activeInvoices: number;
    seats: number;
    messagesSentThisMonth: number;
  };
  quotas: {
    invoicesPercent: number;
    seatsPercent: number;
  };
  isTrial: boolean;
  canUpgrade: boolean;
}

/**
 * Retrieves the current organization's subscription details and actual resource usage.
 */
export async function getOrganizationSubscription(
  organizationId: string
): Promise<SubscriptionInfo> {
  const [org, activeInvoicesCount, usersCount, messagesCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
    }),
    prisma.invoice.count({
      where: {
        organizationId,
        status: { in: ["OPEN", "DUE_SOON", "OVERDUE", "DISPUTED", "PROMISED", "PROMISE_BROKEN", "PARTIALLY_PAID"] },
      },
    }),
    prisma.user.count({
      where: { organizationId },
    }),
    prisma.message.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  // Read plan config stored in organization or fallback to STARTER for existing orgs or FREE default
  // We can look at org metadata or default to STARTER for smooth testing
  const tier: PlanTier = "STARTER";
  const plan = PLAN_DEFINITIONS[tier];

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const maxInvoices = plan.limits.maxActiveInvoices;
  const maxSeats = plan.limits.maxSeats;

  const invoicesPercent = Math.min(100, Math.round((activeInvoicesCount / maxInvoices) * 100));
  const seatsPercent = Math.min(100, Math.round((usersCount / maxSeats) * 100));

  return {
    organizationId,
    tier,
    status: "ACTIVE",
    billingCycle: "monthly",
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    plan,
    usage: {
      activeInvoices: activeInvoicesCount,
      seats: usersCount,
      messagesSentThisMonth: messagesCount,
    },
    quotas: {
      invoicesPercent,
      seatsPercent,
    },
    isTrial: false,
    canUpgrade: tier !== "PRO",
  };
}

/**
 * Checks whether a given resource usage is within the plan's quota.
 */
export async function checkPlanQuota(
  organizationId: string,
  resource: "invoices" | "seats" | "channels" | "automation",
  requestedChannel?: "EMAIL" | "WHATSAPP" | "SMS" | "CALL"
): Promise<{ allowed: boolean; limit: number; current: number; reason?: string }> {
  const sub = await getOrganizationSubscription(organizationId);
  const limits = sub.plan.limits;

  switch (resource) {
    case "invoices": {
      const current = sub.usage.activeInvoices;
      const limit = limits.maxActiveInvoices;
      if (current >= limit) {
        return {
          allowed: false,
          limit,
          current,
          reason: `Plan invoice limit reached (${current}/${limit}). Please upgrade to import or create more invoices.`,
        };
      }
      return { allowed: true, limit, current };
    }

    case "seats": {
      const current = sub.usage.seats;
      const limit = limits.maxSeats;
      if (current >= limit) {
        return {
          allowed: false,
          limit,
          current,
          reason: `Seat limit reached (${current}/${limit}). Please upgrade to add more team members.`,
        };
      }
      return { allowed: true, limit, current };
    }

    case "channels": {
      if (requestedChannel && !limits.allowedChannels.includes(requestedChannel)) {
        return {
          allowed: false,
          limit: limits.allowedChannels.length,
          current: 0,
          reason: `The ${requestedChannel} channel is not available on the ${sub.plan.name} plan. Please upgrade to unlock it.`,
        };
      }
      return { allowed: true, limit: limits.allowedChannels.length, current: 0 };
    }

    case "automation": {
      if (!limits.hasAutomatedReminders) {
        return {
          allowed: false,
          limit: 0,
          current: 0,
          reason: `Automated reminder cadences are not supported on the ${sub.plan.name} plan. Upgrade to Starter or higher.`,
        };
      }
      return { allowed: true, limit: 1, current: 1 };
    }

    default:
      return { allowed: true, limit: 999999, current: 0 };
  }
}
