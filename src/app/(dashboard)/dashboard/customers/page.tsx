"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { CustomerSummary, DuplicateGroup } from "@/lib/types";
import {
  Search,
  Plus,
  ArrowUpDown,
  AlertCircle,
  Building2,
  Merge,
  RefreshCw,
  X,
  Clock,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "overdue">(
    "outstanding"
  );
  const [retryKey, setRetryKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    notes: "",
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [mergingKey, setMergingKey] = useState<string | null>(null);

  const loadDuplicates = useCallback(async () => {
    try {
      setDuplicates(await api<DuplicateGroup[]>("/api/customers/duplicates"));
    } catch {
      // duplicates are best-effort
    }
  }, []);

  const load = useCallback(async (searchQuery?: string) => {
    const params = new URLSearchParams();
    if (searchQuery !== undefined ? searchQuery.trim() : search.trim()) {
      params.set("search", (searchQuery !== undefined ? searchQuery : search).trim());
    }
    const qs = params.toString();
    const data = await api<CustomerSummary[]>(`/api/customers${qs ? `?${qs}` : ""}`);
    setCustomers(data);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, d] = await Promise.all([
          api<CustomerSummary[]>("/api/customers"),
          api<DuplicateGroup[]>("/api/customers/duplicates").catch(() => []),
        ]);
        if (cancelled) return;
        setCustomers(c);
        setDuplicates(d);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError(null);
    try {
      await apiPost(`/api/customers`, {
        name: createForm.name.trim(),
        email: createForm.email.trim() || null,
        phone: createForm.phone.trim() || null,
        gstin: createForm.gstin.trim() || null,
        notes: createForm.notes.trim() || null,
      });
      setShowCreate(false);
      setCreateForm({ name: "", email: "", phone: "", gstin: "", notes: "" });
      await Promise.all([load(), loadDuplicates()]);
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : "Failed to add customer"
      );
    } finally {
      setCreateSaving(false);
    }
  };

  const applyMerge = async (targetId: string, sourceIds: string[], groupKey: string) => {
    setMergingKey(groupKey);
    try {
      await apiPost(`/api/customers/${targetId}`, { sourceIds });
      await Promise.all([load(), loadDuplicates()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Merge failed");
    } finally {
      setMergingKey(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    void load(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    void load("");
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "outstanding") return b.totalOutstanding - a.totalOutstanding;
    return b.totalOverdue - a.totalOverdue;
  });

  const totalOutstanding = customers.reduce((s, c) => s + c.totalOutstanding, 0);
  const totalOverdue = customers.reduce((s, c) => s + c.totalOverdue, 0);
  const highRiskCount = customers.filter((c) => c.riskScore > 70).length;

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Debtor Directory</h1>
            <Badge variant="blue" size="sm">
              {customers.length} Accounts
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Unified debtor accounts, GSTIN verification, delinquency scores, and historical payment timelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetryKey((k) => k + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setShowCreate(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Add Customer</span>
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
            title="Total Receivables"
            value={formatINR(totalOutstanding)}
            subtitle={`${customers.length} active customer accounts`}
            icon={Building2}
            variant="default"
          />
          <StatCard
            title="Total Overdue"
            value={formatINR(totalOverdue)}
            subtitle="Delinquent across all aging buckets"
            icon={Clock}
            variant="danger"
          />
          <StatCard
            title="High Delinquency Risk"
            value={`${highRiskCount} Debtors`}
            subtitle="Score > 70/100 requiring escalation"
            icon={ShieldAlert}
            variant="purple"
          />
          <StatCard
            title="Duplicate Accounts"
            value={`${duplicates.length} Groups`}
            subtitle="Potential mergers to consolidate ledger"
            icon={Merge}
            variant="warning"
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
            <p className="font-bold">Failed to load debtor records</p>
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
          {/* Duplicate Customers Merge Banner */}
          {duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Merge className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Possible Duplicate Customer Accounts ({duplicates.length})
                </h2>
              </div>
              <p className="text-xs text-amber-800">
                Accounts with identical names or phone numbers can be merged to combine all invoices, promises, and communication timelines into a single record.
              </p>

              <div className="divide-y divide-amber-200/60 rounded-xl bg-white border border-amber-200/80 overflow-hidden">
                {duplicates.map((group) => {
                  const keeper = [...group.members].sort(
                    (a, b) => b.invoicesCount - a.invoicesCount
                  )[0];
                  const rest = group.members.filter((m) => m.id !== keeper.id);
                  const isMerging = mergingKey === group.key;

                  return (
                    <div
                      key={group.key}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {group.members.map((m) => (
                          <span
                            key={m.id}
                            className={`rounded-lg border px-3 py-1 text-xs font-medium flex items-center gap-1.5 ${
                              m.id === keeper.id
                                ? "border-blue-300 bg-blue-50 text-blue-900 shadow-xs"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({m.invoicesCount} inv)
                            </span>
                            {m.id === keeper.id && (
                              <Badge variant="blue" size="sm">
                                Primary Target
                              </Badge>
                            )}
                          </span>
                        ))}
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        loading={isMerging}
                        disabled={rest.length === 0}
                        onClick={() => applyMerge(keeper.id, rest.map((m) => m.id), group.key)}
                        className="border-amber-300 bg-amber-100/60 text-amber-900 hover:bg-amber-200 text-xs shrink-0 self-end sm:self-auto"
                      >
                        Merge into {keeper.name}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search, Filter & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search customer name, GSTIN, email, phone…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1 shrink-0">
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
              >
                <option value="outstanding">Highest Outstanding</option>
                <option value="overdue">Highest Overdue</option>
                <option value="name">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Main Customers Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {sortedCustomers.length === 0 ? (
              customers.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No debtor accounts recorded yet"
                  description="Import your receivables from CSV or Tally XML to automatically populate your customer directory and ledger balances."
                  actionLabel="Import Receivables →"
                  onAction={() => {
                    router.push("/dashboard/import");
                  }}
                  className="py-16 border-0"
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching customers"
                  description={`No customer accounts matched "${search}". Try adjusting your search query or clear the filter.`}
                  actionLabel="Clear Search Filter"
                  onAction={handleClearSearch}
                  className="py-12 border-0"
                />
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 text-[11px]">
                      <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Customer / Debtor</th>
                      <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Total Outstanding</th>
                      <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Overdue Balance</th>
                      <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider">Risk Score</th>
                      <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider">Invoices</th>
                      <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Last Payment</th>
                      <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedCustomers.map((customer) => {
                      const isHighRisk = customer.riskScore > 70;
                      const isMedRisk = customer.riskScore > 40;

                      return (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                          onClick={() => {
                            router.push(`/dashboard/customers/${customer.id}`);
                          }}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs shrink-0 border ${
                                  isHighRisk
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : isMedRisk
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-green-100 text-green-700 border-green-200"
                                }`}
                              >
                                {customer.initials}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/dashboard/customers/${customer.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate block"
                                >
                                  {customer.name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                  <span>{customer.email ?? customer.phone ?? "No contact details"}</span>
                                  {customer.gstin && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-gray-600 font-medium">
                                        {customer.gstin}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span className="font-mono font-bold text-gray-900 text-sm">
                              {formatINR(customer.totalOutstanding)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={`font-mono font-bold text-sm ${
                                customer.totalOverdue > 0 ? "text-red-600" : "text-gray-400"
                              }`}
                            >
                              {customer.totalOverdue > 0 ? formatINR(customer.totalOverdue) : "₹0"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <Badge
                              variant={isHighRisk ? "danger" : isMedRisk ? "warning" : "success"}
                              size="sm"
                            >
                              {customer.riskScore}/100
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-center font-mono font-semibold text-gray-700 text-xs">
                            {customer.invoicesCount}
                          </td>

                          <td className="px-5 py-4 text-gray-500 text-xs">
                            {customer.lastPaymentAt
                              ? new Date(customer.lastPaymentAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "No prior payments"}
                          </td>

                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/dashboard/customers/${customer.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-gray-500 hover:text-blue-600">
                                <span>360 View</span>
                                <ChevronRight className="h-4 w-4 ml-1 text-gray-400" strokeWidth={1.5} />
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
          </div>
        </>
      )}

      {/* Add Customer Modal */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCreate(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <h3 id="create-customer-title" className="font-bold text-gray-900 text-base">
                  Add New Debtor Account
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creates a customer master profile with zero initial ledger dues.
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
              <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={submitCreate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  autoFocus
                  required
                  minLength={2}
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Acme Industrial Solutions Pvt Ltd"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="accounts@acme.com"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN Number</label>
                <input
                  value={createForm.gstin}
                  onChange={(e) => setCreateForm({ ...createForm, gstin: e.target.value })}
                  placeholder="27ABCDE1234F1Z5"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium uppercase text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Billing terms, verified contact person, or credit limit details…"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none transition-all shadow-xs"
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
                  disabled={createForm.name.trim().length < 2}
                  className="gap-1.5"
                >
                  <span>Create Account</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
