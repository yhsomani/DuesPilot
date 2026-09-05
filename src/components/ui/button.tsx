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
        "bg-blue-600 text-white hover:bg-blue-700 shadow-xs active:scale-[0.98] border border-transparent focus-visible:ring-blue-500",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 active:scale-[0.98] focus-visible:ring-slate-400",
      outline:
        "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 hover:border-slate-400 shadow-2xs active:scale-[0.98] focus-visible:ring-slate-400",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.98] border border-transparent focus-visible:ring-rose-500",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:scale-[0.98] border border-transparent focus-visible:ring-rose-500",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-slate-400",
      link: "text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-500 p-0 h-auto",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-9.5 px-4 text-xs font-semibold rounded-xl gap-2",
      lg: "h-11 px-5 text-sm font-semibold rounded-xl gap-2.5",
      icon: "h-9 w-9 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
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
