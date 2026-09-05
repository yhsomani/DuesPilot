"use client";

import type { PlanDefinition, BillingCycle } from "@/lib/billing";
import { formatINR } from "@/lib/utils";

interface PlanCardProps {
  plan: PlanDefinition;
  billingCycle: BillingCycle;
  currentTier: string;
  isCurrent: boolean;
  onSelect: (tier: string) => void;
  loading?: boolean;
}

export function PlanCard({
  plan,
  billingCycle,
  currentTier,
  isCurrent,
  onSelect,
  loading,
}: PlanCardProps) {
  const price =
    billingCycle === "yearly" ? plan.yearlyPriceINR / 12 : plan.monthlyPriceINR;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 transition-all shadow-xs ${
        isCurrent
          ? "border-2 border-blue-600 bg-blue-50/20"
          : plan.popular
          ? "border-2 border-blue-500 bg-white ring-2 ring-blue-500/20"
          : "border border-gray-200 bg-white"
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white uppercase tracking-wider shadow-sm">
          Most Popular
        </span>
      )}

      {isCurrent && (
        <span className="absolute -top-3 right-6 rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold text-white uppercase tracking-wider shadow-sm">
          Current Plan
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <p className="mt-1 text-xs text-gray-500 min-h-[32px]">{plan.tagline}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-gray-900">
          {price === 0 ? "Free" : formatINR(price)}
        </span>
        {price > 0 && (
          <span className="text-xs text-gray-500 font-medium">/ month</span>
        )}
      </div>

      {billingCycle === "yearly" && plan.yearlyPriceINR > 0 && (
        <p className="mb-4 text-xs font-medium text-emerald-600">
          Billed annually ({formatINR(plan.yearlyPriceINR)}/yr) — Save 17%
        </p>
      )}

      <button
        onClick={() => onSelect(plan.tier)}
        disabled={isCurrent || loading}
        className={`w-full rounded-xl py-2.5 px-4 text-xs font-semibold transition shadow-xs ${
          isCurrent
            ? "bg-gray-100 text-gray-400 cursor-default"
            : plan.popular
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-900 text-white hover:bg-gray-800"
        }`}
      >
        {isCurrent ? "Active Plan" : `Upgrade to ${plan.name}`}
      </button>

      <div className="mt-6 border-t border-gray-100 pt-6 flex-1">
        <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
          Plan Features
        </p>
        <ul className="space-y-2.5">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <svg
                className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
