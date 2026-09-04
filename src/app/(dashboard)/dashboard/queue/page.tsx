"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { QueueItem } from "@/lib/types";

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<QueueItem[]>("/api/queue");
        if (active) setQueue(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    filter === "all" ? queue : queue.filter((q) => q.priority === filter);

  const totalOverdue = queue.reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Today&apos;s prioritized actions — {formatINR(totalOverdue)} overdue
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading queue…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-2">
            {(["all", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === p
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                {p !== "all" && (
                  <span className="ml-1 text-xs">
                    ({queue.filter((q) => q.priority === p).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-500">
                No overdue accounts in your queue.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/customers/${item.customerId}`}
                    className="px-6 py-5 hover:bg-gray-50 transition-colors cursor-pointer block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
                            item.priority === "high"
                              ? "bg-red-50 border border-red-200"
                              : item.priority === "medium"
                              ? "bg-orange-50 border border-orange-200"
                              : "bg-green-50 border border-green-200"
                          }`}
                        >
                          <span
                            className={`font-bold text-xs ${
                              item.priority === "high"
                                ? "text-red-700"
                                : item.priority === "medium"
                                ? "text-orange-700"
                                : "text-green-700"
                            }`}
                          >
                            {item.initials}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {item.customer}
                            </p>
                            {item.promiseBroken && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 uppercase">
                                Promise broken
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatINR(item.amount)} · {item.daysOverdue} days overdue ·{" "}
                            {item.status}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Last: {item.lastAction}</span>
                            <span>Next: {item.nextAction}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <span
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                            item.priority === "high"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : item.priority === "medium"
                              ? "bg-orange-50 border-orange-200 text-orange-700"
                              : "bg-green-50 border-green-200 text-green-700"
                          }`}
                        >
                          {item.nextAction}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
