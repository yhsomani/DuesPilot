"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import type { AnalyticsData } from "@/lib/metrics";
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";

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
        if (active) setError(e instanceof Error ? e.message : "Failed to load analytics");
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Collection Analytics & Intelligence
            </h1>
            <Badge variant="primary" size="sm">
              Live Real-Time
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Real-time DSO velocity, Collection Effectiveness Index (CEI), aging roll rates, and cash forecast.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetryKey((n) => n + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Refresh Analytics</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-bold">Failed to load analytics metrics</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <button
              onClick={() => setRetryKey((n) => n + 1)}
              className="mt-2 text-xs font-semibold text-red-900 underline hover:text-red-950"
            >
              Try reloading
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      ) : analytics ? (
        <>
          {/* Top 4 Primary Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.kpis.map((kpi, idx) => {
              const icons = [TrendingUp, Clock, AlertTriangle, CheckCircle2];
              const Icon = icons[idx % icons.length];
              const isGood =
                idx === 0
                  ? (kpi.value ?? 0) >= 70
                  : idx === 1
                  ? (kpi.value ?? 0) <= 45
                  : idx === 3
                  ? (kpi.value ?? 0) >= 60
                  : (kpi.value ?? 0) <= 20;

              return (
                <StatCard
                  key={kpi.label}
                  title={kpi.label}
                  value={
                    kpi.value == null
                      ? "—"
                      : `${kpi.value.toLocaleString("en-IN")}${kpi.suffix}`
                  }
                  subtitle={kpi.hint}
                  icon={Icon}
                  variant={isGood ? "blue" : "warning"}
                />
              );
            })}
          </div>

          {/* Middle Row: Monthly Collections Chart + Pipeline Health Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Collections Velocity Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-gray-900 text-base">Monthly Recovery Velocity</h2>
                  <Badge variant="success" size="sm">
                    Rolling 6M
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                  Cash collected and reconciled across all payment modes (UPI, NEFT, IMPS, Cheques)
                </p>
              </div>

              <div className="flex items-end gap-3 h-48 pt-4 pb-2 border-b border-gray-100">
                {analytics.series.map((s) => {
                  const heightPercent = maxSeries > 0 ? (s.collected / maxSeries) * 100 : 0;
                  return (
                    <div key={s.month} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <span className="text-[10px] text-gray-500 font-mono font-bold group-hover:text-blue-600 transition-colors">
                        {s.collected > 0 ? `₹${Math.round(s.collected / 1000)}k` : "—"}
                      </span>
                      <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden h-36 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            s.collected > 0
                              ? "bg-gradient-to-t from-blue-600 to-blue-500 group-hover:from-blue-500 group-hover:to-blue-400"
                              : "bg-gray-200"
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900">
                        {s.month}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Bank Receipt Allocations
                </span>
                <span className="font-mono font-bold text-gray-800">
                  Total 6M:{" "}
                  {formatINR(analytics.series.reduce((sum, s) => sum + s.collected, 0))}
                </span>
              </div>
            </div>

            {/* Pipeline Health & Recovery Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-gray-900 text-base">Collection Pipeline Health</h2>
                  <Badge variant="primary" size="sm">
                    Status Audit
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-5">
                  Real-time segmentation of receivables requiring collector intervention
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Overdue Queue */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/75 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Debtors in Action Queue</p>
                      <p className="text-[11px] text-gray-500">Unsettled overdue accounts</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-900">
                    {queue.length} Accounts
                  </span>
                </div>

                {/* Active Promises */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <Clock className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Active PTP Commitments</p>
                      <p className="text-[11px] text-gray-500">Promised future payment milestones</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-amber-700">
                    {analytics.activePromises} PTPs
                  </span>
                </div>

                {/* Open Disputes */}
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Active Invoice Disputes</p>
                      <p className="text-[11px] text-gray-500">Commercial billing grievances</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-purple-700">
                    {analytics.openDisputes} Disputes
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Next automated dunning run:</span>
                <span className="font-bold text-gray-800">Tomorrow at 09:30 AM IST</span>
              </div>
            </div>
          </div>

          {/* Bottom Table: Top Overdue Debtors Ranked */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/75">
              <div>
                <h2 className="font-bold text-gray-900 text-base">Top Overdue Debtors</h2>
                <p className="text-xs text-gray-500">Accounts with highest aging exposure requiring escalation</p>
              </div>
              <Link href="/dashboard/queue">
                <Button variant="secondary" size="sm" className="gap-1 text-xs">
                  <span>Open Collection Queue</span>
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>

            {topOverdue.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No overdue debtors currently in the collection queue.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topOverdue.map((c, i) => (
                  <div
                    key={c.id}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/75 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600 font-mono">
                        {i + 1}
                      </span>
                      <div>
                        <Link
                          href={`/dashboard/customers/${c.customerId}`}
                          className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {c.customer}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.why || `${c.status} · Priority ${c.priority}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-sm font-mono font-bold text-red-600 block">
                          {formatINR(c.amount)}
                        </span>
                        <Badge variant="danger" size="sm" className="mt-0.5">
                          {c.daysOverdue}d overdue
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
