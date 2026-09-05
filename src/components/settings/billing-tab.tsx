"use client";

import { useEffect, useState } from "react";
import { api, apiPost } from "@/lib/api";
import type { SubscriptionInfo, PlanDefinition, BillingCycle } from "@/lib/billing";
import { PlanCard } from "@/components/billing/plan-card";
import { formatINR } from "@/lib/utils";

export function BillingTab() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{
        subscription: SubscriptionInfo;
        plans: PlanDefinition[];
      }>("/api/billing/subscription");
      setSubscription(res.subscription);
      setPlans(res.plans);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscription info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSelectPlan = async (tier: string) => {
    setUpgradingTier(tier);
    setError(null);
    setUpgradeSuccess(null);
    try {
      const res = await apiPost<{
        success: boolean;
        message: string;
      }>("/api/billing/checkout", {
        planTier: tier,
        billingCycle,
      });

      setUpgradeSuccess(res.message || `Successfully upgraded to ${tier}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process plan change");
    } finally {
      setUpgradingTier(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500 py-6">Loading billing information…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
        </div>
      )}

      {upgradeSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <p className="font-medium">{upgradeSuccess}</p>
          </div>
          <button
            onClick={() => setUpgradeSuccess(null)}
            className="text-xs text-green-700 hover:text-green-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Current Subscription Card */}
      {subscription && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-gray-900">
                  {subscription.plan.name} Plan
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {subscription.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Current billing period ends on{" "}
                <strong className="text-gray-700">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-gray-900">
                {subscription.plan.monthlyPriceINR === 0
                  ? "₹0"
                  : formatINR(subscription.plan.monthlyPriceINR)}
              </span>
              <span className="text-xs text-gray-500">/ month</span>
            </div>
          </div>

          {/* Usage Meters */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Resource Usage & Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Invoices Meter */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Active Invoices</span>
                  <span className="font-bold text-gray-900">
                    {subscription.usage.activeInvoices} /{" "}
                    {subscription.plan.limits.maxActiveInvoices.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      subscription.quotas.invoicesPercent > 90
                        ? "bg-red-500"
                        : subscription.quotas.invoicesPercent > 70
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.max(4, subscription.quotas.invoicesPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  {subscription.quotas.invoicesPercent}% of plan limit utilized
                </p>
              </div>

              {/* Seats Meter */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Team Seats</span>
                  <span className="font-bold text-gray-900">
                    {subscription.usage.seats} / {subscription.plan.limits.maxSeats}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      subscription.quotas.seatsPercent > 90
                        ? "bg-red-500"
                        : subscription.quotas.seatsPercent > 70
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.max(10, subscription.quotas.seatsPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  {subscription.quotas.seatsPercent}% of seats assigned
                </p>
              </div>

              {/* Messages Meter */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Messages Sent (Month)</span>
                  <span className="font-bold text-gray-900">
                    {subscription.usage.messagesSentThisMonth}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(8, subscription.usage.messagesSentThisMonth * 2)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Across Email, WhatsApp & SMS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Tiers Selection */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Available Plans</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Scale your collections capacity and unlock multi-channel automation.
            </p>
          </div>

          {/* Billing Cycle Switch */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>Annual</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              billingCycle={billingCycle}
              currentTier={subscription?.tier || "FREE"}
              isCurrent={subscription?.tier === plan.tier}
              onSelect={handleSelectPlan}
              loading={upgradingTier === plan.tier}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
