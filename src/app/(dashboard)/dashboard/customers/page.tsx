"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  totalOutstanding: number;
  totalOverdue: number;
  invoicesCount: number;
  riskScore: number;
  lastPaymentAt: string | null;
  status: string;
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Raj Steel",
    initials: "RS",
    email: "raj@rajsteel.com",
    phone: "+91 98765 43210",
    totalOutstanding: 480000,
    totalOverdue: 480000,
    invoicesCount: 3,
    riskScore: 85,
    lastPaymentAt: "2026-07-15",
    status: "overdue",
  },
  {
    id: "2",
    name: "ABC Engineering",
    initials: "AE",
    email: "accounts@abceng.com",
    phone: "+91 87654 32109",
    totalOutstanding: 220000,
    totalOverdue: 220000,
    invoicesCount: 2,
    riskScore: 45,
    lastPaymentAt: "2026-08-10",
    status: "overdue",
  },
  {
    id: "3",
    name: "Delta Systems",
    initials: "DS",
    email: "finance@deltasys.com",
    phone: "+91 76543 21098",
    totalOutstanding: 310000,
    totalOverdue: 310000,
    invoicesCount: 1,
    riskScore: 72,
    lastPaymentAt: "2026-06-20",
    status: "disputed",
  },
  {
    id: "4",
    name: "Metro Components",
    initials: "MC",
    email: "info@metrocomp.com",
    phone: "+91 65432 10987",
    totalOutstanding: 170000,
    totalOverdue: 170000,
    invoicesCount: 4,
    riskScore: 30,
    lastPaymentAt: "2026-08-28",
    status: "overdue",
  },
  {
    id: "5",
    name: "Sharma Exports",
    initials: "SE",
    email: "payments@sharmaexp.com",
    phone: "+91 54321 09876",
    totalOutstanding: 130000,
    totalOverdue: 130000,
    invoicesCount: 2,
    riskScore: 55,
    lastPaymentAt: "2026-08-01",
    status: "overdue",
  },
  {
    id: "6",
    name: "Patel Traders",
    initials: "PT",
    email: "accounts@pateltraders.com",
    phone: "+91 43210 98765",
    totalOutstanding: 95000,
    totalOverdue: 95000,
    invoicesCount: 1,
    riskScore: 60,
    lastPaymentAt: "2026-07-20",
    status: "overdue",
  },
  {
    id: "7",
    name: "Kumar Industries",
    initials: "KI",
    email: "finance@kumarind.com",
    phone: "+91 32109 87654",
    totalOutstanding: 45000,
    totalOverdue: 0,
    invoicesCount: 1,
    riskScore: 15,
    lastPaymentAt: "2026-08-30",
    status: "current",
  },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "overdue">(
    "outstanding"
  );

  const filtered = mockCustomers
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "outstanding")
        return b.totalOutstanding - a.totalOutstanding;
      return b.totalOverdue - a.totalOverdue;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mockCustomers.length} customers ·{" "}
            {formatINR(
              mockCustomers.reduce((sum, c) => sum + c.totalOutstanding, 0)
            )}{" "}
            total outstanding
          </p>
        </div>
      </div>

      {/* Search & Filters */}
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

      {/* Customer Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                        <p className="text-xs text-gray-500">{customer.email}</p>
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
                        ? new Date(customer.lastPaymentAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Never"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
