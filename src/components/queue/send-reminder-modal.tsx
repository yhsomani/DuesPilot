"use client";

import { useState } from "react";
import { DEFAULT_TEMPLATES, interpolateTemplate, type TemplateDefinition } from "@/lib/templates";
import { Mail, MessageSquare, Phone, Send, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const getVariables = () => {
    const plink = `https://pay.duespilot.com/plink_${customerId.slice(-4)}_${invoiceNumber ? invoiceNumber.replace(/[^a-zA-Z0-9]/g, "") : "settle"}`;
    const upiLink = `upi://pay?pa=duespilot@icici&pn=${encodeURIComponent(companyName)}&am=${amount || 0}&cu=INR`;
    return {
      customerName,
      contactName: customerName,
      invoiceNumber: invoiceNumber || "INV-PENDING",
      amount: amount ? `₹${amount.toLocaleString("en-IN")}` : "₹0",
      outstandingAmount: outstandingAmount
        ? `₹${outstandingAmount.toLocaleString("en-IN")}`
        : amount
        ? `₹${amount.toLocaleString("en-IN")}`
        : "₹0",
      dueDate: dueDate || "Due upon receipt",
      daysOverdue: daysOverdue != null ? daysOverdue : 0,
      companyName,
      promiseDate: "Upcoming commitment date",
      paymentReference: "UTR Pending",
      paymentLink: plink,
      upiQrString: upiLink,
      installmentSummary: "Structured installment schedule",
    };
  };

  const initialTemplate = DEFAULT_TEMPLATES[0];
  const initialVars = getVariables();

  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP" | "SMS">("EMAIL");
  const [recipient, setRecipient] = useState(recipientEmail || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplate.id);
  const [subject, setSubject] = useState(interpolateTemplate(initialTemplate.subject, initialVars));
  const [body, setBody] = useState(interpolateTemplate(initialTemplate.body, initialVars));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChannelChange = (ch: "EMAIL" | "WHATSAPP" | "SMS") => {
    setChannel(ch);
    if (ch === "EMAIL") {
      setRecipient(recipientEmail || "");
    } else {
      setRecipient(recipientPhone || "");
    }

    const matchingTemplate =
      DEFAULT_TEMPLATES.find((t) => t.channel === ch) || DEFAULT_TEMPLATES[0];
    setSelectedTemplateId(matchingTemplate.id);
    const vars = getVariables();
    setSubject(interpolateTemplate(matchingTemplate.subject, vars));
    setBody(interpolateTemplate(matchingTemplate.body, vars));
  };

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const template = DEFAULT_TEMPLATES.find((t) => t.id === tplId) || DEFAULT_TEMPLATES[0];
    const vars = getVariables();
    setSubject(interpolateTemplate(template.subject, vars));
    setBody(interpolateTemplate(template.body, vars));
  };

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Send Payment Reminder</h3>
            <p className="text-xs text-slate-500">Direct outreach to {customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Reminder Dispatched!</h4>
            <p className="text-xs text-slate-500">
              Message logged to customer timeline and sent to {recipient}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Outreach Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "EMAIL", label: "Email", icon: Mail },
                    { id: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
                    { id: "SMS", label: "SMS", icon: Phone },
                  ] as const
                ).map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleChannelChange(ch.id)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                        channel === ch.id
                          ? "border-blue-600 bg-blue-50/80 text-blue-700 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient {channel === "EMAIL" ? "Email Address" : "Phone Number"}
              </label>
              <input
                type={channel === "EMAIL" ? "email" : "tel"}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={channel === "EMAIL" ? "accounts@company.com" : "+91 98765 43210"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <optgroup label={`${channel} Templates`}>
                  {DEFAULT_TEMPLATES.filter((tpl) => tpl.channel === channel).map((tpl: TemplateDefinition) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other Templates">
                  {DEFAULT_TEMPLATES.filter((tpl) => tpl.channel !== channel).map((tpl: TemplateDefinition) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.channel})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Subject line (Email only) */}
            {channel === "EMAIL" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            )}

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Message Content</label>
                {channel === "SMS" ? (
                  <span className="text-[11px] text-blue-600 font-medium">
                    DLT: DUESPL ({body.length} chars • {body.length <= 160 ? "1 segment" : `${Math.ceil(body.length / 153)} segments`})
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">Auto-populated with dynamic tags</span>
                )}
              </div>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-mono text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none transition-all"
                required
              />
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
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Dispatch Reminder</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
