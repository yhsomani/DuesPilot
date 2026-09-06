"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import { AllActionsModal } from "@/components/queue/manage-modal";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";
import { AICopilotModal } from "@/components/copilot/ai-copilot-modal";
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
  Sparkles,
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
  const [copilotItem, setCopilotItem] = useState<QueueItem | null>(null);
  const [copilotGeneralOpen, setCopilotGeneralOpen] = useState(false);
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
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Collection Queue</h1>
            <Badge variant="danger" size="sm">
              {queue.length} Accounts Pending
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Intelligent daily call and dunning queue ranked by risk severity, aging buckets, and broken promises.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCopilotGeneralOpen(true)}
            className="gap-1.5 border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
            <span>AI Copilot</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
          >
            <Download className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" strokeWidth={1.5} />
            <span>{bulkResult}</span>
          </div>
          <button
            onClick={() => setBulkResult(null)}
            className="rounded-lg p-1 text-green-700 hover:bg-green-100 hover:text-green-950 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
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
            <p className="font-bold">Failed to load collection queue</p>
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

      {!loading && !error && (
        <>
          {/* Controls Bar: Priority Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
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
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? "bg-blue-700 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search debtor name, action, or risk reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Header Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl text-sm shadow-xs animate-in fade-in duration-150">
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
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                  <span>Bulk Send Reminders</span>
                </Button>
              </div>
            </div>
          )}

          {/* Main Queue List Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Table Header with Select All */}
            <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selectedIds.size === filtered.length
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">Select All in View</span>
              </div>
              <span className="font-medium text-gray-500">
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
              <div className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const isHigh = item.priority === "high";
                  const isMedium = item.priority === "medium";
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-5 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected ? "bg-blue-50/30" : ""
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
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Avatar */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs shrink-0 border ${
                            isHigh
                              ? "bg-red-100 text-red-700 border-red-200"
                              : isMedium
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-green-100 text-green-700 border-green-200"
                          }`}
                        >
                          {item.initials}
                        </div>

                        {/* Customer Information */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/customers/${item.customerId}`}
                              className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors truncate"
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

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono font-bold text-gray-900">
                              {formatINR(item.amount)}
                            </span>
                            <span>•</span>
                            <span className={isHigh ? "text-red-600 font-semibold" : "text-gray-600"}>
                              {item.daysOverdue} days overdue
                            </span>
                            <span>•</span>
                            <span className="capitalize">{item.status}</span>
                          </div>

                          {item.why && (
                            <p className="text-xs text-gray-600 line-clamp-1 bg-gray-50 rounded-md px-2 py-0.5 border border-gray-200 inline-block">
                              <span className="font-semibold text-gray-700">Trigger:</span> {item.why}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-gray-400">
                            <span>Last: {item.lastAction}</span>
                            <span>•</span>
                            <span className="text-gray-600 font-medium">Recommended: {item.nextAction}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCopilotItem(item)}
                          className="gap-1.5 border-indigo-200 bg-indigo-50/40 text-indigo-700 hover:bg-indigo-100"
                        >
                          <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
                          <span>AI Copilot</span>
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setReminderItem(item)}
                          className="gap-1.5 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                        >
                          <Send className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                          <span>Send Reminder</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setActive(item)}
                          className="gap-1.5"
                        >
                          <PhoneCall className="h-4 w-4" strokeWidth={1.5} />
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

      {/* AI Copilot Modals */}
      {copilotItem && (
        <AICopilotModal
          isOpen={true}
          customerId={copilotItem.customerId}
          customerName={copilotItem.customer}
          onClose={() => setCopilotItem(null)}
          onPromiseExtracted={async (promise) => {
            try {
              await apiPost("/api/promises", {
                customerId: copilotItem.customerId,
                amount: promise.amount,
                promiseDate: promise.promiseDate,
                notes: promise.notes,
              });
              load();
            } catch (err) {
              console.error("Failed to record extracted promise", err);
            }
          }}
        />
      )}

      {copilotGeneralOpen && (
        <AICopilotModal
          isOpen={true}
          onClose={() => setCopilotGeneralOpen(false)}
        />
      )}
    </div>
  );
}
