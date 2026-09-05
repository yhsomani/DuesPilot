"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { InvoiceDetail } from "@/lib/types";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowLeft,
  Send,
  Scale,
  Calendar,
  Receipt,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { SendReminderModal } from "@/components/queue/send-reminder-modal";
import { LegalNoticeModal } from "@/components/legal/legal-notice-modal";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Modals state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isLegalNoticeOpen, setIsLegalNoticeOpen] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<InvoiceDetail>(`/api/invoices/${id}`);
        if (active) setInvoice(data);
      } catch (e) {
        if (!active) return;
        if (e instanceof Response) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Failed to load invoice");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, retryKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Invoice not found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested invoice record could not be found or has been removed from this workspace.
        </p>
        <Link href="/dashboard/invoices">
          <Button variant="outline" size="sm" className="mt-2">
            Return to Invoices Register
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-xs text-rose-800 space-y-3"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Failed to load invoice</span>
        </div>
        <p>{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRetryKey((n) => n + 1)}
          className="bg-white text-rose-900 border-rose-300 hover:bg-rose-100"
        >
          Try Reloading
        </Button>
      </div>
    );
  }

  if (!invoice) return null;

  const displayStatus = (s: string) => {
    if (s === "PAID" || s === "CANCELLED") return { label: "Settled / Paid", variant: "success" as const };
    if (s === "DISPUTED") return { label: "Disputed", variant: "purple" as const };
    if (s === "PARTIALLY_PAID") return { label: "Partially Paid", variant: "blue" as const };
    if (s === "PROMISED" || s === "PROMISE_BROKEN")
      return { label: s === "PROMISE_BROKEN" ? "Broken Promise" : "Payment Promised", variant: "warning" as const };
    if (invoice.outstanding > 0 && new Date(invoice.dueDate).getTime() < now) {
      const days = Math.floor((now - new Date(invoice.dueDate).getTime()) / 86_400_000);
      return { label: `${days}d Overdue`, variant: "danger" as const };
    }
    return { label: "Current / Open", variant: "blue" as const };
  };

  const statusInfo = displayStatus(invoice.status);

  const typeIcons: Record<string, { icon: typeof CreditCard; color: string }> = {
    payment: { icon: CreditCard, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    event: { icon: MessageSquare, color: "bg-blue-50 text-blue-600 border-blue-100" },
    promise: { icon: CheckCircle2, color: "bg-amber-50 text-amber-600 border-amber-100" },
    dispute: { icon: AlertTriangle, color: "bg-purple-50 text-purple-600 border-purple-100" },
  };

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Invoices Register</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
              Invoice #{invoice.number}
            </h1>
            <Badge variant={statusInfo.variant} size="sm">
              {statusInfo.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Account:{" "}
            <Link
              href={`/dashboard/customers/${invoice.customerId}`}
              className="font-bold text-blue-600 hover:underline"
            >
              {invoice.customerName}
            </Link>{" "}
            · Invoiced on{" "}
            {new Date(invoice.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Quick Action Dispatchers */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLegalNoticeOpen(true)}
            className="gap-1.5 shadow-2xs"
          >
            <Scale className="h-3.5 w-3.5 text-slate-500" />
            <span>Legal Notice</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsReminderOpen(true)}
            className="gap-1.5 shadow-2xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send Reminder</span>
          </Button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Bill Amount"
          value={formatINR(invoice.amount)}
          subtitle="Invoice face value including taxes"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatINR(invoice.outstanding)}
          subtitle={
            invoice.outstanding === 0
              ? "Fully settled invoice"
              : `Unpaid principal receivable`
          }
          icon={Receipt}
          variant={invoice.outstanding > 0 ? "danger" : "success"}
        />
        <StatCard
          title="Due Date"
          value={new Date(invoice.dueDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          subtitle={
            new Date(invoice.dueDate).getTime() < now
              ? "Payment terms elapsed"
              : "Active payment window"
          }
          icon={Calendar}
          variant="blue"
        />
      </div>

      {/* Notes / Reference */}
      {invoice.notes && (
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs text-slate-700 space-y-1">
          <p className="font-bold text-slate-900">Purchase Order / Terms Reference</p>
          <p className="leading-relaxed">{invoice.notes}</p>
        </div>
      )}

      {/* Line Items Table */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Line Items & Billing Breakdown</h2>
              <p className="text-xs text-slate-500">Itemized services, deliverables, and GST tax components</p>
            </div>
            <Badge variant="blue" size="sm">
              {invoice.items.length} Items
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Item Description</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Tax Rate</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{it.description}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-600">{it.quantity ?? "1"}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                      {it.unitPrice != null ? formatINR(it.unitPrice) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                      {it.taxRate != null ? `${it.taxRate}%` : "0%"}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Allocations Table */}
      {invoice.allocations && invoice.allocations.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Payment Receipts & Allocations</h2>
              <p className="text-xs text-slate-500">Progressive settlement credits applied toward this invoice</p>
            </div>
            <Badge variant="success" size="sm">
              {invoice.allocations.length} Allocations
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Receipt Date</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">UTR / Reference</th>
                  <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-right font-bold uppercase tracking-wider">Allocated Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.allocations.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-slate-700">
                      {new Date(a.paymentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">
                      {a.paymentRef ?? "Direct Settlement"}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{a.mode ?? "Bank Transfer"}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-600">
                      {formatINR(a.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Activity Timeline */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 text-sm">Invoice Audit & Collection Trail</h2>
          <p className="text-xs text-slate-500">Chronological history of dunning dispatches, dispute logs, and payments</p>
        </div>

        {invoice.timeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No activity or collection events logged for this invoice yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoice.timeline.map((ev) => {
              const iconConfig = typeIcons[ev.type] || {
                icon: FileText,
                color: "bg-slate-50 text-slate-600 border-slate-100",
              };
              const Icon = iconConfig.icon;
              return (
                <div key={`${ev.type}-${ev.id}`} className="px-6 py-3.5 flex items-start gap-3.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border shrink-0 ${iconConfig.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900">{ev.summary}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(ev.date).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {ev.detail && ` · ${ev.detail}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <SendReminderModal
        customerId={invoice.customerId}
        customerName={invoice.customerName}
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        amount={invoice.amount}
        outstandingAmount={invoice.outstanding}
        dueDate={invoice.dueDate}
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        onSuccess={() => setRetryKey((n) => n + 1)}
      />

      {/* Legal Notice Modal */}
      <LegalNoticeModal
        customerId={invoice.customerId}
        customerName={invoice.customerName}
        isOpen={isLegalNoticeOpen}
        onClose={() => setIsLegalNoticeOpen(false)}
      />
    </div>
  );
}
