"use client";

import { use, useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api, apiPost, apiPatch, apiDel, ApiError } from "@/lib/api";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";
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
  const [showActions, setShowActions] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [invoiceForReminder, setInvoiceForReminder] = useState<CustomerInvoice | null>(null);

  const load = async () => {
    const data = await api<CustomerDetailData>(`/api/customers/${id}`);
    setCustomer(data);
  };

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
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <p>{error}</p>
        <button
          onClick={() => void load()}
          className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
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
            onClick={() => {
              setInvoiceForReminder(null);
              setIsReminderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700 transition"
          >
            <span>📧</span>
            <span>Send Reminder</span>
          </button>
          <EditCustomerModal
            customerId={customer.id}
            customer={customer}
            onChange={() => load()}
          />
          <button
            onClick={() => setShowActions(true)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Actions
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
                      <th className="px-6 py-2.5 text-right text-xs font-semibold text-gray-500">Action</th>
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
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceForReminder(inv);
                              setIsReminderOpen(true);
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Remind
                          </button>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Contacts</h3>
              <ContactEditor
                customerId={customer.id}
                contacts={customer.contacts}
                onChange={() => load()}
              />
            </div>
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

      {showActions && customer && (
        <CustomerActionsModal
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setShowActions(false)}
          onDone={async () => {
            setShowActions(false);
            await load();
          }}
        />
      )}

      {isReminderOpen && customer && (
        <SendReminderModal
          customerId={customer.id}
          customerName={customer.name}
          amount={invoiceForReminder ? invoiceForReminder.amount : customer.totalDue}
          outstandingAmount={invoiceForReminder ? invoiceForReminder.outstanding : customer.totalDue}
          invoiceNumber={invoiceForReminder?.number}
          invoiceId={invoiceForReminder?.id}
          dueDate={invoiceForReminder?.dueDate}
          daysOverdue={invoiceForReminder?.daysOverdue ?? 0}
          isOpen={true}
          onClose={() => {
            setIsReminderOpen(false);
            setInvoiceForReminder(null);
          }}
          onSuccess={async () => {
            setIsReminderOpen(false);
            setInvoiceForReminder(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CustomerActionsModal({
  customerId,
  customerName,
  onClose,
  onDone,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"payment" | "promise" | "event">("payment");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [mode, setMode] = useState("");
  const [reference, setReference] = useState("");

  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [eventType, setEventType] = useState("CALL");
  const [eventNote, setEventNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const recordPayment = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/payments", {
        customerId,
        amount: Number(amount),
        paymentDate,
        mode: mode || null,
        reference: reference || null,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const logPromise = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/promises", {
        customerId,
        amount: Number(promiseAmount),
        promiseDate,
        source: "manual",
        confidence: 75,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const logEvent = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/collection-events", {
        customerId,
        type: eventType,
        description:
          eventNote ||
          (eventType === "CALL"
            ? `Called ${customerName}`
            : eventType === "EMAIL"
            ? `Sent email to ${customerName}`
            : `Sent WhatsApp to ${customerName}`),
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-action-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 id="quick-action-title" className="font-semibold text-gray-900">{customerName}</h3>
            <p className="text-sm text-gray-500">Quick action</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <div className="flex border-b border-gray-100">
          {(["payment", "promise", "event"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "payment" ? "Payment" : t === "promise" ? "Promise" : "Event"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "payment" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select…</option>
                    <option value="UPI">UPI</option>
                    <option value="IMPS">IMPS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="UTR / txn id"
                />
              </div>
              <button
                onClick={recordPayment}
                disabled={saving || !amount || Number(amount) <= 0}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Record payment"}
              </button>
            </>
          )}

          {tab === "promise" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promise date *
                </label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={logPromise}
                disabled={saving || !promiseAmount || Number(promiseAmount) <= 0}
                className="w-full rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Log promise"}
              </button>
            </>
          )}

          {tab === "event" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CALL">Call</option>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="MEETING">Meeting</option>
                  <option value="NOTE">Note</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Details
                </label>
                <textarea
                  rows={3}
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="What happened on this call?"
                />
              </div>
              <button
                onClick={logEvent}
                disabled={saving}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Log event"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditCustomerModal({
  customerId,
  customer,
  onChange,
}: {
  customerId: string;
  customer: CustomerDetailData;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [gstin, setGstin] = useState(customer.gstin ?? "");
  const [status, setStatus] = useState(customer.status);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setName(customer.name);
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setGstin(customer.gstin ?? "");
    setStatus(customer.status);
    setNotes(customer.notes ?? "");
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/api/customers/${customerId}`, {
        name,
        email: email || null,
        phone: phone || null,
        gstin: gstin || null,
        status,
        notes: notes || null,
      });
      setOpen(false);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Edit
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Edit customer</h3>
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || name.trim().length < 2}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ContactEditor({
  customerId,
  contacts,
  onChange,
}: {
  customerId: string;
  contacts: CustomerContact[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/customers/${customerId}/contacts`, {
        name,
        email: email || null,
        phone: phone || null,
        designation: designation || null,
        isPrimary,
      });
      setName("");
      setEmail("");
      setPhone("");
      setDesignation("");
      setIsPrimary(false);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contactId: string) => {
    if (!window.confirm("Remove this contact?")) return;
    try {
      await apiDel(
        `/api/customers/${customerId}/contacts/${contactId}`
      );
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  };

  const makePrimary = async (contactId: string) => {
    try {
      await apiPatch(
        `/api/customers/${customerId}/contacts/${contactId}`,
        { isPrimary: true }
      );
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Manage
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-contacts-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 id="manage-contacts-title" className="font-semibold text-gray-900">Manage contacts</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-500">No contacts yet.</p>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.name}
                          {c.isPrimary && (
                            <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                              PRIMARY
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.designation ?? ""}
                          {c.phone ?? ""}
                          {c.email ?? ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!c.isPrimary && (
                          <button
                            onClick={() => makePrimary(c.id)}
                            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            Set primary
                          </button>
                        )}
                        <button
                          onClick={() => remove(c.id)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Add contact</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name *"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Designation"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Primary contact
                </label>
                <button
                  onClick={create}
                  disabled={saving || name.trim().length < 2}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Adding…" : "Add contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
