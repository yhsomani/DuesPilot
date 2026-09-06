"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { InvoiceRow } from "@/lib/types";
import {
  FileText,
  Download,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type FilterStatus =
  | "all"
  | "open"
  | "overdue"
  | "due_soon"
  | "disputed"
  | "paid"
  | "promised"
  | "partial";

const PAGE_SIZE = 50;

function displayStatus(inv: InvoiceRow): {
  key: Exclude<FilterStatus, "all">;
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "purple" | "blue" | "neutral";
} {
  const s = inv.status;
  if (s === "PAID" || s === "CANCELLED")
    return { key: "paid", label: "Paid", variant: "success" };
  if (s === "DISPUTED")
    return { key: "disputed", label: "Disputed", variant: "purple" };
  if (s === "PARTIALLY_PAID")
    return { key: "partial", label: "Partial", variant: "blue" };
  if (s === "PROMISED" || s === "PROMISE_BROKEN")
    return { key: "promised", label: s === "PROMISE_BROKEN" ? "Broken Promise" : "Promised", variant: "warning" };
  if (inv.daysOverdue > 0)
    return { key: "overdue", label: `${inv.daysOverdue}d Overdue`, variant: "danger" };
  const daysUntil = Math.ceil(
    (new Date(inv.dueDate).getTime() - Date.now()) / 86_400_000
  );
  if (daysUntil >= 0 && daysUntil <= 7)
    return { key: "due_soon", label: `Due in ${daysUntil}d`, variant: "warning" };
  return { key: "open", label: "Current", variant: "blue" };
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
  const [createForm, setCreateForm] = useState(() => ({
    customerId: "",
    invoiceNumber: "",
    amount: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    notes: "",
  }));
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: { filter: FilterStatus; search: string; page: number }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
        if (opts.filter !== "all") params.set("status", opts.filter);
        if (opts.search) params.set("search", opts.search);
        if (opts.page > 1) params.set("page", String(opts.page));
        const data = await api<{
          items?: InvoiceRow[];
          invoices?: InvoiceRow[];
          total?: number;
          page?: number;
          hasMore?: boolean;
        } | InvoiceRow[]>(`/api/invoices?${params.toString()}`);
        setError(null);
        const list: InvoiceRow[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items!
          : Array.isArray(data?.invoices)
          ? data.invoices!
          : [];
        const meta = Array.isArray(data) ? null : data;
        setInvoices(list);
        setTotal(typeof meta?.total === "number" ? meta.total : list.length);
        setPage(typeof meta?.page === "number" ? meta.page : 1);
        setHasMore(Boolean(meta?.hasMore));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoices register");
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
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
        err instanceof ApiError ? err.message : "Failed to record invoice"
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const totalOutstanding = invoices.reduce((s, i) => s + i.outstanding, 0);
  const overdueCount = invoices.filter((i) => i.daysOverdue > 0).length;
  const overdueTotal = invoices
    .filter((i) => i.daysOverdue > 0)
    .reduce((s, i) => s + i.outstanding, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices Register</h1>
            <Badge variant="blue" size="sm">
              {total} Total Invoices
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive receivables ledger with aging breakdowns, payment allocations, and dispute logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load({ filter, search, page })}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/invoices/export";
              a.download = "duespilot-invoices.csv";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="gap-1.5"
          >
            <Download className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Export CSV</span>
          </Button>

          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Add Invoice</span>
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
            title="Total Outstanding"
            value={formatINR(totalOutstanding)}
            subtitle="Cumulative open receivables"
            icon={FileText}
            variant="default"
          />
          <StatCard
            title="Overdue Receivables"
            value={formatINR(overdueTotal)}
            subtitle={`${overdueCount} bills past credit terms`}
            icon={Clock}
            variant="danger"
          />
          <StatCard
            title="Ledger Scope"
            value={`${total} Invoices`}
            subtitle={`Showing page ${page} of ${Math.ceil(total / PAGE_SIZE) || 1}`}
            icon={Building2}
            variant="blue"
          />
          <StatCard
            title="Settled Invoices"
            value={formatINR(
              invoices
                .filter((i) => i.status === "PAID")
                .reduce((s, i) => s + i.amount, 0)
            )}
            subtitle={`${invoices.filter((i) => i.status === "PAID").length} settled bills on page`}
            icon={CheckCircle2}
            variant="success"
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
            <p className="font-bold">Failed to load invoices</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <button
              onClick={() => load({ filter, search, page: 1 })}
              className="mt-2 text-xs font-semibold text-red-900 underline hover:text-red-950"
            >
              Try reloading
            </button>
          </div>
        </div>
      )}

      {/* Controls Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "open", label: "Current" },
              { id: "overdue", label: "Overdue" },
              { id: "due_soon", label: "Due Soon" },
              { id: "disputed", label: "Disputed" },
              { id: "promised", label: "Promised" },
              { id: "partial", label: "Partial" },
              { id: "paid", label: "Paid" },
            ] as const
          ).map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => changeFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search invoice # or debtor…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Main Invoices Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading receivables ledger…</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description={
              search
                ? `No invoices matched "${search}". Try adjusting your search query.`
                : "No invoices match the selected filter category."
            }
            className="py-12 border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-xs">
                  <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Invoice #</th>
                  <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Customer / Debtor</th>
                  <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Outstanding</th>
                  <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider">Aging Status</th>
                  <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const status = displayStatus(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-gray-900 font-mono">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-800">
                        <Link
                          href={`/dashboard/customers/${inv.customerId}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {inv.customer}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-gray-700">
                        {formatINR(inv.amount)}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          inv.outstanding > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {formatINR(inv.outstanding)}
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-xs">
                        {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/dashboard/invoices/${inv.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50/60 font-semibold"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-4 w-4 ml-0.5" strokeWidth={1.5} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > PAGE_SIZE && (
          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">
              Page {page} of {Math.ceil(total / PAGE_SIZE)} · Showing {invoices.length} of {total} items
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => load({ filter, search, page: page - 1 })}
                className="gap-1 h-8"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                <span>Prev</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasMore}
                onClick={() => load({ filter, search, page: page + 1 })}
                className="gap-1 h-8"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Invoice Modal */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-invoice-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
              <div>
                <h3 id="create-invoice-title" className="font-bold text-gray-900 text-base">
                  Record New Invoice
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creates an open invoice with full outstanding balance
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {createError && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={submitCreate} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label htmlFor="create-invoice-customer" className="block text-xs font-bold text-gray-700 mb-1">
                  Customer / Debtor *
                </label>
                <select
                  id="create-invoice-customer"
                  required
                  autoFocus
                  value={createForm.customerId}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      customerId: e.target.value,
                    })
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                >
                  <option value="" disabled>
                    {customers.length === 0 ? "Loading customer list…" : "Select a debtor account…"}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="create-invoice-number" className="block text-xs font-bold text-gray-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  id="create-invoice-number"
                  required
                  value={createForm.invoiceNumber}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                  placeholder="e.g. INV-2026-0891"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-invoice-date" className="block text-xs font-bold text-gray-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    id="create-invoice-date"
                    type="date"
                    required
                    value={createForm.invoiceDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        invoiceDate: e.target.value,
                      })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label htmlFor="create-invoice-due-date" className="block text-xs font-bold text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    id="create-invoice-due-date"
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-invoice-amount" className="block text-xs font-bold text-gray-700 mb-1">
                  Invoice Amount (₹) *
                </label>
                <input
                  id="create-invoice-amount"
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="50000"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      amount: e.target.value,
                    })
                  }
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>

              <div>
                <label htmlFor="create-invoice-notes" className="block text-xs font-bold text-gray-700 mb-1">
                  Internal Remarks / PO Reference
                </label>
                <textarea
                  id="create-invoice-notes"
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Optional PO number, contract details, or dispatch note…"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  disabled={createSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={createSaving}
                  disabled={
                    createSaving ||
                    !createForm.customerId ||
                    !createForm.invoiceNumber.trim() ||
                    !createForm.invoiceDate ||
                    !createForm.dueDate ||
                    !Number(createForm.amount)
                  }
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Record Invoice</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
