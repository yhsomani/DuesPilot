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
  variant?: "default" | "danger" | "warning" | "success" | "purple" | "blue";
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
      card: "bg-white border-slate-200/80 hover:border-slate-300",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      titleColor: "text-slate-500",
      valueColor: "text-slate-900",
    },
    danger: {
      card: "bg-gradient-to-b from-rose-50/40 to-white border-rose-200/80 hover:border-rose-300",
      iconBg: "bg-rose-100/70 text-rose-700 border-rose-200",
      titleColor: "text-rose-700",
      valueColor: "text-rose-950",
    },
    warning: {
      card: "bg-gradient-to-b from-amber-50/40 to-white border-amber-200/80 hover:border-amber-300",
      iconBg: "bg-amber-100/70 text-amber-700 border-amber-200",
      titleColor: "text-amber-800",
      valueColor: "text-amber-950",
    },
    success: {
      card: "bg-gradient-to-b from-emerald-50/40 to-white border-emerald-200/80 hover:border-emerald-300",
      iconBg: "bg-emerald-100/70 text-emerald-700 border-emerald-200",
      titleColor: "text-emerald-700",
      valueColor: "text-emerald-950",
    },
    purple: {
      card: "bg-gradient-to-b from-purple-50/40 to-white border-purple-200/80 hover:border-purple-300",
      iconBg: "bg-purple-100/70 text-purple-700 border-purple-200",
      titleColor: "text-purple-700",
      valueColor: "text-purple-950",
    },
    blue: {
      card: "bg-gradient-to-b from-sky-50/40 to-white border-sky-200/80 hover:border-sky-300",
      iconBg: "bg-sky-100/70 text-sky-700 border-sky-200",
      titleColor: "text-sky-700",
      valueColor: "text-sky-950",
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-5 shadow-xs transition-all duration-200",
        config.card,
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold uppercase tracking-wider", config.titleColor)}>
          {title}
        </span>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border", config.iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className={cn("text-2xl font-bold tracking-tight font-tabular", config.valueColor)}>
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold rounded-md px-1.5 py-0.5 text-[11px]",
                trend.neutral
                  ? "bg-slate-100 text-slate-700"
                  : trend.positive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                  : "bg-rose-50 text-rose-700 border border-rose-200/50"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
