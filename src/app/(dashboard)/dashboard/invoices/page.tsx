"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { InvoiceRow } from "@/lib/types";

type FilterStatus = "all" | "open" | "overdue" | "due_soon" | "disputed" | "paid" | "promised" | "partial";

const PAGE_SIZE = 50;

const statusStyles: Record<Exclude<FilterStatus, "all">, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  due_soon: "bg-orange-50 text-orange-700 border-orange-200",
  disputed: "bg-purple-50 text-purple-700 border-purple-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  promised: "bg-yellow-50 text-yellow-700 border-yellow-200",
  partial: "bg-teal-50 text-teal-700 border-teal-200",
};

function displayStatus(inv: InvoiceRow): Exclude<FilterStatus, "all"> {
  const s = inv.status;
  if (s === "PAID" || s === "CANCELLED") return "paid";
  if (s === "DISPUTED") return "disputed";
  if (s === "PARTIALLY_PAID") return "partial";
  if (s === "PROMISED" || s === "PROMISE_BROKEN") return "promised";
  if (inv.daysOverdue > 0) return "overdue";
  const daysUntil = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86_400_000);
  if (daysUntil >= 0 && daysUntil <= 7) return "due_soon";
  return "open";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<
    { id: string; name: string; totalOutstanding: number }[]
  >([]);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    invoiceNumber: "",
    amount: "",
    invoiceDate: "",
    dueDate: "",
    notes: "",
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async (opts: { filter: FilterStatus; search: string; page: number }) => {
    try {
      const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
      if (opts.filter !== "all") params.set("status", opts.filter);
      if (opts.search) params.set("search", opts.search);
      if (opts.page > 1) params.set("page", String(opts.page));
      const data = await api<{
        items: InvoiceRow[];
        total: number;
        page: number;
        hasMore: boolean;
      }>(`/api/invoices?${params.toString()}`);
      setError(null);
      setInvoices(data.items);
      setTotal(data.total);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load({ filter, search, page: 1 }), 0);
    return () => clearTimeout(t);
  }, [filter, search, load]);

  const changeFilter = (next: FilterStatus) => {
    if (next === filter) return;
    setFilter(next);
  };

  const applySearch = () => setSearch(searchInput.trim());

  const openCreate = async () => {
    setCreateError(null);
    setCreateForm({
      customerId: "",
      invoiceNumber: "",
      amount: "",
      invoiceDate: "",
      dueDate: "",
      notes: "",
    });
    try {
      setCustomers(
        await api<{ id: string; name: string; totalOutstanding: number }[]>(
          "/api/customers"
        )
      );
    } catch {
      setCustomers([]);
    }
    setShowCreate(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError(null);
    try {
      await apiPost("/api/invoices", {
        customerId: createForm.customerId,
        invoiceNumber: createForm.invoiceNumber.trim(),
        amount: Number(createForm.amount),
        invoiceDate: createForm.invoiceDate,
        dueDate: createForm.dueDate,
        notes: createForm.notes.trim() || null,
      });
      setShowCreate(false);
      await load({ filter, search, page: 1 });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to add invoice"
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const totalOutstanding = invoices.reduce((s, i) => s + i.outstanding, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} invoices · {formatINR(totalOutstanding)} outstanding on this page
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/invoices/export"
            download
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </a>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            Add invoice
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={() => load({ filter, search, page: 1 })}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search invoice # or customer…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={applySearch}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        <button
          onClick={() => {
            setSearchInput("");
            setSearch("");
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "open", "overdue", "due_soon", "disputed", "promised", "partial", "paid"] as const).map((s) => (
          <button
            key={s}
            onClick={() => changeFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading invoices…</p>}

      {!loading && !error && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {invoices.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-500">
                No invoices match this filter.
              </p>
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
                    {invoices.map((inv) => {
                      const st = displayStatus(inv);
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            <Link
                              href={`/dashboard/invoices/${inv.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {inv.number}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-gray-700">{inv.customer}</td>
                          <td className="px-6 py-3 text-right text-gray-700">{formatINR(inv.amount)}</td>
                          <td className={`px-6 py-3 text-right font-medium ${inv.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{formatINR(inv.outstanding)}</td>
                          <td className="px-6 py-3 text-gray-500">{new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[st]}`}>
                              {st.replace("_", " ")}
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

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page} · {total} invoices
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => load({ filter, search, page: page - 1 })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => load({ filter, search, page: page + 1 })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-invoice-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCreate(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h3 id="create-invoice-title" className="font-semibold text-gray-900">
                Add invoice
              </h3>
              <p className="text-sm text-gray-500">
                Creates an OPEN invoice with the full amount outstanding.
              </p>
            </div>

            {createError && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                {createError}
              </div>
            )}

            <form onSubmit={submitCreate} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="invoice-customer"
                  className="block text-sm font-medium text-gray-700"
                >
                  Customer *
                </label>
                <select
                  id="invoice-customer"
                  required
                  autoFocus
                  value={createForm.customerId}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      customerId: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    {customers.length === 0
                      ? "Loading customers…"
                      : "Select a customer"}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="invoice-number"
                  className="block text-sm font-medium text-gray-700"
                >
                  Invoice number *
                </label>
                <input
                  id="invoice-number"
                  required
                  value={createForm.invoiceNumber}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="invoice-date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Invoice date *
                  </label>
                  <input
                    id="invoice-date"
                    type="date"
                    required
                    value={createForm.invoiceDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        invoiceDate: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="invoice-due"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Due date *
                  </label>
                  <input
                    id="invoice-due"
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dueDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="invoice-amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount (₹) *
                </label>
                <input
                  id="invoice-amount"
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, amount: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createSaving ||
                    !createForm.customerId ||
                    !createForm.invoiceNumber.trim() ||
                    !createForm.invoiceDate ||
                    !createForm.dueDate ||
                    !Number(createForm.amount)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createSaving ? "Saving…" : "Add invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}