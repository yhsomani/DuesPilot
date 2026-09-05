"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost } from "@/lib/api";
import type { QueueItem } from "@/lib/types";
import { AllActionsModal } from "@/components/queue/manage-modal";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";

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
      setError(e instanceof Error ? e.message : "Failed to load");
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
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
    .filter((q) => (search.trim() ? q.customer.toLowerCase().includes(search.toLowerCase()) : true));

  const totalOverdue = queue.reduce((sum, q) => sum + q.amount, 0);

  const handleExportCsv = () => {
    window.location.href = "/api/queue/export";
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
        `Send payment reminder emails to ${selectedItems.length} selected account(s)?`
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Today&apos;s prioritized actions — {formatINR(totalOverdue)} overdue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {bulkResult && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-medium text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✉️</span>
            <span>{bulkResult}</span>
          </div>
          <button
            onClick={() => setBulkResult(null)}
            className="font-bold text-blue-700 hover:text-blue-900"
          >
            ✕
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading queue…</p>}
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

      {!loading && !error && (
        <>
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === p
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                  {p !== "all" && (
                    <span className="ml-1 text-xs opacity-80">
                      ({queue.filter((q) => q.priority === p).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search debtor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Bulk Action Header Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-blue-900">
                  {selectedIds.size} account{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-blue-700 hover:underline"
                >
                  Clear selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkRemind}
                  disabled={bulkSending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                >
                  {bulkSending ? (
                    <span>Sending…</span>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Bulk Send Reminders</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            {/* Table Header with Select All */}
            <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selectedIds.size === filtered.length
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">Select All in View</span>
              </div>
              <span>Showing {filtered.length} account{filtered.length === 1 ? "" : "s"}</span>
            </div>

            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-500 text-center">
                No overdue accounts matching your filter.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`px-6 py-4 hover:bg-gray-50/75 transition-colors flex items-center gap-4 ${
                      selectedIds.has(item.id) ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Row checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onClick={(e) => toggleSelectOne(item.id, e)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />

                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <Link
                        href={`/dashboard/customers/${item.customerId}`}
                        className="flex items-start gap-4 flex-1 cursor-pointer group"
                      >
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
                            <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
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
                          {item.why && (
                            <p className="text-xs text-gray-400">{item.why}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Last: {item.lastAction}</span>
                            <span>Next: {item.nextAction}</span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setReminderItem(item)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition shadow-xs flex items-center gap-1"
                        >
                          <span>✉️</span>
                          <span>Send Reminder</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActive(item)}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
                        >
                          Take action
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {active && (
        <AllActionsModal
          item={active}
          onClose={() => setActive(null)}
          onSuccess={() => {
            setActive(null);
            load();
          }}
        />
      )}

      {reminderItem && (
        <SendReminderModal
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
