"use client";

import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { CustomerSummary, PaymentRow } from "@/lib/types";

type AllocationFilter = "all" | "unallocated";

const allocatedTotal = (p: PaymentRow) =>
  p.allocations.reduce((s, a) => s + a.amount, 0);

const isFullyAllocated = (p: PaymentRow) =>
  p.status === "reversed" || allocatedTotal(p) >= p.amount;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<AllocationFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [allocating, setAllocating] = useState<PaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const fetchPayments = async () =>
    Promise.all([
      api<PaymentRow[]>("/api/payments"),
      api<CustomerSummary[]>("/api/customers"),
    ]);

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
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const visible =
    filter === "unallocated"
      ? payments.filter((p) => p.status !== "reversed" && !isFullyAllocated(p))
      : payments;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and reconcile incoming payments
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Record payment
        </button>
      </div>

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

      {loading && <p className="text-sm text-gray-500">Loading payments…</p>}

      {!loading && (
        <>
          <div className="flex gap-2">
            {(
              [
                ["all", "All payments"],
                ["unallocated", "Unallocated"],
              ] as [AllocationFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {visible.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-gray-500">
                {filter === "unallocated"
                  ? "No unallocated payments. Every payment is fully reconciled."
                  : "No payments recorded yet. Record your first payment to begin reconciliation."}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Mode</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Allocated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((p) => {
                    const allocated = allocatedTotal(p);
                    const needsAllocation =
                      p.status !== "reversed" && allocated < p.amount;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {p.customer}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {p.reference || "—"}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">
                          {formatINR(p.amount)}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {p.mode || "—"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === "received"
                                ? "bg-green-50 text-green-700"
                                : p.status === "reversed"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {p.status === "fully_allocated"
                              ? "received"
                              : p.status === "partially_allocated"
                              ? "partially allocated"
                              : p.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600">
                          {allocated === 0
                            ? "Unallocated"
                            : `${formatINR(allocated)} / ${formatINR(p.amount)}`}
                          {allocated > 0 && needsAllocation && (
                            <div className="mt-0.5 text-xs text-red-500">
                              {formatINR(p.amount - allocated)} left
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {needsAllocation && (
                            <button
                              onClick={() => setAllocating(p)}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Allocate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

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
          setError(e instanceof Error ? e.message : "Failed to load invoices");
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
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="allocate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h3 id="allocate-title" className="font-semibold text-gray-900">
            Allocate payment
          </h3>
          <p className="text-sm text-gray-500">
            {payment.customer} · {formatINR(payment.amount)} received
            {payment.reference ? ` · ${payment.reference}` : ""} ·{" "}
            {formatINR(allocated)} allocated,{" "}
            <span className="font-medium text-gray-700">
              {formatINR(remaining)} available
            </span>
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">
              No invoices with an outstanding balance to allocate to.
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const value = entries[inv.id] ?? "";
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700">
                      {inv.number}
                      <span className="block text-xs text-gray-400">
                        Outstanding {formatINR(inv.outstanding)}
                      </span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">₹</span>
                      <input
                        type="number"
                        min={0}
                        max={inv.outstanding}
                        value={value}
                        placeholder="0"
                        onChange={(e) =>
                          setEntries({ ...entries, [inv.id]: e.target.value })
                        }
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {entriesTotal > 0 && (
            <p className="text-xs text-gray-500">
              Total to allocate:{" "}
              <span
                className={
                  entriesTotal > remaining ? "font-semibold text-red-500" : "font-medium text-gray-700"
                }
              >
                {formatINR(entriesTotal)}
              </span>{" "}
              of {formatINR(remaining)} available
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={
                saving ||
                entriesTotal <= 0 ||
                invoices.length === 0
              }
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Allocating…" : "Allocate"}
            </button>
          </div>
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
  const [mode, setMode] = useState("");
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
      setInvoices(
        detail.invoices.filter((i) => i.outstanding > 0)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const canAllocate = Number(amount) > 0 && invoices.length > 0;

  const submit = async () => {
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
          reference: reference || null,
          allocations: allocations.length ? allocations : undefined,
        }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h3 id="record-payment-title" className="font-semibold text-gray-900">
            Record payment
          </h3>
          <p className="text-sm text-gray-500">
            Payments are matched to invoices FIFO unless you allocate explicitly.
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={async (e) => {
                setCustomerId(e.target.value);
                setAllocations([]);
                await loadInvoices(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAllocations([]);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select…</option>
                <option value="UPI">UPI</option>
                <option value="IMPS">IMPS</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="UTR / txn id"
              />
            </div>
          </div>

          {selectedCustomer && (
            <p className="text-xs text-gray-500">
              Outstanding: {formatINR(selectedCustomer.totalOutstanding)} ·{" "}
              {selectedCustomer.totalOverdue > 0
                ? formatINR(selectedCustomer.totalOverdue) + " overdue"
                : "Nothing overdue"}
            </p>
          )}

          {canAllocate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocate to specific invoices (optional)
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {invoices.map((inv) => {
                  const alloc = allocations.find(
                    (a) => a.invoiceId === inv.id
                  );
                  return (
                    <label
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="text-gray-700">
                        {inv.number}
                        <span className="text-gray-400"> · {formatINR(inv.outstanding)}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={!!alloc}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAllocations([
                              ...allocations.filter(
                                (a) => a.invoiceId !== inv.id
                              ),
                              { invoiceId: inv.id, amount: inv.outstanding },
                            ]);
                          } else {
                            setAllocations(
                              allocations.filter(
                                (a) => a.invoiceId !== inv.id
                              )
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || !customerId || !amount || Number(amount) <= 0}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Recording…" : "Record payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}