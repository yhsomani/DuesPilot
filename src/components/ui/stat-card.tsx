import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    label?: string;
    positive?: boolean;
    neutral?: boolean;
  };
  variant?: "default" | "danger" | "warning" | "success" | "purple" | "blue" | "neutral";
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  onClick,
  className,
}: StatCardProps) {
  const variantConfig = {
    default: {
      card: "bg-white border-gray-200 hover:border-gray-300",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      titleColor: "text-gray-600",
      valueColor: "text-gray-900",
    },
    neutral: {
      card: "bg-white border-gray-200 hover:border-gray-300",
      iconBg: "bg-gray-100 text-gray-700 border-gray-200",
      titleColor: "text-gray-600",
      valueColor: "text-gray-900",
    },
    danger: {
      card: "bg-white border-red-200 hover:border-red-300",
      iconBg: "bg-red-50 text-red-600 border-red-100",
      titleColor: "text-red-700",
      valueColor: "text-red-950",
    },
    warning: {
      card: "bg-white border-amber-200 hover:border-amber-300",
      iconBg: "bg-amber-50 text-amber-700 border-amber-100",
      titleColor: "text-amber-800",
      valueColor: "text-amber-950",
    },
    success: {
      card: "bg-white border-green-200 hover:border-green-300",
      iconBg: "bg-green-50 text-green-700 border-green-100",
      titleColor: "text-green-700",
      valueColor: "text-green-950",
    },
    purple: {
      card: "bg-white border-purple-200 hover:border-purple-300",
      iconBg: "bg-purple-50 text-purple-700 border-purple-100",
      titleColor: "text-purple-700",
      valueColor: "text-purple-950",
    },
    blue: {
      card: "bg-white border-sky-200 hover:border-sky-300",
      iconBg: "bg-sky-50 text-sky-700 border-sky-100",
      titleColor: "text-sky-700",
      valueColor: "text-sky-950",
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border p-6 shadow-sm transition-all duration-200 bg-white",
        config.card,
        onClick && "cursor-pointer card-hover-lift",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", config.titleColor)}>
          {title}
        </span>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", config.iconBg)}>
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={cn("text-2xl font-bold tracking-tight font-tabular", config.valueColor)}>
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold rounded-md px-1.5 py-0.5 text-xs",
                trend.neutral
                  ? "bg-gray-100 text-gray-700"
                  : trend.positive
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-gray-600 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
