import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  sizeVariant?: "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, sizeVariant = "md", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 shadow-sm",
          sizeVariant === "lg" ? "h-12 px-4 py-3 text-base" : "h-10 px-4 py-2 text-sm",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30 bg-red-50/20",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
