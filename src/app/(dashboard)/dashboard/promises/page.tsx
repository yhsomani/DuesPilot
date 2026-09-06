"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { PromiseRow } from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
  Layers,
  X,
  Check,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentPlanModal } from "@/components/promises/payment-plan-modal";

type FilterStatus = "all" | "ACTIVE" | "KEPT" | "BROKEN" | "RENEGOTIATED";

export default function PromisesPage() {
  const [promises, setPromises] = useState<PromiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState<string>("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PromiseRow[]>("/api/promises");
      setPromises(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payment promises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<PromiseRow[]>("/api/promises");
        if (active) setPromises(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load payment promises");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retryKey]);

  const handleManagePromise = async (promiseId: string, action: "mark_kept" | "mark_broken") => {
    setActionLoadingId(promiseId);
    try {
      await apiPost(`/api/promises/${promiseId}/manage`, {
        action,
        note: action === "mark_kept" ? "Settlement verified by collector" : "Customer missed promised payment commitment date",
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update promise");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = promises
    .filter((p) => (filter === "all" ? true : p.status === filter))
    .filter((p) =>
      search.trim()
        ? p.customer.toLowerCase().includes(search.toLowerCase()) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
          (p.source && p.source.toLowerCase().includes(search.toLowerCase()))
        : true
    );

  const totalPromised = promises
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalBroken = promises
    .filter((p) => p.status === "BROKEN")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalKept = promises
    .filter((p) => p.status === "KEPT")
    .reduce((sum, p) => sum + p.amount, 0);

  const keptCount = promises.filter((p) => p.status === "KEPT").length;
  const completedCount = promises.filter((p) => p.status === "KEPT" || p.status === "BROKEN").length;
  const fulfillmentRate = completedCount > 0 ? Math.round((keptCount / completedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promises to Pay (PTP)</h1>
            <Badge variant="blue" size="sm">
              {promises.length} Commitments
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Track verbal and written settlement promises, monitor confidence scores, and reconcile fulfillment.
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
            variant="secondary"
            size="sm"
            onClick={() => setShowPlanModal(true)}
            className="gap-1.5 border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
          >
            <Layers className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
            <span>Multi-Installment Plan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowLogModal(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Log Commitment</span>
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
            title="Active PTP Commitments"
            value={formatINR(totalPromised)}
            subtitle={`${promises.filter((p) => p.status === "ACTIVE").length} active settlement milestones`}
            icon={Clock}
            variant="blue"
          />
          <StatCard
            title="Kept & Recovered"
            value={formatINR(totalKept)}
            subtitle={`${keptCount} commitments honored`}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Broken Commitments"
            value={formatINR(totalBroken)}
            subtitle={`${promises.filter((p) => p.status === "BROKEN").length} missed promise deadlines`}
            icon={XCircle}
            variant="danger"
          />
          <StatCard
            title="PTP Fulfillment Rate"
            value={`${fulfillmentRate}%`}
            subtitle={`${completedCount} total resolved commitments`}
            icon={Calendar}
            variant={fulfillmentRate >= 60 ? "success" : "warning"}
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
            <p className="font-bold">Failed to load promises</p>
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
                  { id: "all", label: "All Promises", count: promises.length },
                  { id: "ACTIVE", label: "Active", count: promises.filter((p) => p.status === "ACTIVE").length },
                  { id: "KEPT", label: "Kept", count: promises.filter((p) => p.status === "KEPT").length },
                  { id: "BROKEN", label: "Broken", count: promises.filter((p) => p.status === "BROKEN").length },
                  { id: "RENEGOTIATED", label: "Renegotiated", count: promises.filter((p) => p.status === "RENEGOTIATED").length },
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
                placeholder="Search debtor name or invoice…"
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

          {/* Promises List Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No payment promises found"
                description={
                  search
                    ? `No commitments matched "${search}".`
                    : "No debtor commitments match the selected status filter."
                }
                className="py-12 border-0"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((promise) => {
                  const isBroken = promise.status === "BROKEN";
                  const isKept = promise.status === "KEPT";
                  const isActive = promise.status === "ACTIVE";

                  return (
                    <div
                      key={promise.id}
                      className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Customer Initials Avatar */}
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isBroken
                              ? "bg-red-100 text-red-700 border-red-200"
                              : isKept
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-blue-100 text-blue-700 border-blue-200"
                          }`}
                        >
                          {promise.initials || "DP"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/customers/${promise.customerId}`}
                              className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors"
                            >
                              {promise.customer}
                            </Link>
                            {promise.invoiceNumber && (
                              <span className="text-xs font-mono text-gray-400 font-semibold">
                                {promise.invoiceNumber}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 mt-1">
                            <strong className="text-gray-900 font-mono font-bold">
                              {formatINR(promise.amount)}
                            </strong>{" "}
                            committed for{" "}
                            <strong className="text-gray-800">
                              {new Date(promise.promiseDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </strong>{" "}
                            · Source: {promise.source}
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Confidence Gauge, Status Badge, Quick Resolve Buttons */}
                      <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center">
                        {/* Confidence Score */}
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                            Confidence
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  promise.confidence > 70
                                    ? "bg-emerald-500"
                                    : promise.confidence > 40
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${promise.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-gray-700">
                              {promise.confidence}%
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant={isBroken ? "danger" : isKept ? "success" : "warning"}
                          size="sm"
                        >
                          {promise.status}
                        </Badge>

                        {/* Active Action Triggers */}
                        {isActive && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoadingId === promise.id}
                              onClick={() => handleManagePromise(promise.id, "mark_kept")}
                              className="h-8 px-2.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                              <span>Kept</span>
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionLoadingId === promise.id}
                              onClick={() => handleManagePromise(promise.id, "mark_broken")}
                              className="h-8 px-2.5 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold"
                            >
                              <X className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                              <span>Broken</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Promise Modal */}
      {showLogModal && (
        <LogPromiseModal
          onClose={() => setShowLogModal(false)}
          onDone={async () => {
            setShowLogModal(false);
            await load();
          }}
        />
      )}

      {/* Payment Plan Modal */}
      <PaymentPlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSuccess={async () => {
          setShowPlanModal(false);
          await load();
        }}
      />
    </div>
  );
}

function LogPromiseModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [customers, setCustomers] = useState<
    { id: string; name: string; totalOutstanding: number }[]
  >([]);
  const [invoices, setInvoices] = useState<
    { id: string; number: string; customer: string; outstanding: number }[]
  >([]);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState(() =>
    new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  );
  const [invoiceId, setInvoiceId] = useState("");
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState(75);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idemKeyRef = useRef<string | null>(null);
  const idemKey = () => (idemKeyRef.current ??= crypto.randomUUID());

  useEffect(() => {
    void (async () => {
      try {
        const [c, inv] = await Promise.all([
          api<{ id: string; name: string; totalOutstanding: number }[]>(
            "/api/customers"
          ),
          api<
            {
              id: string;
              number: string;
              customer: string;
              outstanding: number;
            }[]
          >("/api/invoices"),
        ]);
        setCustomers(c);
        setInvoices(inv.filter((i) => i.outstanding > 0));
      } catch {
        // pickers stay empty
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/promises", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey() },
        body: JSON.stringify({
          customerId,
          amount: Number(amount),
          promiseDate,
          invoiceId: invoiceId || null,
          note: note.trim() || null,
          source: "manual",
          confidence,
        }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to record promise commitment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-ptp-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 id="log-ptp-title" className="font-bold text-gray-900 text-base">
              Log Payment Promise (PTP)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Record a formal settlement commitment made during dunning outreach
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
              Customer / Debtor *
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
            >
              <option value="">Select debtor account…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatINR(c.totalOutstanding)} open)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Committed Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Settlement Date *
              </label>
              <input
                type="date"
                required
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Related Invoice (Optional)
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
            >
              <option value="">No specific invoice (General account balance)</option>
              {invoices
                .filter(
                  (i) =>
                    i.customer ===
                    customers.find((c) => c.id === customerId)?.name
                )
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number} ({formatINR(inv.outstanding)} open)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-700">Estimated Confidence Score</label>
              <span className="text-xs font-mono font-bold text-blue-600">{confidence}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Call Remarks / Context
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Debtor confirmed transfer pending CFO signature on Friday…"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none transition-all"
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
              disabled={saving || !customerId || !amount || Number(amount) <= 0}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              <span>Log Commitment</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
