"use client";

import { use, useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  CustomerContact,
  CustomerDetailData,
  CustomerInvoice,
  CustomerTimelineEvent,
} from "@/lib/types";

function TimelineIcon({ type }: { type: string }) {
  if (type === "promise" || type === "commitment")
    return (
      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  if (type === "message" || type === "communication")
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
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api<CustomerDetailData>(`/api/customers/${id}`);
        if (active) setCustomer(data);
      } catch (e) {
        if (!active) return;
        if (e instanceof Error && (e as { status?: number }).status === 404) {
          setNotFound(true);
        } else {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Customer not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The customer you&apos;re looking for doesn&apos;t exist or you don&apos;t have
          access to it.
        </p>
      </div>
    );
  }

  if (loading)
    return <p className="text-sm text-gray-500">Loading customer…</p>;

  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <span className="text-red-700 font-bold text-lg">
              {customer.initials}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">
              {customer.email ?? "No email"} · {customer.phone ?? "No phone"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 opacity-50 cursor-not-allowed"
            title="Editing customers is not connected yet"
          >
            Edit
          </button>
          <button
            disabled
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            title="Sending reminders is not connected yet"
          >
            Send reminder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Invoices</h2>
            </div>
            {customer.invoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500">No invoices.</p>
            ) : (
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
                    {customer.invoices.map((inv: CustomerInvoice) => (
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
                            {inv.daysOverdue > 0 ? `${inv.daysOverdue}d overdue` : "Due"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Collection Timeline</h2>
            </div>
            <div className="p-6">
              {customer.timeline.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {customer.timeline.map((event: CustomerTimelineEvent, i) => (
                    <div key={event.id ?? i} className="flex items-start gap-3">
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
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
                <span className="font-medium text-gray-900 capitalize">{customer.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GSTIN</span>
                <span className="font-mono text-xs text-gray-700">{customer.gstin ?? "-"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
            {customer.contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts.</p>
            ) : (
              <div className="space-y-3">
                {customer.contacts.map((contact: CustomerContact, i) => (
                  <div key={contact.id ?? i} className="rounded-lg border border-gray-100 p-3">
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
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">
              {customer.notes || "No notes yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
