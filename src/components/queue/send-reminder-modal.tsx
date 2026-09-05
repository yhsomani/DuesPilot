"use client";

import { useState, useEffect } from "react";
import { DEFAULT_TEMPLATES, interpolateTemplate, type TemplateDefinition } from "@/lib/templates";

interface SendReminderModalProps {
  customerId: string;
  customerName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  amount?: number | null;
  outstandingAmount?: number | null;
  dueDate?: string | null;
  daysOverdue?: number | null;
  companyName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendReminderModal({
  customerId,
  customerName,
  recipientEmail,
  recipientPhone,
  invoiceId,
  invoiceNumber,
  amount,
  outstandingAmount,
  dueDate,
  daysOverdue,
  companyName = "DuesPilot Logistics",
  isOpen,
  onClose,
  onSuccess,
}: SendReminderModalProps) {
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP" | "SMS">("EMAIL");
  const [recipient, setRecipient] = useState(recipientEmail || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("payment-reminder");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (channel === "EMAIL") {
      setRecipient(recipientEmail || "");
    } else {
      setRecipient(recipientPhone || "");
    }
  }, [channel, recipientEmail, recipientPhone]);

  useEffect(() => {
    const template = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
    const variables: Record<string, string | number | null | undefined> = {
      customerName,
      contactName: customerName,
      invoiceNumber: invoiceNumber || "INV-PENDING",
      amount: amount ? `₹${amount.toLocaleString("en-IN")}` : "₹0",
      outstandingAmount: outstandingAmount ? `₹${outstandingAmount.toLocaleString("en-IN")}` : (amount ? `₹${amount.toLocaleString("en-IN")}` : "₹0"),
      dueDate: dueDate || "Due upon receipt",
      daysOverdue: daysOverdue != null ? daysOverdue : 0,
      companyName,
      promiseDate: "Upcoming commitment date",
      paymentReference: "UTR Pending",
    };

    setSubject(interpolateTemplate(template.subject, variables));
    setBody(interpolateTemplate(template.body, variables));
  }, [selectedTemplateId, customerName, invoiceNumber, amount, outstandingAmount, dueDate, daysOverdue, companyName]);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient.trim()) {
      setError(`Please provide a recipient ${channel === "EMAIL" ? "email address" : "phone number"}`);
      return;
    }
    if (!body.trim()) {
      setError("Message body cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          invoiceId: invoiceId || null,
          channel,
          recipient: recipient.trim(),
          subject: channel === "EMAIL" ? subject.trim() : null,
          body: body.trim(),
          templateId: selectedTemplateId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Send Collection Reminder</h3>
            <p className="text-xs text-gray-500">Direct outreach to {customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Reminder Dispatched!</h4>
            <p className="text-sm text-gray-500">
              Message logged to customer timeline and sent to {recipient}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {(["EMAIL", "WHATSAPP", "SMS"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition text-center ${
                      channel === ch
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {ch === "EMAIL" ? "📧 Email" : ch === "WHATSAPP" ? "💬 WhatsApp" : "📱 SMS"}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Recipient {channel === "EMAIL" ? "Email" : "Phone Number"}
              </label>
              <input
                type={channel === "EMAIL" ? "email" : "tel"}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={channel === "EMAIL" ? "accounts@company.com" : "+91 98765 43210"}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
              >
                {DEFAULT_TEMPLATES.map((tpl: TemplateDefinition) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject line (Email only) */}
            {channel === "EMAIL" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  required
                />
              </div>
            )}

            {/* Message Body */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message Body</label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-xs font-mono text-gray-800 focus:border-blue-500 focus:outline-hidden leading-relaxed resize-none"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Dispatch Reminder"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
