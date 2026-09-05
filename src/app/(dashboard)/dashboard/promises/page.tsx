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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentPlanModal } from "@/components/promises/payment-plan-modal";

type FilterStatus = "all" | "ACTIVE" | "KEPT" | "BROKEN" | "RENEGOTIATED";

export default function PromisesPage() {
  const [promises, setPromises] = useState<PromiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
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

  const filtered =
    filter === "all" ? promises : promises.filter((p) => p.status === filter);

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Promises to Pay (PTP)</h1>
            <Badge variant="blue" size="sm">
              {promises.length} Commitments
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Track verbal and written settlement promises, monitor confidence scores, and reconcile fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryKey((n) => n + 1)}
            className="gap-1.5 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPlanModal(true)}
            className="gap-1.5 shadow-2xs"
          >
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>Multi-Installment Plan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowLogModal(true)}
            className="gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Commitment</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
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

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Failed to load promises</p>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs w-fit">
        {(
          [
            ["all", `All (${promises.length})`],
            ["ACTIVE", `Active (${promises.filter((p) => p.status === "ACTIVE").length})`],
            ["KEPT", `Kept (${promises.filter((p) => p.status === "KEPT").length})`],
            ["BROKEN", `Broken (${promises.filter((p) => p.status === "BROKEN").length})`],
            ["RENEGOTIATED", "Renegotiated"],
          ] as [FilterStatus, string][]
        ).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filter === s
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Promises List */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading payment promises…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No payment promises found"
            description="No debtor commitments match the selected status filter."
            className="py-12 border-0"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((promise) => {
              const isBroken = promise.status === "BROKEN";
              const isKept = promise.status === "KEPT";
              const isActive = promise.status === "ACTIVE";

              return (
                <div
                  key={promise.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Customer Initials Avatar */}
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs ${
                        isBroken
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : isKept
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {promise.initials || "DP"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/customers/${promise.customerId}`}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                        >
                          {promise.customer}
                        </Link>
                        {promise.invoiceNumber && (
                          <span className="text-[11px] font-mono text-slate-400 font-semibold">
                            {promise.invoiceNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        <strong className="text-slate-900 font-mono font-semibold">
                          {formatINR(promise.amount)}
                        </strong>{" "}
                        committed for{" "}
                        <strong className="text-slate-800">
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
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Confidence
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              promise.confidence > 70
                                ? "bg-emerald-500"
                                : promise.confidence > 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${promise.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700">
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
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === promise.id}
                          onClick={() => handleManagePromise(promise.id, "mark_kept")}
                          className="h-8 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs font-bold"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          <span>Kept</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === promise.id}
                          onClick={() => handleManagePromise(promise.id, "mark_broken")}
                          className="h-8 px-2.5 text-rose-700 border-rose-200 hover:bg-rose-50 text-xs font-bold"
                        >
                          <X className="h-3 w-3 mr-1" />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200/90 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h3 id="log-ptp-title" className="font-bold text-slate-900 text-base">
              Log Payment Promise (PTP)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Record a formal settlement commitment made during dunning outreach
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer / Debtor *
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Committed Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-mono font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Settlement Date *
              </label>
              <input
                type="date"
                required
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Related Invoice (Optional)
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
              <label className="text-xs font-bold text-slate-700">Estimated Confidence Score</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Call Remarks / Context
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Debtor confirmed transfer pending CFO signature on Friday…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={saving}
              disabled={saving || !customerId || !amount || Number(amount) <= 0}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Log Commitment</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
