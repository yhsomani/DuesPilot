"use client";

import { useState, useMemo, useEffect } from "react";
import { api, apiPost } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { generateInstallmentSchedule, InstallmentFrequency, Installment } from "@/lib/payment-plans";
import type { CustomerSummary } from "@/lib/types";
import { Calendar, Layers, AlertCircle, X, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PaymentPlanModalProps {
  isOpen?: boolean;
  customerId?: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function PaymentPlanModal({
  isOpen = true,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  invoiceId,
  invoiceNumber,
  defaultAmount = 50000,
  onClose,
  onSuccess,
}: PaymentPlanModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId ?? "");
  const customerId = initialCustomerId || selectedCustomerId;
  const setCustomerId = setSelectedCustomerId;
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(defaultAmount);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(3);
  const [frequency, setFrequency] = useState<InstallmentFrequency>("monthly");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load customer list if no customerId is provided
  useEffect(() => {
    if (!initialCustomerId && isOpen) {
      void (async () => {
        try {
          const list = await api<CustomerSummary[]>("/api/customers");
          setCustomers(list);
          if (list.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(list[0].id);
            if (list[0].totalOutstanding > 0) {
              setTotalAmount(list[0].totalOutstanding);
            }
          }
        } catch {
          // ignore error fetching customer dropdown
        }
      })();
    }
  }, [initialCustomerId, isOpen, selectedCustomerId]);

  const selectedCustomerName = useMemo(() => {
    if (initialCustomerName) return initialCustomerName;
    const found = customers.find((c) => c.id === customerId);
    return found?.name ?? "Selected Customer";
  }, [initialCustomerName, customers, customerId]);

  // Live preview calculation
  const previewSchedule: Installment[] = useMemo(() => {
    if (totalAmount <= 0 || numberOfInstallments < 2) return [];
    try {
      return generateInstallmentSchedule(
        totalAmount,
        numberOfInstallments,
        frequency,
        new Date(startDate)
      );
    } catch {
      return [];
    }
  }, [totalAmount, numberOfInstallments, frequency, startDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a target customer");
      return;
    }
    if (totalAmount <= 0) {
      setError("Please enter a valid total amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiPost("/api/payment-plans", {
        customerId,
        invoiceId: invoiceId || null,
        totalAmount,
        numberOfInstallments,
        frequency,
        startDate,
        note: note.trim() || undefined,
      });

      await onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create payment plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-plan-title"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 id="payment-plan-title" className="text-base font-bold text-slate-900 tracking-tight">
                Create Installment Payment Plan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Schedule structured milestone commitments with automated dunning pauses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selection if standalone */}
          {!initialCustomerId ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Debtor / Customer *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust && cust.totalOutstanding > 0) {
                    setTotalAmount(cust.totalOutstanding);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="">Select a debtor…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatINR(c.totalOutstanding)} outstanding)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-slate-900">{selectedCustomerName}</span>
                {invoiceNumber && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono font-medium text-blue-600">{invoiceNumber}</span>
                  </>
                )}
              </div>
              <Badge variant="blue" size="sm">
                Target Account
              </Badge>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Settlement Amount (₹) *
              </label>
              <input
                type="number"
                min="100"
                step="1"
                required
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Number of Installments *
              </label>
              <select
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} Equal Milestones
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cadence / Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="weekly">Weekly (Every 7 days)</option>
                <option value="biweekly">Bi-Weekly (Every 14 days)</option>
                <option value="monthly">Monthly (Calendar Month)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Milestone Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Agreement Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Approved by CFO over email; debtor committed to UPI auto-debit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Schedule Live Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Generated Milestone Breakdown</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                Total: <strong className="text-slate-900 font-mono">{formatINR(totalAmount)}</strong>
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3 max-h-40 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold text-slate-500">
                    <th className="pb-1.5 font-semibold">Milestone</th>
                    <th className="pb-1.5 font-semibold">Due Date</th>
                    <th className="pb-1.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewSchedule.map((inst) => (
                    <tr key={inst.sequence}>
                      <td className="py-1.5 font-bold text-slate-700">Installment #{inst.sequence}</td>
                      <td className="py-1.5 text-slate-600">
                        {new Date(inst.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                        {formatINR(inst.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={loading}
              disabled={loading || previewSchedule.length === 0 || !customerId}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Confirm {numberOfInstallments}-Part Plan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
