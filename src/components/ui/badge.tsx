import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "primary"
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
    default: "bg-gray-200 text-gray-700 border-gray-300",
    secondary: "bg-gray-100 text-gray-600 border-gray-200",
    primary: "bg-blue-100 text-blue-700 border-blue-200",
    destructive: "bg-red-100 text-red-700 border-red-200",
    danger: "bg-red-100 text-red-700 border-red-200",
    outline: "bg-transparent text-gray-700 border-gray-300",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    blue: "bg-sky-100 text-sky-700 border-sky-200",
    neutral: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-semibold tracking-wide",
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
