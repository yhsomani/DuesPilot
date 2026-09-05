"use client";

import { useState } from "react";
import {
  Sparkles,
  MessageSquare,
  Bot,
  Copy,
  Check,
  Calendar,
  IndianRupee,
  ShieldAlert,
  Loader2,
  X,
  CreditCard,
} from "lucide-react";
import type { DunningTone } from "@/lib/copilot";

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  customerName?: string;
  onPromiseExtracted?: (promise: {
    amount: number;
    promiseDate: string;
    paymentMode?: string;
    notes?: string;
  }) => void;
}

export function AICopilotModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onPromiseExtracted,
}: AICopilotModalProps) {
  const [activeTab, setActiveTab] = useState<"extract" | "draft">("extract");

  // Extract State
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    intent: string;
    amount: number | null;
    promiseDate: string | null;
    paymentMode: string | null;
    confidenceScore: number;
    disputeReason?: string | null;
    extractedSummary: string;
    source: string;
  } | null>(null);

  // Draft State
  const [tone, setTone] = useState<"FRIENDLY" | "PROFESSIONAL" | "FIRM" | "MSME_STATUTORY_DEMAND">("PROFESSIONAL");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP" | "SMS">("WHATSAPP");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{
    subject?: string;
    body: string;
    characterCount: number;
    source: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/copilot/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setExtractedData(data.data);
      }
    } catch (err) {
      console.error("Failed to analyze communication", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!customerId) return;
    setIsDrafting(true);
    try {
      const res = await fetch("/api/copilot/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          tone,
          channel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setDraftResult(data.data);
      }
    } catch (err) {
      console.error("Failed to generate draft", err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyDraft = () => {
    if (!draftResult) return;
    const textToCopy = draftResult.subject
      ? `Subject: ${draftResult.subject}\n\n${draftResult.body}`
      : draftResult.body;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyExtractedPromise = () => {
    if (!extractedData || !extractedData.amount || !extractedData.promiseDate) return;
    if (onPromiseExtracted) {
      onPromiseExtracted({
        amount: extractedData.amount,
        promiseDate: extractedData.promiseDate,
        paymentMode: extractedData.paymentMode || "BANK_TRANSFER",
        notes: extractedData.extractedSummary,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Dunning Copilot</h2>
              <p className="text-xs text-slate-500">
                {customerName ? `Context: ${customerName}` : "Smart PTP extraction & calibrated dunning"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("extract")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "extract"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Extract Promise to Pay (PTP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draft")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "draft"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Draft Dunning Message
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "extract" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paste Customer Email, WhatsApp Message, or Call Transcript
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g. Hi team, we got the invoice. We will release payment of ₹45,000 next Friday via RTGS. Thanks!"
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !inputText.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing with AI…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Extract Details
                    </>
                  )}
                </button>
              </div>

              {extractedData && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      Extraction Results ({extractedData.source})
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                      {extractedData.confidenceScore}% Confidence
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{extractedData.extractedSummary}</p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" /> Amount
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {extractedData.amount ? `₹${extractedData.amount.toLocaleString("en-IN")}` : "Not found"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Promise Date
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {extractedData.promiseDate || "Not found"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Mode
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        {extractedData.paymentMode || "Unspecified"}
                      </p>
                    </div>
                  </div>

                  {extractedData.intent === "DISPUTE_RAISED" && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>{extractedData.disputeReason || "Dispute identified. Requires collector attention."}</span>
                    </div>
                  )}

                  {extractedData.amount && extractedData.promiseDate && onPromiseExtracted && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyExtractedPromise}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Apply as Promised Payment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dunning Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as DunningTone)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="FRIENDLY">Friendly (Early 1-15 DPD)</option>
                    <option value="PROFESSIONAL">Professional (15-30 DPD)</option>
                    <option value="FIRM">Firm Escalation (30-45 DPD)</option>
                    <option value="MSME_STATUTORY_DEMAND">MSME Statutory Notice (45+ DPD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as "WHATSAPP" | "EMAIL" | "SMS")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="WHATSAPP">WhatsApp Message</option>
                    <option value="EMAIL">Email Follow-up</option>
                    <option value="SMS">SMS Notice</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={isDrafting || !customerId}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating Draft…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Calibrated Draft
                    </>
                  )}
                </button>
              </div>

              {draftResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Generated Message ({draftResult.characterCount} chars)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Text
                        </>
                      )}
                    </button>
                  </div>

                  {draftResult.subject && (
                    <div className="rounded-lg bg-white p-2.5 border border-slate-200 text-xs font-bold text-slate-800">
                      Subject: {draftResult.subject}
                    </div>
                  )}

                  <div className="rounded-lg bg-white p-3 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {draftResult.body}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
