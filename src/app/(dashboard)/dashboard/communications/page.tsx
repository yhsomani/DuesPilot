"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DEFAULT_TEMPLATES, interpolateTemplate, type TemplateDefinition } from "@/lib/templates";
import {
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Communications & Dispatch Outbox
            </h1>
            <Badge variant="blue" size="sm">
              {totalCount} Messages
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Multi-channel outreach hub: Email, WhatsApp Business, SMS dunning dispatches, and delivery status logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMessages()}
            className="gap-1.5 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setComposeError(null);
              setComposeSuccess(false);
              updateInterpolatedTemplate(composeTemplateId, selectedCustomer);
              setIsComposeOpen(true);
            }}
            className="gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Compose Reminder</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard
          title="Total Dispatched"
          value={totalCount.toString()}
          subtitle="All dunning channels"
          icon={Send}
          variant="default"
        />
        <StatCard
          title="Email Reminders"
          value={emailCount.toString()}
          subtitle="Transactional SMTP"
          icon={Mail}
          variant="blue"
        />
        <StatCard
          title="WhatsApp Sent"
          value={whatsappCount.toString()}
          subtitle="Gupshup / Twilio"
          icon={MessageSquare}
          variant="success"
        />
        <StatCard
          title="SMS Dispatched"
          value={smsCount.toString()}
          subtitle="DLT compliant SMS"
          icon={Smartphone}
          variant="warning"
        />
        <StatCard
          title="Delivery Success"
          value={`${successRate}%`}
          subtitle="Delivered / Read"
          icon={CheckCircle2}
          variant={successRate >= 90 ? "success" : "warning"}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Failed to load communications history</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Channel selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["ALL", "EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  channelFilter === ch
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search recipient, body, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading communications history…</div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No communications found"
            description="You haven't sent any reminders matching this filter. Click 'Compose Reminder' or trigger a reminder from the Collection Queue."
            className="py-12 border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Recipient / Account</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Channel</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Subject & Message Preview</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Dispatched</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => {
                  const isDelivered = m.status === "DELIVERED" || m.status === "READ";
                  const isSent = m.status === "SENT";
                  const isFailed = m.status === "FAILED";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        {m.customerId ? (
                          <Link
                            href={`/dashboard/customers/${m.customerId}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                          >
                            {m.customerName || "Customer Account"}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-900 block">
                            {m.customerName || "External Recipient"}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono">{m.recipient}</span>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            m.channel === "WHATSAPP"
                              ? "success"
                              : m.channel === "EMAIL"
                              ? "blue"
                              : "warning"
                          }
                          size="sm"
                        >
                          {m.channel === "EMAIL"
                            ? "📧 Email"
                            : m.channel === "WHATSAPP"
                            ? "💬 WhatsApp"
                            : "📱 SMS"}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 max-w-md">
                        {m.subject && (
                          <p className="font-bold text-slate-900 truncate mb-0.5">{m.subject}</p>
                        )}
                        <p className="text-slate-500 truncate text-[11px] font-mono leading-relaxed">
                          {m.body}
                        </p>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            isDelivered ? "success" : isSent ? "blue" : isFailed ? "danger" : "default"
                          }
                          size="sm"
                        >
                          {m.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                        {m.sentAt
                          ? new Date(m.sentAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : new Date(m.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      </td>

                      <td className="px-6 py-3.5 text-right whitespace-nowrap space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMessage(m)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Inspect
                        </Button>
                        {m.status === "FAILED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(m.id)}
                            disabled={retryingId === m.id}
                            className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            {retryingId === m.id ? "Retrying…" : "Retry"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Message Detail Modal */}
      {selectedMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-msg-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0">
              <div>
                <h3 id="view-msg-title" className="text-sm font-bold text-slate-900">
                  Message Dispatch Audit
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: {selectedMessage.id}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Recipient</span>
                  <span className="text-slate-900 font-semibold font-mono">{selectedMessage.recipient}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Channel / Status
                  </span>
                  <span className="text-slate-900 font-semibold">
                    {selectedMessage.channel} · {selectedMessage.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Gateway Dispatch Ref
                  </span>
                  <span className="text-slate-900 font-mono text-[11px] truncate block">
                    {selectedMessage.externalId || "N/A (Simulated Dispatch)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dispatched At</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedMessage.sentAt
                      ? new Date(selectedMessage.sentAt).toLocaleString("en-IN")
                      : "Pending"}
                  </span>
                </div>
              </div>

              {selectedMessage.subject && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Subject</span>
                  <p className="font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {selectedMessage.subject}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Message Content</span>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto text-[11px]">
                  {selectedMessage.body}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 shrink-0">
              <Button size="sm" onClick={() => setSelectedMessage(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Reminder Modal */}
      {isComposeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0">
              <div>
                <h3 id="compose-modal-title" className="text-sm font-bold text-slate-900">
                  Compose & Dispatch Collection Reminder
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send tailored dunning messages with dynamic debt variables & payment links
                </p>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {composeSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Reminder Dispatched!</h4>
                <p className="text-xs text-slate-500">
                  Successfully logged to customer audit timeline and dispatched via {composeChannel}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-6 space-y-4 overflow-y-auto flex-1">
                {composeError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{composeError}</span>
                  </div>
                )}

                {/* Recipient Customer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Account *</label>
                  <select
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
                    required
                  >
                    <option value="">Select debtor account…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.outstanding ? `(₹${c.outstanding.toLocaleString("en-IN")} open)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Channel Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dispatch Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleSelectChannel(ch)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                          composeChannel === ch
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs font-bold"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {ch === "EMAIL" ? "📧 Email" : ch === "WHATSAPP" ? "💬 WhatsApp" : "📱 SMS"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient {composeChannel === "EMAIL" ? "Email Address" : "Phone Number"} *
                  </label>
                  <input
                    type={composeChannel === "EMAIL" ? "email" : "tel"}
                    value={composeRecipient}
                    onChange={(e) => setComposeRecipient(e.target.value)}
                    placeholder={composeChannel === "EMAIL" ? "finance@customer.com" : "+91 98765 43210"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Template Preset</label>
                  <select
                    value={composeTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject *</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
                      required
                    />
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message Body *</label>
                  <textarea
                    rows={5}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed bg-slate-50/50 focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Payment Link Option */}
                <div className="flex items-center gap-2.5 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                  <input
                    type="checkbox"
                    id="includePaymentLinkCompose"
                    checked={includePaymentLink}
                    onChange={(e) => setIncludePaymentLink(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="includePaymentLinkCompose" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    Include dynamic UPI / Razorpay payment link & QR data in message
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsComposeOpen(false)}
                    disabled={composeLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={composeLoading}
                    disabled={composeLoading}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Reminder</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
