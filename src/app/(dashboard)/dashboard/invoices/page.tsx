"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";

type InvoiceStatus = "open" | "overdue" | "disputed" | "paid" | "promised";

interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: InvoiceStatus;
  daysOverdue: number;
}

const mockInvoices: Invoice[] = [
  { id: "1", number: "INV-2026-001", customer: "Raj Steel", date: "2026-07-20", dueDate: "2026-08-19", amount: 250000, outstanding: 250000, status: "overdue", daysOverdue: 16 },
  { id: "2", number: "INV-2026-002", customer: "ABC Engineering", date: "2026-08-05", dueDate: "2026-09-04", amount: 120000, outstanding: 120000, status: "open", daysOverdue: 0 },
  { id: "3", number: "INV-2026-003", customer: "Metro Components", date: "2026-08-10", dueDate: "2026-09-09", amount: 85000, outstanding: 0, status: "paid", daysOverdue: 0 },
  { id: "4", number: "INV-2026-004", customer: "Raj Steel", date: "2026-08-01", dueDate: "2026-08-31", amount: 180000, outstanding: 180000, status: "overdue", daysOverdue: 4 },
  { id: "5", number: "INV-2026-005", customer: "ABC Engineering", date: "2026-08-15", dueDate: "2026-09-14", amount: 100000, outstanding: 100000, status: "promised", daysOverdue: 0 },
  { id: "6", number: "INV-2026-006", customer: "Metro Components", date: "2026-07-25", dueDate: "2026-08-24", amount: 170000, outstanding: 170000, status: "overdue", daysOverdue: 11 },
  { id: "7", number: "INV-2026-007", customer: "Delta Systems", date: "2026-06-20", dueDate: "2026-07-20", amount: 310000, outstanding: 310000, status: "disputed", daysOverdue: 46 },
  { id: "8", number: "INV-2026-008", customer: "Sharma Exports", date: "2026-08-10", dueDate: "2026-09-09", amount: 130000, outstanding: 130000, status: "overdue", daysOverdue: 0 },
];

const statusStyles: Record<InvoiceStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  disputed: "bg-purple-50 text-purple-700 border-purple-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  promised: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function InvoicesPage() {
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");
  const filtered = filter === "all" ? mockInvoices : mockInvoices.filter(i => i.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">{mockInvoices.length} invoices · {formatINR(mockInvoices.reduce((s, i) => s + i.outstanding, 0))} outstanding</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "open", "overdue", "disputed", "promised", "paid"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{inv.number}</td>
                  <td className="px-6 py-3 text-gray-700">{inv.customer}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{formatINR(inv.amount)}</td>
                  <td className={`px-6 py-3 text-right font-medium ${inv.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{formatINR(inv.outstanding)}</td>
                  <td className="px-6 py-3 text-gray-500">{new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[inv.status]}`}>
                      {inv.status}
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
