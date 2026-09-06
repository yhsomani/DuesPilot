"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { CustomerSummary, PaymentRow } from "@/lib/types";
import {
  CreditCard,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  FileCheck2,
  DollarSign,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type AllocationFilter = "all" | "unallocated" | "reconciled";

const allocatedTotal = (p: PaymentRow) =>
  p.allocations.reduce((s, a) => s + a.amount, 0);

const isFullyAllocated = (p: PaymentRow) =>
  p.status === "reversed" || allocatedTotal(p) >= p.amount;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<AllocationFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [allocating, setAllocating] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const fetchPayments = async () => {
    const [pRaw, cRaw] = await Promise.all([
      api<Record<string, unknown> | Record<string, unknown>[]>("/api/payments"),
      api<Record<string, unknown> | CustomerSummary[]>("/api/customers"),
    ]);

    const pList: Record<string, unknown>[] = Array.isArray(pRaw)
      ? pRaw
      : ((pRaw?.items || pRaw?.payments || []) as Record<string, unknown>[]);
    const cList: CustomerSummary[] = Array.isArray(cRaw)
      ? cRaw
      : ((cRaw?.items || cRaw?.customers || []) as CustomerSummary[]);

    const normalizedPayments: PaymentRow[] = pList.map((p) => ({
      id: String(p.id || ""),
      customerId: String(p.customerId || ""),
      customer: String(p.customer || p.customerName || "Customer"),
      reference: (p.reference as string) || null,
      amount: Number(p.amount || 0),
      paymentDate: String(p.paymentDate || p.date || new Date().toISOString()),
      mode: String(p.mode || p.method || "Bank Transfer"),
      status: (p.status as PaymentRow["status"]) || "completed",
      allocations: Array.isArray(p.allocations) ? (p.allocations as PaymentRow["allocations"]) : [],
    }));

    return [normalizedPayments, cList] as [PaymentRow[], CustomerSummary[]];
  };

  const load = async () => {
    const [p, c] = await fetchPayments();
    setPayments(p);
    setCustomers(c);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, c] = await fetchPayments();
        if (cancelled) return;
        setPayments(p);
        setCustomers(c);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load payment transactions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const visible = payments
    .filter((p) => {
      if (filter === "unallocated") return p.status !== "reversed" && !isFullyAllocated(p);
      if (filter === "reconciled") return p.status === "reversed" || isFullyAllocated(p);
      return true;
    })
    .filter((p) =>
      search.trim()
        ? p.customer.toLowerCase().includes(search.toLowerCase()) ||
          (p.reference && p.reference.toLowerCase().includes(search.toLowerCase())) ||
          (p.mode && p.mode.toLowerCase().includes(search.toLowerCase()))
        : true
    );

  const totalReceived = payments
    .filter((p) => p.status !== "reversed")
    .reduce((s, p) => s + p.amount, 0);
  const totalAllocated = payments
    .filter((p) => p.status !== "reversed")
    .reduce((s, p) => s + allocatedTotal(p), 0);
  const unallocatedPool = Math.max(0, totalReceived - totalAllocated);
  const unallocatedCount = payments.filter(
    (p) => p.status !== "reversed" && !isFullyAllocated(p)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments & Receipts</h1>
            <Badge variant="blue" size="sm">
              {payments.length} Transactions
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Track bank receipts, reconcile UTR allocations against open customer invoices, and audit settlements.
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
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
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
            title="Total Cash Collected"
            value={formatINR(totalReceived)}
            subtitle="All valid payment receipts"
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Reconciled Credit"
            value={formatINR(totalAllocated)}
            subtitle="Applied to open invoice balances"
            icon={FileCheck2}
            variant="default"
          />
          <StatCard
            title="Unallocated Pool"
            value={formatINR(unallocatedPool)}
            subtitle={`${unallocatedCount} payments needing invoice matching`}
            icon={Clock}
            variant={unallocatedPool > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Total Receipts"
            value={`${payments.length} Payments`}
            subtitle={`${payments.filter((p) => p.status === "reversed").length} reversals logged`}
            icon={CreditCard}
            variant="blue"
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
            <p className="font-bold">Failed to load payments ledger</p>
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
                  { id: "all", label: "All Payments", count: payments.length },
                  { id: "unallocated", label: "Needs Allocation", count: unallocatedCount },
                  { id: "reconciled", label: "Fully Reconciled", count: payments.length - unallocatedCount },
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
                placeholder="Search debtor name, UTR, or mode…"
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

          {/* Payments Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {visible.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title={
                  filter === "unallocated"
                    ? "No unallocated payments"
                    : "No payments recorded yet"
                }
                description={
                  filter === "unallocated"
                    ? "Every customer payment has been fully reconciled against invoice line items."
                    : search
                    ? `No payment transactions matched "${search}".`
                    : "Record incoming NEFT, RTGS, UPI, or cheque payments to begin settlement tracking."
                }
                className="py-12 border-0"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                      <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[11px]">Date</th>
                      <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[11px]">Customer / Debtor</th>
                      <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[11px]">UTR / Reference</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[11px]">Receipt Amount</th>
                      <th className="px-5 py-3 text-center font-bold uppercase tracking-wider text-[11px]">Payment Mode</th>
                      <th className="px-5 py-3 text-center font-bold uppercase tracking-wider text-[11px]">Status</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[11px]">Reconciled</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[11px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((p) => {
                      const allocated = allocatedTotal(p);
                      const needsAllocation =
                        p.status !== "reversed" && allocated < p.amount;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5 text-gray-700">
                            {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">
                            <Link
                              href={`/dashboard/customers/${p.customerId}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {p.customer}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-gray-600 text-xs">
                            {p.reference || <span className="text-gray-400">Direct UTR</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">
                            {formatINR(p.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant="neutral" size="sm">
                              {p.mode || "Bank Transfer"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge
                              variant={
                                p.status === "reversed"
                                  ? "danger"
                                  : isFullyAllocated(p)
                                  ? "success"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {p.status === "reversed"
                                ? "Reversed"
                                : isFullyAllocated(p)
                                ? "Fully Allocated"
                                : "Partial / Open"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-700">
                            {allocated === 0 ? (
                              <span className="text-amber-700 font-semibold text-xs">Unallocated</span>
                            ) : (
                              <div>
                                <span className="font-bold text-emerald-700">{formatINR(allocated)}</span>
                                {needsAllocation && (
                                  <p className="text-[11px] text-red-600 font-bold">
                                    {formatINR(p.amount - allocated)} remaining
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {needsAllocation ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setAllocating(p)}
                                className="h-8 px-2.5 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 font-semibold text-xs"
                              >
                                <span>Allocate</span>
                                <ArrowRight className="h-3.5 w-3.5 ml-1" strokeWidth={1.5} />
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs font-medium">Reconciled</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <RecordPaymentModal
          customers={customers}
          onClose={() => setShowModal(false)}
          onDone={async () => {
            setShowModal(false);
            await load();
          }}
        />
      )}

      {/* Allocate Payment Modal */}
      {allocating && (
        <AllocatePaymentModal
          payment={allocating}
          onClose={() => setAllocating(null)}
          onDone={async () => {
            setAllocating(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AllocatePaymentModal({
  payment,
  onClose,
  onDone,
}: {
  payment: PaymentRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const allocated = allocatedTotal(payment);
  const remaining = payment.amount - allocated;
  const [invoices, setInvoices] = useState<
    { id: string; number: string; outstanding: number }[]
  >([]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const detail = await api<{
          invoices: { id: string; number: string; outstanding: number }[];
        }>(`/api/customers/${payment.customerId}`);
        if (!cancelled)
          setInvoices(detail.invoices.filter((i) => i.outstanding > 0));
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load debtor invoices");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payment.customerId]);

  const entriesTotal = Object.values(entries).reduce(
    (s, v) => s + (Number(v) > 0 ? Number(v) : 0),
    0
  );

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/payments/${payment.id}/allocate`, {
        allocations: Object.entries(entries)
          .filter(([, amount]) => Number(amount) > 0)
          .map(([invoiceId, amount]) => ({
            invoiceId,
            amount: Number(amount),
          })),
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to apply allocations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="allocate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 id="allocate-title" className="font-bold text-gray-900 text-base">
              Allocate Payment Credit
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {payment.customer} · {formatINR(payment.amount)} total receipt
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

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Receipt Amount:</span>
              <span className="font-mono font-bold text-gray-900">{formatINR(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Already Allocated:</span>
              <span className="font-mono font-semibold text-gray-700">{formatINR(allocated)}</span>
            </div>
            <div className="flex justify-between text-blue-700 font-bold border-t border-gray-200 pt-1">
              <span>Available for Allocation:</span>
              <span className="font-mono">{formatINR(remaining)}</span>
            </div>
          </div>

          {invoices.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">
              No open invoices found for this customer with an outstanding balance.
            </p>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Open Invoices</label>
              {invoices.map((inv) => {
                const value = entries[inv.id] ?? "";
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 text-xs bg-white hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-gray-900 block">{inv.number}</span>
                      <span className="text-[11px] text-gray-500">
                        Outstanding: <strong className="text-red-600 font-mono">{formatINR(inv.outstanding)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        min={0}
                        max={inv.outstanding}
                        value={value}
                        placeholder="0"
                        onChange={(e) =>
                          setEntries({ ...entries, [inv.id]: e.target.value })
                        }
                        className="w-28 h-9 rounded-lg border border-gray-300 bg-gray-50/50 px-2.5 py-1.5 text-xs text-right font-mono font-bold focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {entriesTotal > 0 && (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900">Total Being Allocated:</span>
              <span
                className={`font-mono font-bold ${
                  entriesTotal > remaining ? "text-red-600" : "text-blue-700"
                }`}
              >
                {formatINR(entriesTotal)} of {formatINR(remaining)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 p-5 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            loading={saving}
            onClick={submit}
            disabled={saving || entriesTotal <= 0 || entriesTotal > remaining || invoices.length === 0}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            <span>Apply Allocation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  customers,
  onClose,
  onDone,
}: {
  customers: CustomerSummary[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [mode, setMode] = useState("UPI");
  const [reference, setReference] = useState("");
  const [allocations, setAllocations] = useState<
    { invoiceId: string; amount: number }[]
  >([]);
  const [invoices, setInvoices] = useState<
    { id: string; number: string; outstanding: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idemKeyRef = useRef<string | null>(null);
  const idemKey = () => (idemKeyRef.current ??= crypto.randomUUID());

  const loadInvoices = async (id: string) => {
    if (!id) {
      setInvoices([]);
      return;
    }
    try {
      const detail = await api<{
        invoices: { id: string; number: string; outstanding: number }[];
      }>(`/api/customers/${id}`);
      setInvoices(detail.invoices.filter((i) => i.outstanding > 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load debtor invoices");
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const canAllocate = Number(amount) > 0 && invoices.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/payments", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey() },
        body: JSON.stringify({
          customerId,
          amount: Number(amount),
          paymentDate,
          mode: mode || null,
          reference: reference.trim() || null,
          allocations: allocations.length ? allocations : undefined,
        }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to record payment receipt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 id="record-payment-title" className="font-bold text-gray-900 text-base">
              Record Bank Receipt / Payment
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Matched automatically to open invoices via FIFO unless specified
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
              onChange={async (e) => {
                setCustomerId(e.target.value);
                setAllocations([]);
                await loadInvoices(e.target.value);
              }}
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
                Receipt Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAllocations([]);
                }}
                placeholder="e.g. 50000"
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Payment Channel / Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              >
                <option value="UPI">UPI (Instant)</option>
                <option value="IMPS">IMPS</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Credit/Debit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                UTR / Reference Number
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UTR-98273648"
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all"
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 border border-gray-200">
              Outstanding Balance: <strong className="text-gray-900 font-mono">{formatINR(selectedCustomer.totalOutstanding)}</strong> ·{" "}
              {selectedCustomer.totalOverdue > 0 ? (
                <span className="text-red-600 font-bold">{formatINR(selectedCustomer.totalOverdue)} overdue</span>
              ) : (
                <span className="text-emerald-600 font-medium">All invoices within credit terms</span>
              )}
            </div>
          )}

          {canAllocate && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Target Specific Invoices (Optional)
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-xl border border-gray-200 p-2 bg-gray-50/50">
                {invoices.map((inv) => {
                  const alloc = allocations.find((a) => a.invoiceId === inv.id);
                  return (
                    <label
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div>
                        <span className="font-mono font-bold text-gray-900">{inv.number}</span>
                        <span className="text-gray-500 text-[11px] ml-1.5">({formatINR(inv.outstanding)})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!alloc}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllocations([
                              ...allocations.filter((a) => a.invoiceId !== inv.id),
                              { invoiceId: inv.id, amount: inv.outstanding },
                            ]);
                          } else {
                            setAllocations(allocations.filter((a) => a.invoiceId !== inv.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
              <span>Record Receipt</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
