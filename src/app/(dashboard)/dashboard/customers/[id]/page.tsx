"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api, apiPost, apiPatch, apiDel, ApiError } from "@/lib/api";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";
import { LegalNoticeModal } from "@/components/legal/legal-notice-modal";
import { PaymentPlanModal } from "@/components/promises/payment-plan-modal";
import { AICopilotModal } from "@/components/copilot/ai-copilot-modal";
import type {
  CustomerContact,
  CustomerDetailData,
  CustomerInvoice,
  CustomerTimelineEvent,
} from "@/lib/types";
import {
  Building2,
  Phone,
  Mail,
  Calendar,
  Clock,
  Send,
  Scale,
  CreditCard,
  Edit3,
  Plus,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  X,
  MessageSquare,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

function TimelineIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  if (normalized.includes("promise") || normalized.includes("commitment")) {
    return (
      <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
        <Clock className="h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }
  if (normalized.includes("message") || normalized.includes("communication") || normalized.includes("whatsapp")) {
    return (
      <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
        <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }
  if (normalized.includes("call")) {
    return (
      <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
        <PhoneCall className="h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }
  if (normalized.includes("payment")) {
    return (
      <div className="h-8 w-8 rounded-xl bg-green-100 text-green-700 border border-green-200 flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-xl bg-gray-100 text-gray-600 border border-gray-200 flex items-center justify-center shrink-0">
      <FileText className="h-4 w-4" strokeWidth={1.5} />
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
  const [isLegalNoticeOpen, setIsLegalNoticeOpen] = useState(false);
  const [isPaymentPlanOpen, setIsPaymentPlanOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

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
          setError(e instanceof Error ? e.message : "Failed to load customer profile");
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
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
          <AlertCircle className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Customer Account Not Found</h1>
        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
          The requested debtor profile may have been removed, merged into another account, or is outside your organization.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/customers">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              <span>Back to Debtor Directory</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3 shadow-xs"
      >
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="font-bold">Failed to load customer profile</p>
          <p className="mt-0.5 text-red-700">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-2 text-xs font-semibold text-red-900 underline hover:text-red-950"
          >
            Try reloading
          </button>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const isHighRisk = customer.riskScore > 70;
  const isMedRisk = customer.riskScore > 40;

  return (
    <div className="space-y-6">
      {/* Top Header with Breadcrumbs and Quick Action Hub */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/dashboard/customers" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Debtor Directory</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold truncate">{customer.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-base shrink-0 border ${
                isHighRisk
                  ? "bg-red-100 text-red-700 border-red-200"
                  : isMedRisk
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-green-100 text-green-700 border-green-200"
              }`}
            >
              {customer.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{customer.name}</h1>
                <Badge
                  variant={isHighRisk ? "danger" : isMedRisk ? "warning" : "success"}
                  size="sm"
                >
                  Risk Score: {customer.riskScore}/100
                </Badge>
                <Badge variant={customer.status === "active" ? "blue" : "neutral"} size="sm">
                  {customer.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                    {customer.phone}
                  </span>
                )}
                {customer.gstin && (
                  <span className="font-mono text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded text-[11px] border border-gray-200">
                    GSTIN: {customer.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsCopilotOpen(true)}
              className="gap-1.5 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />
              <span>AI Copilot</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setInvoiceForReminder(null);
                setIsReminderOpen(true);
              }}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
              <span>Send Reminder</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsPaymentPlanOpen(true)}
              className="gap-1.5 border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100"
            >
              <Calendar className="h-4 w-4 text-purple-600" strokeWidth={1.5} />
              <span>Payment Plan</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsLegalNoticeOpen(true)}
              className="gap-1.5 border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
            >
              <Scale className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
              <span>Legal Notice</span>
            </Button>

            <EditCustomerModal
              customerId={customer.id}
              customer={customer}
              onChange={() => load()}
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowActions(true)}
              className="gap-1.5"
            >
              <CreditCard className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
              <span>Record Activity</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outstanding"
          value={formatINR(customer.totalOutstanding)}
          subtitle="Cumulative ledger dues"
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Overdue Balance"
          value={formatINR(customer.totalOverdue)}
          subtitle="Past agreed credit terms"
          icon={Clock}
          variant="danger"
        />
        <StatCard
          title="Invoices Active"
          value={`${customer.invoices.length} Bills`}
          subtitle="Open billing line items"
          icon={FileText}
          variant="warning"
        />
        <StatCard
          title="Delinquency Risk"
          value={`${customer.riskScore}/100`}
          subtitle={isHighRisk ? "High priority collection" : "Moderate collection risk"}
          icon={ShieldAlert}
          variant="purple"
        />
      </div>

      {/* Main Content Layout: Invoices & Timeline vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Invoices & Collection Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoices Table Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Open Receivables &amp; Invoices
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {customer.invoices.length} billing document{customer.invoices.length === 1 ? "" : "s"} on file
                </p>
              </div>
              <Link href="/dashboard/invoices">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                  <span>View All Invoices</span>
                  <ChevronRight className="h-4 w-4 ml-0.5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>

            {customer.invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices for this customer"
                description="Import an invoice CSV or create a new invoice to start tracking payments."
                className="py-10 border-0"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Invoice</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right">Outstanding</th>
                      <th className="px-5 py-3 text-left">Due Date</th>
                      <th className="px-5 py-3 text-center">Aging Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customer.invoices.map((inv: CustomerInvoice) => {
                      const isInvOverdue = inv.daysOverdue > 0;
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-gray-900 font-mono">
                            <Link href={`/dashboard/invoices/${inv.id}`} className="hover:text-blue-600 transition-colors">
                              {inv.number}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-700 font-semibold">
                            {formatINR(inv.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-red-600">
                            {formatINR(inv.outstanding)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">
                            {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge
                              variant={inv.daysOverdue > 30 ? "danger" : inv.daysOverdue > 0 ? "warning" : "success"}
                              size="sm"
                            >
                              {isInvOverdue ? `${inv.daysOverdue}d overdue` : "Current"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setInvoiceForReminder(inv);
                                setIsReminderOpen(true);
                              }}
                              className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50/60 font-semibold"
                            >
                              <Send className="h-3.5 w-3.5 mr-1 text-blue-600" strokeWidth={1.5} />
                              <span>Remind</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Collection Timeline Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Collection Activity &amp; Audit Trail
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Chronological log of phone calls, messages, promises, and payments
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowActions(true)}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Log Event</span>
              </Button>
            </div>

            <div className="p-6">
              {customer.timeline.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No collection activity recorded yet"
                  description="Use the quick action buttons to log phone calls, WhatsApp reminders, or payment promises."
                  className="py-8 border-0"
                />
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {customer.timeline.map((event: CustomerTimelineEvent, i) => (
                    <div key={event.id ?? i} className="relative flex items-start gap-3.5 group">
                      <div className="absolute -left-6 top-0">
                        <TimelineIcon type={event.type} />
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 hover:border-gray-300 hover:bg-gray-50 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900">{event.text}</p>
                          {event.status === "broken" && (
                            <Badge variant="danger" size="sm">
                              Broken Commitment
                            </Badge>
                          )}
                          {event.status === "kept" && (
                            <Badge variant="success" size="sm">
                              Promise Kept
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                          <span>
                            {new Date(event.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Debtor Summary, Contacts & Notes */}
        <div className="space-y-6">
          {/* Debtor Profile Summary Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3">
              Account Overview
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Total Outstanding</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {formatINR(customer.totalOutstanding)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Total Overdue</span>
                <span className="font-mono font-bold text-red-600">
                  {formatINR(customer.totalOverdue)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Delinquency Risk</span>
                <Badge
                  variant={isHighRisk ? "danger" : isMedRisk ? "warning" : "success"}
                  size="sm"
                >
                  {customer.riskScore}/100
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Account Status</span>
                <span className="font-bold text-gray-900 capitalize">{customer.status}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">GSTIN</span>
                <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  {customer.gstin ?? "Not Provided"}
                </span>
              </div>
            </div>
          </div>

          {/* Contacts Manager Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Key Decision Makers ({customer.contacts.length})
              </h3>
              <ContactEditor
                customerId={customer.id}
                contacts={customer.contacts}
                onChange={() => load()}
              />
            </div>

            {customer.contacts.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                No individual contact persons added yet. Click &ldquo;Manage&rdquo; to add accounts managers or promoters.
              </p>
            ) : (
              <div className="space-y-3">
                {customer.contacts.map((contact: CustomerContact, i) => (
                  <div
                    key={contact.id ?? i}
                    className="rounded-lg border border-gray-200 bg-gray-50/70 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900">{contact.name}</p>
                      {contact.isPrimary && (
                        <Badge variant="blue" size="sm">
                          PRIMARY
                        </Badge>
                      )}
                    </div>
                    {contact.designation && (
                      <p className="text-xs text-gray-500 font-medium">{contact.designation}</p>
                    )}
                    <div className="pt-1 text-xs text-gray-600 space-y-0.5">
                      {contact.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                          <span>{contact.phone}</span>
                        </p>
                      )}
                      {contact.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                          <span>{contact.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Internal Ledger Notes
            </h3>
            <p className="text-xs text-gray-700 bg-gray-50/90 rounded-lg p-3.5 border border-gray-200 leading-relaxed font-medium">
              {customer.notes || "No internal remarks recorded for this customer account."}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Modal */}
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

      {/* Send Reminder Modal */}
      {isReminderOpen && customer && (
        <SendReminderModal
          customerId={customer.id}
          customerName={customer.name}
          amount={invoiceForReminder ? invoiceForReminder.amount : customer.totalOutstanding}
          outstandingAmount={invoiceForReminder ? invoiceForReminder.outstanding : customer.totalOutstanding}
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

      {/* Payment Plan Modal */}
      {isPaymentPlanOpen && customer && (
        <PaymentPlanModal
          customerId={customer.id}
          customerName={customer.name}
          defaultAmount={customer.totalOutstanding > 0 ? customer.totalOutstanding : 50000}
          onClose={() => setIsPaymentPlanOpen(false)}
          onSuccess={async () => {
            setIsPaymentPlanOpen(false);
            await load();
          }}
        />
      )}

      {/* Legal Notice Modal */}
      {isLegalNoticeOpen && customer && (
        <LegalNoticeModal
          customerId={customer.id}
          customerName={customer.name}
          customerGstin={customer.gstin}
          customerEmail={customer.email}
          customerPhone={customer.phone}
          defaultPrincipal={customer.totalOutstanding}
          isOpen={true}
          onClose={() => setIsLegalNoticeOpen(false)}
          onSuccess={async () => {
            setIsLegalNoticeOpen(false);
            await load();
          }}
        />
      )}

      {/* AI Copilot Modal */}
      {isCopilotOpen && customer && (
        <AICopilotModal
          isOpen={true}
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setIsCopilotOpen(false)}
          onPromiseExtracted={async (promise) => {
            try {
              await apiPost("/api/promises", {
                customerId: customer.id,
                amount: promise.amount,
                promiseDate: promise.promiseDate,
                notes: promise.notes,
              });
              await load();
            } catch (err) {
              console.error("Failed to record promise", err);
            }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-action-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 id="quick-action-title" className="font-bold text-gray-900 text-base">{customerName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Record collection interaction or settlement</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex border-b border-gray-200 bg-white">
          {(["payment", "promise", "event"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/40"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t === "payment" ? "Record Payment" : t === "promise" ? "Log Promise" : "Log Activity"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3.5">
          {tab === "payment" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-mono shadow-xs"
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  >
                    <option value="">Select mode…</option>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reference / UTR Number
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  placeholder="e.g. UTR12345678"
                />
              </div>
              <Button
                onClick={recordPayment}
                disabled={saving || !amount || Number(amount) <= 0}
                loading={saving}
                className="w-full mt-2"
              >
                Record Payment Settlement
              </Button>
            </>
          )}

          {tab === "promise" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Promised Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={promiseAmount}
                  onChange={(e) => setPromiseAmount(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-mono shadow-xs"
                  placeholder="e.g. 75000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Commitment Deadline Date *
                </label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>
              <Button
                onClick={logPromise}
                disabled={saving || !promiseAmount || Number(promiseAmount) <= 0}
                loading={saving}
                className="w-full mt-2"
              >
                Log Payment Commitment
              </Button>
            </>
          )}

          {tab === "event" && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Interaction Channel
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="EMAIL">Email Outreach</option>
                  <option value="WHATSAPP">WhatsApp Notice</option>
                  <option value="MEETING">In-Person Meeting</option>
                  <option value="NOTE">Internal Remark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Activity Notes &amp; Outcome
                </label>
                <textarea
                  rows={3}
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none transition-all shadow-xs"
                  placeholder="Record summary of call, disputed line items, or customer response…"
                />
              </div>
              <Button
                onClick={logEvent}
                disabled={saving}
                loading={saving}
                className="w-full mt-2"
              >
                Log Activity Record
              </Button>
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
      <Button
        variant="secondary"
        size="sm"
        onClick={openModal}
        className="gap-1.5"
      >
        <Edit3 className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.5} />
        <span>Edit</span>
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-base">Edit Debtor Details</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-mono font-medium uppercase text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={save}
                  loading={saving}
                  disabled={name.trim().length < 2}
                  className="gap-1.5"
                >
                  <span>Save Changes</span>
                </Button>
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
      setError(e instanceof ApiError ? e.message : "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contactId: string) => {
    if (!window.confirm("Remove this contact person?")) return;
    try {
      await apiDel(`/api/customers/${customerId}/contacts/${contactId}`);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete contact");
    }
  };

  const makePrimary = async (contactId: string) => {
    try {
      await apiPatch(`/api/customers/${customerId}/contacts/${contactId}`, {
        isPrimary: true,
      });
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update primary contact");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-700"
      >
        <span>Manage</span>
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Customer Contact Directory</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage decision makers, promoters, and accounts payable staff</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No contact persons registered yet.</p>
                ) : (
                  contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{c.name}</p>
                          {c.isPrimary && (
                            <Badge variant="blue" size="sm">
                              PRIMARY
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.designation && <span>{c.designation} · </span>}
                          {c.phone && <span>{c.phone} · </span>}
                          {c.email && <span>{c.email}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!c.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => makePrimary(c.id)}
                            className="h-7 px-2 text-xs text-blue-600"
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(c.id)}
                          className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Add New Contact</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact Full Name *"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                  />
                </div>
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Designation (e.g. CFO, Managing Director)"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all shadow-xs"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Designate as primary collection contact</span>
                </label>
                <Button
                  onClick={create}
                  disabled={saving || name.trim().length < 2}
                  loading={saving}
                  className="w-full gap-1.5"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Add Contact Person</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
