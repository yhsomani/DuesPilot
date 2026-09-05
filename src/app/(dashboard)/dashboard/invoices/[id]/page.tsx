"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { InvoiceDetail } from "@/lib/types";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const id = (await params).id;
        const data = await api<InvoiceDetail>(`/api/invoices/${id}`);
        if (active) setInvoice(data);
      } catch (e) {
        if (!active) return;
        if (e instanceof Response) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params, retryKey]);

  if (loading) return <p className="text-sm text-gray-500">Loading invoice…</p>;
  if (notFound)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Invoice not found.
      </div>
    );
  if (error)
    return (
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
    );
  if (!invoice) return null;

  const displayStatus = (s: string) => {
    if (s === "PAID" || s === "CANCELLED") return "paid";
    if (s === "DISPUTED") return "disputed";
    if (s === "PARTIALLY_PAID") return "partial";
    if (s === "PROMISED" || s === "PROMISE_BROKEN") return "promised";
    return "open";
  };

  const statusBadge = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    partial: "bg-teal-50 text-teal-700 border-teal-200",
    disputed: "bg-purple-50 text-purple-700 border-purple-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    promised: "bg-yellow-50 text-yellow-700 border-yellow-200",
  }[displayStatus(invoice.status)];

  const typeIcons: Record<string, string> = {
    payment: "₹",
    event: "•",
    promise: "✓",
    dispute: "!",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/dashboard/invoices" className="hover:text-blue-600">
              ← Invoices
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Invoice {invoice.number}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <Link
              href={`/dashboard/customers/${invoice.customerId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {invoice.customerName}
            </Link>{" "}
            ·{" "}
            {new Date(invoice.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge}`}
        >
          {displayStatus(invoice.status).replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Amount</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatINR(invoice.amount)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatINR(invoice.outstanding)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold uppercase text-gray-400">Due Date</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {invoice.notes && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600">
          {invoice.notes}
        </div>
      )}

      {invoice.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Line items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Unit price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Tax</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-6 py-3 text-gray-800">{it.description}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{it.quantity ?? "—"}</td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {it.unitPrice != null ? formatINR(it.unitPrice) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {it.taxRate != null ? `${it.taxRate}%` : "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{formatINR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoice.allocations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Payment allocations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Mode</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.allocations.map((a, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(a.paymentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{a.paymentRef ?? "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{a.mode ?? "—"}</td>
                    <td className="px-6 py-3 text-right font-medium text-green-600">{formatINR(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Timeline</h2>
        </div>
        {invoice.timeline.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No activity recorded for this invoice yet.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {invoice.timeline.map((ev) => (
              <li key={`${ev.type}-${ev.id}`} className="px-6 py-3 flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {typeIcons[ev.type] ?? "•"}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{ev.summary}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(ev.date).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {ev.detail ? ` · ${ev.detail}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}