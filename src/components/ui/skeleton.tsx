import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/70", className)}
      {...props}
    />
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="p-4">
          <div className="h-4 bg-slate-200/80 rounded-md w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-slate-200 rounded-md" />
        <div className="h-8 w-8 bg-slate-200 rounded-xl" />
      </div>
      <div className="mt-4 h-7 w-28 bg-slate-200 rounded-lg" />
      <div className="mt-3 h-3 w-36 bg-slate-100 rounded-md" />
    </div>
  );
}
