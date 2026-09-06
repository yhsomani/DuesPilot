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
import {
  DollarSign,
  AlertCircle,
  Clock,
  CalendarCheck,
  ArrowUpRight,
  Upload,
  PhoneCall,
  Send,
  Users,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const bucketColors: Record<string, { bar: string; text: string; bg: string }> = {
  "1-30 days": { bar: "bg-amber-400", text: "text-amber-800", bg: "bg-amber-50" },
  "31-60 days": { bar: "bg-amber-500", text: "text-amber-900", bg: "bg-amber-50" },
  "61-90 days": { bar: "bg-red-400", text: "text-red-700", bg: "bg-red-50" },
  "90+ days": { bar: "bg-red-600", text: "text-red-900", bg: "bg-red-50" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
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
        const [dash, q] = await Promise.all([
          api<{ stats: DashboardStats; aging?: AgingBucket[]; agingBuckets?: AgingBucket[] }>("/api/dashboard"),
          api<QueueItem[]>("/api/queue"),
        ]);
        if (!active) return;
        setStats(dash?.stats ?? null);
        setAging(
          Array.isArray(dash?.aging)
            ? dash.aging
            : Array.isArray(dash?.agingBuckets)
            ? dash.agingBuckets
            : []
        );
        setQueue(Array.isArray(q) ? q : []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retryKey]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Overview</h1>
            <Badge variant="blue" size="sm" className="hidden sm:inline-flex">Live Ledger</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Real-time cash flow, overdue aging buckets, and prioritized daily dunning actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Refresh</span>
          </Button>
          <Link href="/dashboard/import">
            <Button size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              <span>Import Invoices</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 rounded-xl border border-gray-200 bg-white animate-pulse" />
            <div className="lg:col-span-2 h-64 rounded-xl border border-gray-200 bg-white animate-pulse" />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-bold">Failed to load dashboard metrics</p>
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

      {!loading && !error && stats && (
        <>
          {/* First-run onboarding banner */}
          {stats.totalReceivables === 0 && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-white p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
                  <Sparkles className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Your DuesPilot workspace is ready
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 max-w-xl leading-relaxed">
                    Import your outstanding B2B invoices via CSV or Tally XML to automatically calculate Section 15 statutory interest and build your intelligent collection queue.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/import" className="shrink-0">
                <Button size="sm">
                  Import Receivables →
                </Button>
              </Link>
            </div>
          )}

          {/* Broken Promise Alert Banner */}
          {stats.promiseBroken > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold shrink-0">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-950">
                    Broken Payment Commitments Detected
                  </p>
                  <p className="text-xs text-red-800 mt-0.5">
                    <strong>{formatINR(stats.promiseBroken)}</strong> in promised settlements passed their deadline without payment confirmation.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/promises" className="shrink-0">
                <Button variant="destructive" size="sm">
                  Review &amp; Escalate →
                </Button>
              </Link>
            </div>
          )}

          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Outstanding"
              value={formatINR(stats.totalReceivables)}
              subtitle="Total active ledger dues"
              icon={DollarSign}
              variant="default"
            />
            <StatCard
              title="Total Overdue"
              value={formatINR(stats.totalOverdue)}
              subtitle={`${stats.customersOverdue} debtor accounts`}
              icon={AlertCircle}
              variant="danger"
            />
            <StatCard
              title="Due Next 7 Days"
              value={formatINR(stats.totalDueSoon)}
              subtitle="Early reminder window"
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Broken Promises"
              value={formatINR(stats.promiseBroken)}
              subtitle="High-risk delinquency"
              icon={AlertTriangle}
              variant="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Aging Overview Card */}
            <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Aging Distribution
                  </h2>
                </div>
                <Link
                  href="/dashboard/analytics"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                >
                  Full Report <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                </Link>
              </div>

              {aging.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-gray-400">
                  No outstanding aging balances recorded.
                </div>
              ) : (
                <div className="space-y-3.5 flex-1">
                  {aging.map((bucket) => {
                    const cfg = bucketColors[bucket.label] || {
                      bar: "bg-green-500",
                      text: "text-green-700",
                      bg: "bg-green-50",
                    };
                    const percentage =
                      stats.totalReceivables > 0
                        ? Math.min(100, (bucket.amount / stats.totalReceivables) * 100)
                        : 0;

                    return (
                      <div key={bucket.label} className="p-3.5 rounded-lg bg-gray-50 border border-gray-200/80">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-gray-800">{bucket.label}</span>
                          <span className="font-mono font-bold text-gray-900">
                            {formatINR(bucket.amount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                          <span>{bucket.count} invoice{bucket.count === 1 ? "" : "s"}</span>
                          <span className="font-semibold text-gray-700">{percentage.toFixed(1)}% of dues</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Prioritized Collection Queue */}
            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Today&apos;s Collection Queue
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatINR(stats.totalOverdue)} overdue across {stats.customersOverdue} accounts
                  </p>
                </div>
                <Link
                  href="/dashboard/queue"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                >
                  Open Queue <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                </Link>
              </div>

              {queue.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="Queue is completely clear"
                  description="All accounts have been contacted or are current with their commitments."
                  className="py-10 border-0 bg-transparent"
                />
              ) : (
                <div className="space-y-2.5 flex-1">
                  {queue.slice(0, 5).map((item) => {
                    const isHigh = item.priority === "high";
                    const isMedium = item.priority === "medium";

                    return (
                      <Link
                        key={item.id}
                        href={`/dashboard/customers/${item.customerId}`}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 hover:border-gray-300 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-xs shrink-0 border ${
                              isHigh
                                ? "bg-red-100 text-red-700 border-red-200"
                                : isMedium
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-green-100 text-green-700 border-green-200"
                            }`}
                          >
                            {item.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {item.customer}
                              </p>
                              <Badge
                                variant={isHigh ? "danger" : isMedium ? "warning" : "success"}
                                size="sm"
                              >
                                {item.priority.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {formatINR(item.amount)} · <span className={isHigh ? "text-red-600 font-semibold" : ""}>{item.daysOverdue}d overdue</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="blue" size="sm" className="hidden sm:inline-flex">
                            {item.nextAction}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3.5">
              Collections Operating Hub
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                href="/dashboard/queue"
                className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <PhoneCall className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-900">Collection Queue</p>
                <p className="text-xs text-gray-500 mt-0.5">Prioritized outreach call list</p>
              </Link>

              <Link
                href="/dashboard/communications"
                className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-900">Omnichannel Dunning</p>
                <p className="text-xs text-gray-500 mt-0.5">WhatsApp, Email &amp; SMS logs</p>
              </Link>

              <Link
                href="/dashboard/customers"
                className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Users className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-900">Debtor Directory</p>
                <p className="text-xs text-gray-500 mt-0.5">GSTIN profiles &amp; MSME claims</p>
              </Link>

              <Link
                href="/dashboard/import"
                className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-blue-50/60 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-gray-900">Import Receivables</p>
                <p className="text-xs text-gray-500 mt-0.5">CSV / Excel &amp; Tally integration</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
