"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import { AllActionsModal } from "@/components/queue/manage-modal";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";
import {
  Download,
  Search,
  AlertTriangle,
  Send,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [search, setSearch] = useState<string>("");
  const [active, setActive] = useState<QueueItem | null>(null);
  const [reminderItem, setReminderItem] = useState<QueueItem | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api<QueueItem[]>("/api/queue");
      setQueue(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<QueueItem[]>("/api/queue");
        if (!cancelled) setQueue(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load collection queue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const filtered = queue
    .filter((q) => (filter === "all" ? true : q.priority === filter))
    .filter((q) =>
      search.trim()
        ? q.customer.toLowerCase().includes(search.toLowerCase()) ||
          q.nextAction.toLowerCase().includes(search.toLowerCase()) ||
          (q.why && q.why.toLowerCase().includes(search.toLowerCase()))
        : true
    );

  const totalOverdue = queue.reduce((sum, q) => sum + q.amount, 0);
  const highItems = queue.filter((q) => q.priority === "high");
  const medItems = queue.filter((q) => q.priority === "medium");
  const lowItems = queue.filter((q) => q.priority === "low");
  const brokenPromiseCount = queue.filter((q) => q.promiseBroken).length;

  const handleExportCsv = () => {
    const a = document.createElement("a");
    a.href = "/api/queue/export";
    a.download = "duespilot-queue.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((item) => item.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkRemind = async () => {
    if (selectedIds.size === 0) return;
    const selectedItems = filtered.filter((i) => selectedIds.has(i.id));
    if (
      !window.confirm(
        `Send collection reminders to ${selectedItems.length} selected account(s)?`
      )
    ) {
      return;
    }

    setBulkSending(true);
    setBulkResult(null);
    let sentCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      try {
        await apiPost("/api/messages", {
          customerId: item.customerId,
          channel: "EMAIL",
          templateId: item.priority === "high" ? "overdue-notice" : "payment-reminder",
        });
        sentCount++;
      } catch {
        failCount++;
      }
    }

    setBulkSending(false);
    setBulkResult(
      `Dispatched ${sentCount} reminder(s) successfully.${
        failCount > 0 ? ` (${failCount} failed)` : ""
      }`
    );
    setSelectedIds(new Set());
    await load();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Collection Queue</h1>
            <Badge variant="danger" size="sm">
              {queue.length} Accounts Pending
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Intelligent daily call and dunning queue ranked by risk severity, aging buckets, and broken promises.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="gap-1.5 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Queue Overdue"
            value={formatINR(totalOverdue)}
            subtitle={`${queue.length} debtor accounts requiring action`}
            icon={Clock}
            variant="danger"
          />
          <StatCard
            title="High Priority"
            value={`${highItems.length} Accounts`}
            subtitle={formatINR(highItems.reduce((s, i) => s + i.amount, 0))}
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Medium Priority"
            value={`${medItems.length} Accounts`}
            subtitle={formatINR(medItems.reduce((s, i) => s + i.amount, 0))}
            icon={SlidersHorizontal}
            variant="warning"
          />
          <StatCard
            title="Broken Promises"
            value={`${brokenPromiseCount} Escalated`}
            subtitle="Immediate phone outreach recommended"
            icon={AlertTriangle}
            variant="purple"
          />
        </div>
      )}

      {/* Bulk Result Banner */}
      {bulkResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{bulkResult}</span>
          </div>
          <button
            onClick={() => setBulkResult(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-950 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Failed to load collection queue</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
            <button
              onClick={() => setRetryKey((n) => n + 1)}
              className="mt-2 text-xs font-semibold text-rose-900 underline hover:text-rose-950"
            >
              Try reloading
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Controls Bar: Priority Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Items", count: queue.length },
                  { id: "high", label: "High", count: highItems.length },
                  { id: "medium", label: "Medium", count: medItems.length },
                  { id: "low", label: "Low", count: lowItems.length },
                ] as const
              ).map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? "bg-blue-700 text-white"
                          : "bg-slate-200/80 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search debtor name, action, or risk reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-8 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Header Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200/90 px-4 py-3 rounded-2xl text-xs shadow-2xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <span className="font-bold text-blue-950">
                  {selectedIds.size} debtor account{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-blue-700 font-semibold hover:underline"
                >
                  Clear selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkRemind}
                  loading={bulkSending}
                  className="gap-1.5 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Bulk Send Reminders</span>
                </Button>
              </div>
            </div>
          )}

          {/* Main Queue List Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            {/* Table Header with Select All */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selectedIds.size === filtered.length
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-slate-700">Select All in View</span>
              </div>
              <span className="font-medium text-slate-500">
                Showing {filtered.length} of {queue.length} accounts
              </span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No accounts in this queue view"
                description={
                  search
                    ? `No debtor accounts matched "${search}". Try clearing your search query.`
                    : "All debtor accounts in this priority category are settled or currently scheduled."
                }
                className="py-12 border-0"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isHigh = item.priority === "high";
                  const isMedium = item.priority === "medium";
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Row checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => toggleSelectOne(item.id, e)}
                            onChange={() => {}}
                            className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Avatar */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl font-bold text-xs shrink-0 border ${
                            isHigh
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : isMedium
                              ? "bg-amber-100 text-amber-900 border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {item.initials}
                        </div>

                        {/* Customer Information */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/customers/${item.customerId}`}
                              className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                            >
                              {item.customer}
                            </Link>
                            <Badge
                              variant={isHigh ? "danger" : isMedium ? "warning" : "success"}
                              size="sm"
                            >
                              {item.priority.toUpperCase()}
                            </Badge>
                            {item.promiseBroken && (
                              <Badge variant="purple" size="sm">
                                Broken Promise
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-bold text-slate-900">
                              {formatINR(item.amount)}
                            </span>
                            <span>•</span>
                            <span className={isHigh ? "text-rose-600 font-semibold" : "text-slate-600"}>
                              {item.daysOverdue} days overdue
                            </span>
                            <span>•</span>
                            <span className="capitalize">{item.status}</span>
                          </div>

                          {item.why && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-100 inline-block">
                              <span className="font-semibold text-slate-700">Trigger:</span> {item.why}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-400">
                            <span>Last: {item.lastAction}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">Recommended: {item.nextAction}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReminderItem(item)}
                          className="gap-1.5 shadow-2xs border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                        >
                          <Send className="h-3.5 w-3.5 text-blue-600" />
                          <span>Send Reminder</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setActive(item)}
                          className="gap-1.5 shadow-xs"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          <span>Take Action</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Action Modals */}
      {active && (
        <AllActionsModal
          item={active}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            load();
          }}
        />
      )}

      {reminderItem && (
        <SendReminderModal
          isOpen={true}
          customerId={reminderItem.customerId}
          customerName={reminderItem.customer}
          amount={reminderItem.amount}
          daysOverdue={reminderItem.daysOverdue}
          onClose={() => setReminderItem(null)}
          onSuccess={() => {
            setReminderItem(null);
            load();
          }}
        />
      )}
    </div>
  );
}
