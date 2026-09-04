"use client";

import { use } from "react";
import { formatINR } from "@/lib/utils";

const mockCustomer = {
  id: "1",
  name: "Raj Steel",
  initials: "RS",
  email: "raj@rajsteel.com",
  phone: "+91 98765 43210",
  gstin: "27AABCR1234A1Z5",
  totalOutstanding: 480000,
  totalOverdue: 480000,
  riskScore: 85,
  status: "overdue",
  notes: "Large distributor. 30-day credit. History of late payments.",
  contacts: [
    { name: "Rajesh Kumar", designation: "Owner", phone: "+91 98765 43210", email: "raj@rajsteel.com", isPrimary: true },
    { name: "Suresh Patel", designation: "Accounts", phone: "+91 98765 43211", email: "suresh@rajsteel.com", isPrimary: false },
  ],
  invoices: [
    { id: "1", number: "INV-2026-001", date: "2026-07-20", dueDate: "2026-08-19", amount: 250000, outstanding: 250000, status: "overdue", daysOverdue: 16 },
    { id: "2", number: "INV-2026-004", date: "2026-08-01", dueDate: "2026-08-31", amount: 180000, outstanding: 180000, status: "overdue", daysOverdue: 4 },
    { id: "3", number: "INV-2026-007", date: "2026-08-10", dueDate: "2026-09-09", amount: 50000, outstanding: 50000, status: "overdue", daysOverdue: 0 },
  ],
  timeline: [
    { date: "2026-08-28", type: "promise", text: "Promised to pay ₹2,50,000 by 28 Aug", status: "broken" },
    { date: "2026-08-25", type: "message", text: "WhatsApp reminder sent to Rajesh Kumar", status: "sent" },
    { date: "2026-08-20", type: "message", text: "Email reminder for INV-2026-001 (overdue)", status: "sent" },
    { date: "2026-08-19", type: "system", text: "INV-2026-001 became overdue", status: "" },
    { date: "2026-08-15", type: "message", text: "Pre-due reminder sent", status: "sent" },
    { date: "2026-08-01", type: "system", text: "INV-2026-004 created (₹1,80,000)", status: "" },
    { date: "2026-07-20", type: "system", text: "INV-2026-001 created (₹2,50,000)", status: "" },
    { date: "2026-07-15", type: "payment", text: "Payment received: ₹1,20,000 for INV-2026-003", status: "matched" },
  ],
};

function TimelineIcon({ type }: { type: string }) {
  if (type === "promise")
    return (
      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  if (type === "message")
    return (
      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    );
  if (type === "payment")
    return (
      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  return (
    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = use(params);
  const customer = mockCustomer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <span className="text-red-700 font-bold text-lg">{customer.initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">
              {customer.email} · {customer.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit
          </button>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Send reminder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invoices + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoices */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Invoices</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50">
                    <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500">Invoice</th>
                    <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500">Amount</th>
                    <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500">Outstanding</th>
                    <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500">Due Date</th>
                    <th className="px-6 py-2.5 text-center text-xs font-semibold text-gray-500">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{inv.number}</td>
                      <td className="px-6 py-3 text-right text-gray-700">{formatINR(inv.amount)}</td>
                      <td className="px-6 py-3 text-right text-red-600 font-medium">{formatINR(inv.outstanding)}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          inv.daysOverdue > 14 ? "bg-red-100 text-red-700" : inv.daysOverdue > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }`}>
                          {inv.daysOverdue > 0 ? `${inv.daysOverdue}d overdue` : "Due today"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Collection Timeline</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {customer.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <TimelineIcon type={event.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{event.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {event.status === "broken" && (
                          <span className="ml-2 text-red-600 font-semibold">Broken</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary + Contacts */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total outstanding</span>
                <span className="font-semibold text-gray-900">{formatINR(customer.totalOutstanding)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total overdue</span>
                <span className="font-semibold text-red-600">{formatINR(customer.totalOverdue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Risk score</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                  customer.riskScore > 70 ? "bg-red-100 text-red-700" : customer.riskScore > 40 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                }`}>
                  {customer.riskScore}/100
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-red-600 capitalize">{customer.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GSTIN</span>
                <span className="font-mono text-xs text-gray-700">{customer.gstin}</span>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
            <div className="space-y-3">
              {customer.contacts.map((contact, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                    {contact.isPrimary && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{contact.designation}</p>
                  <p className="text-xs text-gray-600 mt-1">{contact.phone}</p>
                  <p className="text-xs text-gray-600">{contact.email}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">{customer.notes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
