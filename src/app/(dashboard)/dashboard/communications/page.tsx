"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DEFAULT_TEMPLATES, interpolateTemplate, type TemplateDefinition } from "@/lib/templates";
import { api, apiPost } from "@/lib/api";
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
import { StatCardSkeleton } from "@/components/ui/skeleton";
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (channelFilter !== "ALL") params.set("channel", channelFilter);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        const qs = params.toString();

        const url = `/api/messages${qs ? `?${qs}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        const data = json?.data ?? json;
        const rawList: Record<string, unknown>[] = Array.isArray(data)
          ? data
          : (data?.messages as Record<string, unknown>[]) ||
            (data?.items as Record<string, unknown>[]) ||
            (data?.data as Record<string, unknown>[]) ||
            [];
        const list: MessageItem[] = rawList.map((m) => ({
          id: String(m.id || ""),
          customerId: (m.customerId as string) || null,
          customerName: (m.customerName as string) || (m.customer as string) || null,
          invoiceId: (m.invoiceId as string) || null,
          channel: (m.channel as MessageItem["channel"]) || "EMAIL",
          direction: (m.direction as string) || "OUTBOUND",
          subject: (m.subject as string) || null,
          body: (m.body as string) || "",
          recipient: (m.recipient as string) || "",
          status: (m.status as MessageItem["status"]) || "SENT",
          externalId: (m.externalId as string) || null,
          sentAt: (m.sentAt as string) || null,
          createdAt: (m.createdAt as string) || (m.sentAt as string) || new Date().toISOString(),
        }));
        if (!cancelled) {
          setMessages(list);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error fetching messages");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelFilter, statusFilter, searchTerm, refreshKey]);

  // Load customers for compose dropdown
  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        const data = await api<Record<string, unknown>>("/api/customers?limit=100");
        const list = Array.isArray(data)
          ? data
          : (data?.customers as CustomerApiItem[]) ||
            (data?.items as CustomerApiItem[]) ||
            (data?.data as CustomerApiItem[]) ||
            [];
        if (active) {
          setCustomers(
            list.map((c: CustomerApiItem) => ({
              id: c.id,
              name: c.name,
              email: c.email || c.contactEmail || null,
              phone: c.phone || c.contactPhone || null,
              outstanding: c.outstandingAmount || c.totalOutstanding || 0,
            }))
          );
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
      await apiPost(`/api/messages/${messageId}`, {});
      setRefreshKey((k) => k + 1);
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
      await apiPost("/api/messages", {
        customerId: selectedCustomer.id,
        channel: composeChannel,
        recipient: composeRecipient.trim(),
        subject: composeChannel === "EMAIL" ? composeSubject.trim() : null,
        body: composeBody.trim(),
        templateId: composeTemplateId,
        includePaymentLink,
      });

      setComposeSuccess(true);
      setTimeout(() => {
        setComposeSuccess(false);
        setIsComposeOpen(false);
        setRefreshKey((k) => k + 1);
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
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Communications & Dispatch Outbox
            </h1>
            <Badge variant="blue" size="sm">
              {totalCount} Messages
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Multi-channel outreach hub: Email, WhatsApp Business, SMS dunning dispatches, and delivery status logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
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
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Compose Reminder</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard
            title="Total Dispatched"
            value={totalCount.toString()}
            subtitle="All dunning channels"
            icon={Send}
            variant="neutral"
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
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-bold">Failed to load communications history</p>
            <p className="mt-0.5 text-red-700">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Channel selector */}
              <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-semibold">
                {(["ALL", "EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${
                      channelFilter === ch
                        ? "bg-white text-gray-900 shadow-xs font-bold"
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
                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search recipient, body, customer…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 pl-9 pr-8 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 bg-white placeholder-gray-400 transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* Messages Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {messages.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No communications found"
                description="You haven't sent any reminders matching this filter. Click 'Compose Reminder' or trigger a reminder from the Collection Queue."
                className="py-12 border-0"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600">
                      <th className="px-6 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Recipient / Account</th>
                      <th className="px-6 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Channel</th>
                      <th className="px-6 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Subject & Message Preview</th>
                      <th className="px-6 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-left font-bold text-xs uppercase tracking-wider">Dispatched</th>
                      <th className="px-6 py-3.5 text-right font-bold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {messages.map((m) => {
                      const isDelivered = m.status === "DELIVERED" || m.status === "READ";
                      const isSent = m.status === "SENT";
                      const isFailed = m.status === "FAILED";

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4">
                            {m.customerId ? (
                              <Link
                                href={`/dashboard/customers/${m.customerId}`}
                                className="font-bold text-gray-900 hover:text-blue-600 transition-colors block text-sm"
                              >
                                {m.customerName || "Customer Account"}
                              </Link>
                            ) : (
                              <span className="font-bold text-gray-900 block text-sm">
                                {m.customerName || "External Recipient"}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 font-mono">{m.recipient}</span>
                          </td>

                          <td className="px-6 py-4">
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

                          <td className="px-6 py-4 max-w-md">
                            {m.subject && (
                              <p className="font-bold text-gray-900 truncate mb-0.5 text-sm">{m.subject}</p>
                            )}
                            <p className="text-gray-500 truncate text-xs font-mono leading-relaxed">
                              {m.body}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                isDelivered ? "success" : isSent ? "blue" : isFailed ? "danger" : "neutral"
                              }
                              size="sm"
                            >
                              {m.status}
                            </Badge>
                          </td>

                          <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
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

                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMessage(m)}
                              className="h-8 text-xs text-blue-600 hover:text-blue-800"
                            >
                              Inspect
                            </Button>
                            {m.status === "FAILED" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRetry(m.id)}
                                disabled={retryingId === m.id}
                                className="h-8 text-xs text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
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
        </>
      )}

      {/* View Message Detail Modal */}
      {selectedMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-msg-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 shrink-0">
              <div>
                <h3 id="view-msg-title" className="text-base font-bold text-gray-900">
                  Message Dispatch Audit
                </h3>
                <p className="text-xs text-gray-500 font-mono">ID: {selectedMessage.id}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider">Recipient</span>
                  <span className="text-gray-900 font-semibold font-mono text-xs">{selectedMessage.recipient}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider">
                    Channel / Status
                  </span>
                  <span className="text-gray-900 font-semibold text-xs">
                    {selectedMessage.channel} · {selectedMessage.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider">
                    Gateway Dispatch Ref
                  </span>
                  <span className="text-gray-900 font-mono text-xs truncate block">
                    {selectedMessage.externalId || "N/A (Simulated Dispatch)"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider">Dispatched At</span>
                  <span className="text-gray-900 font-semibold text-xs">
                    {selectedMessage.sentAt
                      ? new Date(selectedMessage.sentAt).toLocaleString("en-IN")
                      : "Pending"}
                  </span>
                </div>
              </div>

              {selectedMessage.subject && (
                <div>
                  <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider mb-1">Subject</span>
                  <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                    {selectedMessage.subject}
                  </p>
                </div>
              )}

              <div>
                <span className="text-gray-500 block text-xs uppercase font-bold tracking-wider mb-1">Message Content</span>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto text-xs">
                  {selectedMessage.body}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 border-t border-gray-200 shrink-0">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 shrink-0">
              <div>
                <h3 id="compose-modal-title" className="text-base font-bold text-gray-900">
                  Compose & Dispatch Collection Reminder
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Send tailored dunning messages with dynamic debt variables & payment links
                </p>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {composeSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h4 className="text-base font-bold text-gray-900">Reminder Dispatched!</h4>
                <p className="text-sm text-gray-600">
                  Successfully logged to customer audit timeline and dispatched via {composeChannel}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-6 space-y-4 overflow-y-auto flex-1">
                {composeError && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
                    <span>{composeError}</span>
                  </div>
                )}

                {/* Recipient Customer */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Account *</label>
                  <select
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 bg-white transition-all"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Dispatch Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleSelectChannel(ch)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                          composeChannel === ch
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs font-bold"
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Recipient {composeChannel === "EMAIL" ? "Email Address" : "Phone Number"} *
                  </label>
                  <input
                    type={composeChannel === "EMAIL" ? "email" : "tel"}
                    value={composeRecipient}
                    onChange={(e) => setComposeRecipient(e.target.value)}
                    placeholder={composeChannel === "EMAIL" ? "finance@customer.com" : "+91 98765 43210"}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 bg-white transition-all"
                    required
                  />
                </div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Template Preset</label>
                  <select
                    value={composeTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 bg-white transition-all"
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
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Subject *</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 bg-white transition-all"
                      required
                    />
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Message Body *</label>
                  <textarea
                    rows={5}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-xs font-mono text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none leading-relaxed bg-white transition-all"
                    required
                  />
                </div>

                {/* Payment Link Option */}
                <div className="flex items-center gap-2.5 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                  <input
                    type="checkbox"
                    id="includePaymentLinkCompose"
                    checked={includePaymentLink}
                    onChange={(e) => setIncludePaymentLink(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="includePaymentLinkCompose" className="text-xs text-gray-800 font-semibold cursor-pointer">
                    Include dynamic UPI / Razorpay payment link & QR data in message
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="secondary"
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
                    <Send className="h-4 w-4" strokeWidth={1.5} />
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
