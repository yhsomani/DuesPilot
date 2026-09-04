"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { CustomerSummary } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "overdue">(
    "outstanding"
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<CustomerSummary[]>("/api/customers");
        if (active) setCustomers(data);
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

  const filtered = customers
    .filter((c) =>
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase()))
    )
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
      </div>

      {loading && <p className="text-sm text-gray-500">Loading customers…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
              <p className="px-6 py-10 text-sm text-gray-500">
                No customers found. Import receivables to get started.
              </p>
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
    </div>
  );
}
