"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import type { AnalyticsData } from "@/lib/metrics";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [a, q] = await Promise.all([
          api<AnalyticsData>("/api/analytics"),
          api<QueueItem[]>("/api/queue"),
        ]);
        if (!active) return;
        setAnalytics(a);
        setQueue(q);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retryKey]);

  const topOverdue = [...queue]
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 6);

  const maxSeries = Math.max(1, ...(analytics?.series.map((s) => s.collected) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Collection performance metrics computed from live data.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading analytics…</p>}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={() => setRetryKey((n) => n + 1)}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && analytics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {kpi.value == null ? "—" : `${kpi.value.toLocaleString("en-IN")}${kpi.suffix}`}
                </p>
                <p className="mt-1 text-xs text-gray-400">{kpi.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly collections</h2>
              <div className="flex items-end gap-3 h-40">
                {analytics.series.map((s) => (
                  <div key={s.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {s.collected > 0 ? `₹${Math.round(s.collected / 1000)}k` : ""}
                    </span>
                    <div
                      className={`w-full rounded-t-md ${s.collected > 0 ? "bg-blue-600" : "bg-gray-100"}`}
                      style={{ height: `${(s.collected / maxSeries) * 100}%` }}
                    />
                    <span className="text-[10px] text-gray-500">{s.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Pipeline health</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Open disputes</span>
                  <span className="font-semibold text-purple-700">{analytics.openDisputes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active promises (future)</span>
                  <span className="font-semibold text-yellow-700">{analytics.activePromises}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Customers in queue</span>
                  <span className="font-semibold text-gray-900">{queue.length}</span>
                </div>
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}