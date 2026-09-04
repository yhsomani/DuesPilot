"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { InvoiceRow } from "@/lib/types";

type FilterStatus = "all" | "open" | "overdue" | "disputed" | "paid" | "promised";

const statusStyles: Record<Exclude<FilterStatus, "all">, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  disputed: "bg-purple-50 text-purple-700 border-purple-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  promised: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

function displayStatus(inv: InvoiceRow): Exclude<FilterStatus, "all"> {
  const s = inv.status;
  if (s === "PAID" || s === "CANCELLED") return "paid";
  if (s === "DISPUTED") return "disputed";
  if (s === "PROMISED" || s === "PROMISE_BROKEN") return "promised";
  if (inv.daysOverdue > 0) return "overdue";
  return "open";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<InvoiceRow[]>("/api/invoices");
        if (active) setInvoices(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    filter === "all"
      ? invoices
      : invoices.filter((i) => displayStatus(i) === filter);

  const totalOutstanding = invoices.reduce((s, i) => s + i.outstanding, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">
          {invoices.length} invoices · {formatINR(totalOutstanding)} outstanding
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading invoices…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "open", "overdue", "disputed", "promised", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== "all" && (
                  <span className="ml-1 text-xs">
                    ({invoices.filter((i) => displayStatus(i) === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-500">No invoices found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((inv) => {
                      const st = displayStatus(inv);
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{inv.number}</td>
                          <td className="px-6 py-3 text-gray-700">{inv.customer}</td>
                          <td className="px-6 py-3 text-right text-gray-700">{formatINR(inv.amount)}</td>
                          <td className={`px-6 py-3 text-right font-medium ${inv.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{formatINR(inv.outstanding)}</td>
                          <td className="px-6 py-3 text-gray-500">{new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[st]}`}>
                              {st}
                            </span>
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
    </div>
  );
}
