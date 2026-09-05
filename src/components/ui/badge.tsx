import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "danger"
    | "outline"
    | "success"
    | "warning"
    | "purple"
    | "blue"
    | "neutral";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-50 text-blue-700 border-blue-200/60",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    destructive: "bg-rose-50 text-rose-700 border-rose-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    outline: "bg-transparent text-slate-700 border-slate-300",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    blue: "bg-sky-50 text-sky-700 border-sky-200/80",
    neutral: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold tracking-wide",
    md: "px-2.5 py-1 text-xs font-semibold",
    lg: "px-3 py-1.5 text-sm font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
