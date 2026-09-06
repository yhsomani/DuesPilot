import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "danger" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variantStyles = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm border border-transparent focus-visible:ring-blue-600",
      secondary:
        "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 shadow-sm focus-visible:ring-blue-600",
      outline:
        "bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-600",
      destructive:
        "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm border border-transparent focus-visible:ring-red-500",
      danger:
        "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm border border-transparent focus-visible:ring-red-500",
      ghost:
        "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-blue-600",
      link:
        "bg-transparent text-blue-600 p-0 h-auto font-medium underline-offset-4 hover:underline focus-visible:ring-blue-600",
    };

    const sizeStyles = {
      sm: "h-8 px-3 py-1.5 text-sm font-medium rounded-md gap-1.5",
      md: "h-10 px-4 py-2.5 text-sm font-semibold rounded-lg gap-2",
      lg: "h-12 px-6 py-3 text-base font-semibold rounded-xl gap-2.5",
      icon: "h-10 w-10 p-0 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
