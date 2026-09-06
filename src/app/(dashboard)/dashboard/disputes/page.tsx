"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api, apiPost, apiPatch, ApiError } from "@/lib/api";
import type { DisputeRow } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  Tag,
  Scale,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIES = [
  { value: "pricing", label: "Pricing & Rate Discrepancy" },
  { value: "quantity", label: "Quantity Shortfall" },
  { value: "quality", label: "Quality / Defect Issue" },
  { value: "po_mismatch", label: "PO / Contract Mismatch" },
  { value: "grn_missing", label: "GRN / Delivery Proof Missing" },
  { value: "tax_gst", label: "Tax / GST Mismatch (GSTR-2B)" },
  { value: "documentation", label: "Missing Invoices / TDS Certs" },
  { value: "delivery", label: "Delayed Delivery Damage" },
  { value: "credit_note", label: "Pending Credit Note Adjustment" },
  { value: "other", label: "Other Commercial Dispute" },
];

type DisputeFilter = "all" | "open" | "resolved" | "withdrawn";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DisputeFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchDisputes = async () => api<DisputeRow[]>("/api/disputes");

  const load = async () => {
    setDisputes(await fetchDisputes());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDisputes();
        if (cancelled) return;
        setDisputes(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load disputes ledger");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleUpdateStatus = async (disputeId: string, status: "resolved" | "withdrawn") => {
    setActionLoadingId(disputeId);
    try {
      await apiPatch(`/api/disputes/${disputeId}`, { status });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update dispute status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = disputes
    .filter((d) => (filter === "all" ? true : d.status === filter))
    .filter((d) =>
      search.trim()
        ? d.customer.toLowerCase().includes(search.toLowerCase()) ||
          d.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          d.reason.toLowerCase().includes(search.toLowerCase()) ||
          (d.category && d.category.toLowerCase().includes(search.toLowerCase()))
        : true
    );

  const openCount = disputes.filter((d) => d.status === "open").length;
  const resolvedCount = disputes.filter((d) => d.status === "resolved").length;
  const withdrawnCount = disputes.filter((d) => d.status === "withdrawn").length;
  const totalClosed = resolvedCount + withdrawnCount;
  const resolutionRate = totalClosed > 0 ? Math.round((resolvedCount / totalClosed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Disputes</h1>
            <Badge variant="purple" size="sm">
              {openCount} Open Cases
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Audit billing grievances, pause automated dunning for flagged invoices, and log resolutions.
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
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Log Dispute</span>
          </Button>
        </div>
      </div>

      {/* KPI Financial Overview */}
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
            title="Active Disputed Cases"
            value={openCount.toString()}
            subtitle="Invoices currently excluded from queue"
            icon={AlertTriangle}
            variant="danger"
          />
          <StatCard
            title="Successfully Resolved"
            value={resolvedCount.toString()}
            subtitle="Disputes reconciled with settlement"
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Withdrawn Claims"
            value={withdrawnCount.toString()}
            subtitle="Invalidated debtor objections"
            icon={XCircle}
            variant="neutral"
          />
          <StatCard
            title="Resolution Success Rate"
            value={`${resolutionRate}%`}
            subtitle="Resolved vs withdrawn ratio"
            icon={Scale}
            variant={resolutionRate >= 50 ? "blue" : "warning"}
          />
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
            <p className="font-bold">Failed to load disputes</p>
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
                  { id: "all", label: "All Disputes", count: disputes.length },
                  { id: "open", label: "Open Cases", count: openCount },
                  { id: "resolved", label: "Resolved", count: resolvedCount },
                  { id: "withdrawn", label: "Withdrawn", count: withdrawnCount },
                ] as const
              ).map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-medium ${
                        isActive
                          ? "bg-purple-700 text-white"
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
                placeholder="Search debtor, invoice, reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all shadow-xs"
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

          {/* Disputes Ledger */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No disputes found"
                description={
                  search
                    ? `No disputes matched "${search}".`
                    : "No debtor claims match the selected status filter."
                }
                className="py-12 border-0"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((d) => {
                  const isOpen = d.status === "open";
                  const isResolved = d.status === "resolved";
                  const catLabel =
                    CATEGORIES.find((c) => c.value === d.category)?.label ?? "Commercial Dispute";

                  return (
                    <div
                      key={d.id}
                      className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Icon indicator */}
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isOpen
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : isResolved
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 text-sm">
                              {d.invoiceNumber}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-sm font-semibold text-gray-800">{d.customer}</span>
                            <Badge
                              variant={isOpen ? "purple" : isResolved ? "success" : "neutral"}
                              size="sm"
                            >
                              {d.status}
                            </Badge>
                          </div>

                          <p className="text-sm font-medium text-gray-800 leading-relaxed">
                            {d.reason}
                          </p>

                          {d.notes && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200 mt-1">
                              {d.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500 pt-0.5">
                            <span className="flex items-center gap-1 font-medium">
                              <Tag className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
                              {catLabel}
                            </span>
                            <span>•</span>
                            <span>
                              Logged on{" "}
                              {new Date(d.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Dispatchers for Open Disputes */}
                      {isOpen && (
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoadingId === d.id}
                            onClick={() => handleUpdateStatus(d.id, "resolved")}
                            className="h-8 px-3 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                            <span>Resolve</span>
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoadingId === d.id}
                            onClick={() => handleUpdateStatus(d.id, "withdrawn")}
                            className="h-8 px-3 text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-bold"
                          >
                            <X className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                            <span>Withdraw</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Dispute Modal */}
      {showModal && (
        <LogDisputeModal
          onClose={() => setShowModal(false)}
          onDone={async () => {
            setShowModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function LogDisputeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [invoices, setInvoices] = useState<
    { id: string; number: string; customer: string; outstanding: number }[]
  >([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("pricing");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setInvoices(
          await api<
            { id: string; number: string; customer: string; outstanding: number }[]
          >("/api/invoices")
        );
      } catch {
        // ignore
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/disputes", {
        invoiceId,
        reason: reason.trim(),
        category: category || null,
        notes: notes.trim() || null,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to record dispute claim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-dispute-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 id="log-dispute-title" className="font-bold text-gray-900 text-base">
              Log Invoice Dispute
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Flag an invoice with a commercial objection to exclude it from dunning dispatch
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Target Invoice *
            </label>
            <select
              required
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all"
            >
              <option value="">Select disputed invoice…</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · {inv.customer} ({formatINR(inv.outstanding)} open)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Dispute Category *
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Dispute Reason / Claim *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/30 resize-none transition-all"
              placeholder="What specifically is the customer disputing regarding this invoice?"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Internal Investigation Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sales representative checking signed GRN copy with warehouse…"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/30 resize-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={saving}
              disabled={saving || !invoiceId || !reason.trim()}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
              <span>Log Dispute</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
