"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DEFAULT_TEMPLATES, interpolateTemplate, type TemplateDefinition } from "@/lib/templates";

interface MessageItem {
  id: string;
  customerId?: string | null;
  customerName?: string | null;
  invoiceId?: string | null;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | "CALL" | "MANUAL";
  direction: string;
  subject?: string | null;
  body: string;
  recipient: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  externalId?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  outstanding?: number;
}

interface CustomerApiItem {
  id: string;
  name: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  contactPhone?: string;
  outstandingAmount?: number;
  totalOutstanding?: number;
}

export default function CommunicationsPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Compose State
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [composeChannel, setComposeChannel] = useState<"EMAIL" | "WHATSAPP" | "SMS">("EMAIL");
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeTemplateId, setComposeTemplateId] = useState<string>("payment-reminder");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load communications");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching messages");
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, searchTerm]);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const params = new URLSearchParams();
        if (channelFilter !== "ALL") params.set("channel", channelFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (searchTerm.trim()) params.set("search", searchTerm.trim());

        const res = await fetch(`/api/messages?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load communications");
        const data = await res.json();
        if (active) {
          setMessages(data.messages || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Error fetching messages");
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [channelFilter, statusFilter, searchTerm]);

  // Load customers for compose dropdown
  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        const res = await fetch("/api/customers?limit=100");
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setCustomers(
              (data.customers || []).map((c: CustomerApiItem) => ({
                id: c.id,
                name: c.name,
                email: c.email || c.contactEmail || null,
                phone: c.phone || c.contactPhone || null,
                outstanding: c.outstandingAmount || c.totalOutstanding || 0,
              }))
            );
          }
        }
      } catch {
        // Non-fatal
      }
    }
    loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const updateInterpolatedTemplate = (
    templateId: string,
    customer: CustomerOption | null
  ) => {
    const template =
      DEFAULT_TEMPLATES.find((t) => t.id === templateId) || DEFAULT_TEMPLATES[0];
    const customerName = customer ? customer.name : "Valued Customer";
    const amountStr = customer?.outstanding
      ? `₹${customer.outstanding.toLocaleString("en-IN")}`
      : "₹0";

    const vars: Record<string, string | number | null | undefined> = {
      customerName,
      contactName: customerName,
      invoiceNumber: "INV-CURRENT",
      amount: amountStr,
      outstandingAmount: amountStr,
      dueDate: "Due upon receipt",
      daysOverdue: 0,
      companyName: "DuesPilot Finance",
      promiseDate: "Agreed commitment date",
      paymentReference: "UTR Pending",
    };

    setComposeSubject(interpolateTemplate(template.subject, vars));
    setComposeBody(interpolateTemplate(template.body, vars));
  };

  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId) || null;
    setSelectedCustomer(cust);
    if (cust) {
      if (composeChannel === "EMAIL") {
        setComposeRecipient(cust.email || "");
      } else {
        setComposeRecipient(cust.phone || "");
      }
    }
    updateInterpolatedTemplate(composeTemplateId, cust);
  };

  const handleSelectChannel = (ch: "EMAIL" | "WHATSAPP" | "SMS") => {
    setComposeChannel(ch);
    if (selectedCustomer) {
      if (ch === "EMAIL") {
        setComposeRecipient(selectedCustomer.email || "");
      } else {
        setComposeRecipient(selectedCustomer.phone || "");
      }
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setComposeTemplateId(templateId);
    updateInterpolatedTemplate(templateId, selectedCustomer);
  };

  async function handleRetry(messageId: string) {
    try {
      setRetryingId(messageId);
      const res = await fetch(`/api/messages/${messageId}`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
      await fetchMessages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to retry sending");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) {
      setComposeError("Please select a recipient customer");
      return;
    }
    if (!composeRecipient.trim()) {
      setComposeError("Please specify a recipient email or phone number");
      return;
    }
    if (!composeBody.trim()) {
      setComposeError("Message body cannot be empty");
      return;
    }

    setComposeLoading(true);
    setComposeError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          channel: composeChannel,
          recipient: composeRecipient.trim(),
          subject: composeChannel === "EMAIL" ? composeSubject.trim() : null,
          body: composeBody.trim(),
          templateId: composeTemplateId,
          includePaymentLink,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to dispatch message");
      }

      setComposeSuccess(true);
      setTimeout(() => {
        setComposeSuccess(false);
        setIsComposeOpen(false);
        fetchMessages();
      }, 1200);
    } catch (err: unknown) {
      setComposeError(err instanceof Error ? err.message : "Failed to dispatch message");
    } finally {
      setComposeLoading(false);
    }
  }

  // Calculate Metrics
  const totalCount = messages.length;
  const emailCount = messages.filter((m) => m.channel === "EMAIL").length;
  const whatsappCount = messages.filter((m) => m.channel === "WHATSAPP").length;
  const smsCount = messages.filter((m) => m.channel === "SMS").length;
  const sentCount = messages.filter(
    (m) => m.status === "SENT" || m.status === "DELIVERED" || m.status === "READ"
  ).length;
  const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Communications & Outbox
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Multi-channel collection reminders, automated dunning logs, and direct customer outreach.
          </p>
        </div>
        <button
          onClick={() => {
            setComposeError(null);
            setComposeSuccess(false);
            updateInterpolatedTemplate(composeTemplateId, selectedCustomer);
            setIsComposeOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition focus:outline-hidden"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Compose Reminder</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Total Dispatched</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600">📧 Emails Sent</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{emailCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600">💬 WhatsApp</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{whatsappCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600">📱 SMS Sent</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{smsCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-gray-500">Delivery Rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{successRate}%</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Channel selector */}
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
            {(["ALL", "EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 rounded-md transition ${
                  channelFilter === ch
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {ch === "ALL"
                  ? "All Channels"
                  : ch === "EMAIL"
                  ? "📧 Email"
                  : ch === "WHATSAPP"
                  ? "💬 WhatsApp"
                  : "📱 SMS"}
              </button>
            ))}
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="READ">Read</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search recipient, body, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading communications history...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No communications found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              You haven&apos;t sent any reminders matching this filter. Click &quot;Compose Reminder&quot; or trigger a reminder from the Collection Queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Recipient / Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Subject & Message</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4">
                      {m.customerId ? (
                        <Link
                          href={`/dashboard/customers/${m.customerId}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition block"
                        >
                          {m.customerName || "Customer Record"}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900 block">
                          {m.customerName || "External Contact"}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 font-mono">{m.recipient}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          m.channel === "EMAIL"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : m.channel === "WHATSAPP"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {m.channel === "EMAIL"
                          ? "📧 Email"
                          : m.channel === "WHATSAPP"
                          ? "💬 WhatsApp"
                          : "📱 SMS"}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      {m.subject && <p className="font-medium text-gray-900 truncate">{m.subject}</p>}
                      <p className="text-gray-500 truncate text-[11px]">{m.body}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          m.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : m.status === "DELIVERED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : m.status === "READ"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {m.sentAt
                        ? new Date(m.sentAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : new Date(m.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedMessage(m)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition"
                      >
                        View
                      </button>
                      {m.status === "FAILED" && (
                        <button
                          onClick={() => handleRetry(m.id)}
                          disabled={retryingId === m.id}
                          className="text-xs font-medium text-amber-600 hover:text-amber-800 transition disabled:opacity-50"
                        >
                          {retryingId === m.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Message Details</h3>
                <p className="text-xs text-gray-500">ID: {selectedMessage.id}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Recipient</span>
                  <span className="text-gray-900 font-medium">{selectedMessage.recipient}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                    Channel / Status
                  </span>
                  <span className="text-gray-900 font-medium">
                    {selectedMessage.channel} · {selectedMessage.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                    External Dispatch ID
                  </span>
                  <span className="text-gray-900 font-mono text-[11px] truncate block">
                    {selectedMessage.externalId || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dispatched At</span>
                  <span className="text-gray-900 font-medium">
                    {selectedMessage.sentAt ? new Date(selectedMessage.sentAt).toLocaleString("en-IN") : "Pending"}
                  </span>
                </div>
              </div>

              {selectedMessage.subject && (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-1">Subject</span>
                  <p className="font-semibold text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {selectedMessage.subject}
                  </p>
                </div>
              )}

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-1">Content</span>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {selectedMessage.body}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Reminder Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Compose & Dispatch Reminder</h3>
                <p className="text-xs text-gray-500">
                  Send tailored collection communications with dynamic variables
                </p>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {composeSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Message Dispatched!</h4>
                <p className="text-xs text-gray-500">
                  Successfully logged to customer timeline and sent via {composeChannel}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-6 space-y-4">
                {composeError && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                    {composeError}
                  </div>
                )}

                {/* Recipient Customer */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Customer</label>
                  <select
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.outstanding ? `(₹${c.outstanding.toLocaleString("en-IN")} outstanding)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Channel Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleSelectChannel(ch)}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border transition text-center ${
                          composeChannel === ch
                            ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {ch === "EMAIL" ? "📧 Email" : ch === "WHATSAPP" ? "💬 WhatsApp" : "📱 SMS"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Field */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Recipient {composeChannel === "EMAIL" ? "Email Address" : "Phone Number"}
                  </label>
                  <input
                    type={composeChannel === "EMAIL" ? "email" : "tel"}
                    value={composeRecipient}
                    onChange={(e) => setComposeRecipient(e.target.value)}
                    placeholder={composeChannel === "EMAIL" ? "finance@customer.com" : "+91 98765 43210"}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Template Preset</label>
                  <select
                    value={composeTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    {DEFAULT_TEMPLATES.map((tpl: TemplateDefinition) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Subject */}
                {composeChannel === "EMAIL" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                      required
                    />
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Message Body</label>
                  <textarea
                    rows={6}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-xs font-mono text-gray-800 focus:border-blue-500 focus:outline-hidden resize-none leading-relaxed"
                    required
                  />
                </div>

                {/* Payment Link Option */}
                <div className="flex items-center gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <input
                    type="checkbox"
                    id="includePaymentLinkCompose"
                    checked={includePaymentLink}
                    onChange={(e) => setIncludePaymentLink(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="includePaymentLinkCompose" className="text-xs text-gray-700 font-medium cursor-pointer">
                    Include dynamic UPI / Razorpay payment link & QR data in message
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    disabled={composeLoading}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={composeLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {composeLoading ? "Dispatching..." : "Send Reminder"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
