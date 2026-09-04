"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  AgingBucket,
  DashboardStats,
  QueueItem,
} from "@/lib/types";

const bucketColors: Record<string, string> = {
  "1-30 days": "bg-yellow-500",
  "31-60 days": "bg-orange-500",
  "61-90 days": "bg-red-400",
  "90+ days": "bg-red-600",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dash, q] = await Promise.all([
          api<{ stats: DashboardStats; aging: AgingBucket[] }>("/api/dashboard"),
          api<QueueItem[]>("/api/queue"),
        ]);
        if (!active) return;
        setStats(dash.stats);
        setAging(dash.aging);
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
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your collections at a glance
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading dashboard…</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Receivables</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatINR(stats.totalReceivables)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Across all customers</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-red-600">Overdue</p>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {formatINR(stats.totalOverdue)}
              </p>
              <p className="mt-1 text-xs text-red-500">
                {stats.customersOverdue} customers
              </p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-yellow-600">Due Soon</p>
              <p className="mt-1 text-2xl font-bold text-yellow-700">
                {formatINR(stats.totalDueSoon)}
              </p>
              <p className="mt-1 text-xs text-yellow-500">Within 7 days</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-orange-600">Broken Promises</p>
              <p className="mt-1 text-2xl font-bold text-orange-700">
                {formatINR(stats.promiseBroken)}
              </p>
              <p className="mt-1 text-xs text-orange-500">Requires escalation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Aging Report */}
            <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Aging Overview</h2>
                <Link
                  href="/dashboard/analytics"
                  className="text-xs font-medium text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              {aging.length === 0 ? (
                <p className="text-sm text-gray-500">No outstanding invoices.</p>
              ) : (
                <div className="space-y-3">
                  {aging.map((bucket) => (
                    <div key={bucket.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{bucket.label}</span>
                        <span className="font-medium text-gray-900">
                          {formatINR(bucket.amount)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            bucketColors[bucket.label] ?? "bg-green-500"
                          }`}
                          style={{
                            width: `${
                              stats.totalReceivables > 0
                                ? (bucket.amount / stats.totalReceivables) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {bucket.count} invoices
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Collection Queue */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Today&apos;s Collection Queue
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatINR(stats.totalOverdue)} overdue ·{" "}
                    {stats.customersOverdue} customers
                  </p>
                </div>
                <Link
                  href="/dashboard/queue"
                  className="text-xs font-medium text-blue-600 hover:text-blue-500"
                >
                  View full queue
                </Link>
              </div>
              {queue.length === 0 ? (
                <p className="px-6 py-10 text-sm text-gray-500">
                  You&apos;re all caught up — no overdue invoices in your queue.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {queue.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/customers/${item.customerId}`}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-lg border flex items-center justify-center ${
                            item.priority === "high"
                              ? "bg-red-50 border-red-200"
                              : item.priority === "medium"
                              ? "bg-orange-50 border-orange-200"
                              : "bg-green-50 border-green-200"
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
                        <div>
                          <p className="font-semibold text-gray-900">{item.customer}</p>
                          <p className="text-sm text-gray-500">
                            {formatINR(item.amount)} · {item.daysOverdue} days overdue ·{" "}
                            {item.status}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          item.priority === "high"
                            ? "text-red-700 bg-red-50 border-red-200"
                            : item.priority === "medium"
                            ? "text-orange-700 bg-orange-50 border-orange-200"
                            : "text-green-700 bg-green-50 border-green-200"
                        }`}
                      >
                        {item.nextAction}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/import"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Import receivables
          </Link>
          <Link
            href="/dashboard/queue"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            View collection queue
          </Link>
          <Link
            href="/dashboard/customers"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Customer list
          </Link>
        </div>
      </div>
    </div>
  );
}
