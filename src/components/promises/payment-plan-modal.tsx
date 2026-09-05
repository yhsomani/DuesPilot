"use client";

import { useState, useMemo } from "react";
import { apiPost } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { generateInstallmentSchedule, InstallmentFrequency, Installment } from "@/lib/payment-plans";

interface PaymentPlanModalProps {
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentPlanModal({
  customerId,
  customerName,
  invoiceId,
  invoiceNumber,
  defaultAmount = 50000,
  onClose,
  onSuccess,
}: PaymentPlanModalProps) {
  const [totalAmount, setTotalAmount] = useState<number>(defaultAmount);
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(3);
  const [frequency, setFrequency] = useState<InstallmentFrequency>("monthly");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create payment plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-plan-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="payment-plan-title" className="text-base font-bold text-gray-900">
              Create Installment Payment Plan
            </h2>
            <p className="text-xs text-gray-500">
              Customer: <strong className="text-gray-800">{customerName}</strong>
              {invoiceNumber && (
                <>
                  {" · "}Invoice: <span className="font-mono text-blue-600">{invoiceNumber}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Total Settlement Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                step="1"
                required
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Number of Installments
              </label>
              <select
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              >
                {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} Installments
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              >
                <option value="weekly">Weekly (Every 7 days)</option>
                <option value="biweekly">Bi-Weekly (Every 14 days)</option>
                <option value="monthly">Monthly (Every month)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                First Due Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Agreement Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Agreed with Director over call on 5th Sep"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Schedule Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-800 uppercase tracking-wider">
                Installment Schedule Preview
              </span>
              <span className="text-gray-500">
                Total: <strong className="text-gray-900">{formatINR(totalAmount)}</strong>
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 max-h-44 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-1.5 font-semibold">#</th>
                    <th className="pb-1.5 font-semibold">Milestone Date</th>
                    <th className="pb-1.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewSchedule.map((inst) => (
                    <tr key={inst.sequence}>
                      <td className="py-1.5 font-bold text-gray-700">Installment {inst.sequence}</td>
                      <td className="py-1.5 text-gray-600">
                        {new Date(inst.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-gray-900">
                        {formatINR(inst.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || previewSchedule.length === 0}
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Scheduling Plan…" : `Confirm ${numberOfInstallments}-Part Plan`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
