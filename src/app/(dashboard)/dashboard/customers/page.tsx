"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, ApiError } from "@/lib/api";
import type { CustomerSummary, DuplicateGroup } from "@/lib/types";

export default function CustomersPage() {
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

  const loadDuplicates = useCallback(async () => {
    try {
      setDuplicates(await api<DuplicateGroup[]>("/api/customers/duplicates"));
    } catch {
      // duplicates are best-effort; page works without them
    }
  }, []);

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

  const applyMerge = async (targetId: string, sourceIds: string[]) => {
    try {
      await apiPost(`/api/customers/${targetId}`, { sourceIds });
      await Promise.all([load(), loadDuplicates()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Merge failed");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, d] = await Promise.all([
          api<CustomerSummary[]>("/api/customers"),
          api<DuplicateGroup[]>("/api/customers/duplicates"),
        ]);
        if (cancelled) return;
        setCustomers(c);
        setDuplicates(d);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const load = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const qs = params.toString();
    setCustomers(
      await api<CustomerSummary[]>(`/api/customers${qs ? `?${qs}` : ""}`)
    );
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = customers
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "outstanding")
        return b.totalOutstanding - a.totalOutstanding;
      return b.totalOverdue - a.totalOverdue;
    });

  const totalOutstanding = customers.reduce(
    (s, c) => s + c.totalOutstanding,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {customers.length} customers · {formatINR(totalOutstanding)} total
            outstanding
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Add customer
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading customers…</p>}
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

      {!loading && !error && (
        <>
          {duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
              <div className="px-6 py-4 border-b border-amber-200">
                <h2 className="font-semibold text-gray-900">
                  Possible duplicate customers
                </h2>
                <p className="text-sm text-amber-800 mt-0.5">
                  Customers with matching names may be the same account. Merge
                  them to combine invoices, payments, and history.
                </p>
              </div>
              <div className="divide-y divide-amber-200/70">
                {duplicates.map((group) => {
                  const keeper = [...group.members].sort(
                    (a, b) => b.invoicesCount - a.invoicesCount
                  )[0];
                  const rest = group.members.filter((m) => m.id !== keeper.id);
                  return (
                    <div
                      key={group.key}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex flex-wrap gap-2">
                        {group.members.map((m) => (
                          <span
                            key={m.id}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                              m.id === keeper.id
                                ? "border-blue-300 bg-blue-50 text-blue-800"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            {m.name}
                            {m.id === keeper.id && (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase text-blue-600">
                                Keep
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          applyMerge(keeper.id, rest.map((m) => m.id))
                        }
                        disabled={rest.length === 0}
                        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Merge {rest.length === 0 ? "" : `${rest.length} into ${keeper.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearch(searchInput.trim());
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setSearch(searchInput.trim())}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="outstanding">Sort by outstanding</option>
              <option value="overdue">Sort by overdue</option>
              <option value="name">Sort by name</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              customers.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                    <svg
                      className="h-7 w-7 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Get started with your receivables
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                    Import your outstanding invoices (from Tally, Excel, or any
                    accounting export) to build your collection queue and start
                    chasing payments.
                  </p>
                  <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left">
                    {[
                      ["1", "Import a CSV", "Upload your receivables file"],
                      ["2", "Auto-map columns", "Match your file to DuesPilot fields"],
                      ["3", "See your queue", "Get a prioritized chase list instantly"],
                    ].map(([step, title, sub]) => (
                      <li key={step} className="flex items-center gap-3">
                        <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {step}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {title}
                          </p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <a
                    href="/dashboard/import"
                    className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Import receivables
                  </a>
                </div>
              ) : (
                <p className="px-6 py-10 text-sm text-gray-500">
                  No customers match your search.
                </p>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                        Outstanding
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                        Overdue
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        Risk
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        Invoices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Last Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                                customer.riskScore > 70
                                  ? "bg-red-50 border border-red-200"
                                  : customer.riskScore > 40
                                  ? "bg-orange-50 border border-orange-200"
                                  : "bg-green-50 border border-green-200"
                              }`}
                            >
                              <span
                                className={`font-bold text-xs ${
                                  customer.riskScore > 70
                                    ? "text-red-700"
                                    : customer.riskScore > 40
                                    ? "text-orange-700"
                                    : "text-green-700"
                                }`}
                              >
                                {customer.initials}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {customer.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {customer.email ?? "No email"}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatINR(customer.totalOutstanding)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`text-sm font-medium ${
                              customer.totalOverdue > 0
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {customer.totalOverdue > 0
                              ? formatINR(customer.totalOverdue)
                              : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              customer.riskScore > 70
                                ? "bg-red-100 text-red-700"
                                : customer.riskScore > 40
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {customer.riskScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">
                            {customer.invoicesCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {customer.lastPaymentAt
                              ? new Date(
                                  customer.lastPaymentAt
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Never"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-customer-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCreate(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h3 id="create-customer-title" className="font-semibold text-gray-900">
                Add customer
              </h3>
              <p className="text-sm text-gray-500">
                A new customer with zero invoices. Import invoices from CSV to
                attach balances.
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
                  htmlFor="create-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name *
                </label>
                <input
                  id="create-name"
                  autoFocus
                  required
                  minLength={2}
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="create-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="create-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="create-gstin"
                  className="block text-sm font-medium text-gray-700"
                >
                  GSTIN
                </label>
                <input
                  id="create-gstin"
                  value={createForm.gstin}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, gstin: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="create-notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="create-notes"
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
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
                  disabled={createSaving || createForm.name.trim().length < 2}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createSaving ? "Saving…" : "Add customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
