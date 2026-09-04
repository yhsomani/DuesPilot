"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { QueueItem } from "@/lib/types";

export default function AnalyticsPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const topOverdue = [...queue]
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Collection performance — currently showing live queue data.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">
          KPI metrics not available yet
        </h3>
        <p className="mt-1 text-sm text-amber-800">
          Leading indicators (DSO, Collection Effectiveness Index, Promise
          Adherence, Automation Rate) will appear here once enough historical
          payment and promise data has been collected.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading analytics…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top Overdue Customers</h2>
          </div>
          {topOverdue.length === 0 ? (
            <p className="px-6 py-10 text-sm text-gray-500">
              No overdue customers yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {topOverdue.map((c, i) => (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-5">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {c.customer}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-red-600 font-medium">
                      {formatINR(c.amount)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {c.daysOverdue}d overdue
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
