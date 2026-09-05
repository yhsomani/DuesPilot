"use client";

import { useState, useEffect, useId } from "react";
import type { LegalNoticeType } from "@/lib/legal-notices";

interface LegalNoticeModalProps {
  customerId: string;
  customerName: string;
  customerGstin?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  defaultPrincipal?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LegalNoticeModal({
  customerId,
  customerName,
  isOpen,
  onClose,
  onSuccess,
}: LegalNoticeModalProps) {
  const [noticeType, setNoticeType] = useState<LegalNoticeType>("MSME_SECTION_15_16");
  const [cureDays, setCureDays] = useState<number>(15);
  const [rbiBankRate, setRbiBankRate] = useState<number>(6.75);
  const [udyamNumber, setUdyamNumber] = useState<string>("UDYAM-MH-01-0089124");

  // Bank Remittance
  const [accountName, _setAccountName] = useState<string>("DuesPilot Logistics Private Limited");
  const [accountNumber, _setAccountNumber] = useState<string>("50200089123456");
  const [bankName, _setBankName] = useState<string>("HDFC Bank, Fort Branch");
  const [ifscCode, _setIfscCode] = useState<string>("HDFC0000060");
  const [upiId, _setUpiId] = useState<string>("duespilot@hdfcbank");

  // Cheque Details (for 138 NI Act)
  const [chequeNumber, setChequeNumber] = useState<string>("CHQ-890123");
  const [chequeDate, setChequeDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [drawnBank, setDrawnBank] = useState<string>("State Bank of India");
  const [dishonourDate, setDishonourDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dishonourReason, setDishonourReason] = useState<string>("Funds Insufficient");

  // Generated state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedData, setGeneratedData] = useState<{
    referenceNumber: string;
    title: string;
    subject: string;
    body: string;
    claimSummary: {
      totalOutstanding: number;
      totalPenalInterest: number;
      totalStatutoryClaim: number;
      statutoryAnnualRate: number;
      invoices: Array<{
        invoiceNumber: string;
        principalAmount: number;
        outstandingAmount: number;
        overdueDays: number;
        penalInterest: number;
        totalClaim: number;
      }>;
    };
  } | null>(null);

  const modalHeadingId = useId();

  // Auto-fetch calculation or generate notice on open/change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchNotice() {
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/legal/notice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            noticeType,
            cureDays,
            rbiBankRate,
            udyamNumber,
            bankDetails: {
              accountName,
              accountNumber,
              bankName,
              ifscCode,
              upiId,
            },
            chequeDetails:
              noticeType === "CHEQUE_DISHONOUR_138"
                ? {
                    chequeNumber,
                    chequeDate,
                    drawnBank,
                    dishonourDate,
                    dishonourReason,
                  }
                : undefined,
            logCollectionEvent: false, // preview only
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to generate legal notice preview");
        }

        if (isMounted) {
          setGeneratedData(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error generating notice");
        }
      } finally {
        if (isMounted) {
          setGenerating(false);
        }
      }
    }

    fetchNotice();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    customerId,
    noticeType,
    cureDays,
    rbiBankRate,
    udyamNumber,
    accountName,
    accountNumber,
    bankName,
    ifscCode,
    upiId,
    chequeNumber,
    chequeDate,
    drawnBank,
    dishonourDate,
    dishonourReason,
  ]);

  if (!isOpen) return null;

  async function handleSaveNotice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          noticeType,
          cureDays,
          rbiBankRate,
          udyamNumber,
          bankDetails: {
            accountName,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
          },
          chequeDetails:
            noticeType === "CHEQUE_DISHONOUR_138"
              ? {
                  chequeNumber,
                  chequeDate,
                  drawnBank,
                  dishonourDate,
                  dishonourReason,
                }
              : undefined,
          logCollectionEvent: true, // Persist event + audit
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to record legal notice");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record notice");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyText() {
    if (!generatedData) return;
    navigator.clipboard.writeText(
      `${generatedData.title}\n\nSUBJECT: ${generatedData.subject}\n\n${generatedData.body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    if (!generatedData) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${generatedData.title} - ${customerName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; line-height: 1.6; padding: 40px; color: #111; font-size: 14px; }
            h2 { text-align: center; text-decoration: underline; font-size: 16px; margin-bottom: 24px; }
            pre { white-space: pre-wrap; font-family: inherit; }
            .header-table { width: 100%; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h2>${generatedData.title}</h2>
          <pre>${generatedData.body}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalHeadingId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              <h3 id={modalHeadingId} className="text-base font-semibold text-gray-900">
                Statutory Legal Notice & MSME Samadhaan Generator
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Draft formal demand notice with Sections 15 & 16 MSMED Act penal interest for {customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Statutory Notice Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Select Legal Notice Framework
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                {
                  id: "MSME_SECTION_15_16",
                  label: "MSME Sec 15 & 16",
                  desc: "3x RBI Bank Rate + Samadhaan Warning",
                },
                {
                  id: "LEGAL_DEMAND_FINAL",
                  label: "Final Legal Demand",
                  desc: "Pre-Litigation 7-Day Order 37 Demand",
                },
                {
                  id: "CHEQUE_DISHONOUR_138",
                  label: "Sec 138 NI Act Notice",
                  desc: "Cheque / NACH Dishonour 15-Day Demand",
                },
                {
                  id: "CONCILIATION_INTIMATION",
                  label: "Conciliation Notice",
                  desc: "Pre-Litigation Settlement & Lok Adalat",
                },
              ].map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setNoticeType(tpl.id as LegalNoticeType)}
                  className={`p-3 text-left rounded-xl border transition ${
                    noticeType === tpl.id
                      ? "border-amber-600 bg-amber-50/50 shadow-xs"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${
                      noticeType === tpl.id ? "text-amber-900" : "text-gray-900"
                    }`}
                  >
                    {tpl.label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-tight">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Claim Breakdown Card */}
          {generatedData?.claimSummary && (
            <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Statutory Claim Computation (Sections 15 & 16 MSMED Act)
                </span>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Statutory Interest Rate: {generatedData.claimSummary.statutoryAnnualRate}% p.a. (3 × {rbiBankRate}%)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/80 rounded-lg p-2.5 border border-amber-100">
                  <p className="text-[11px] text-gray-500 font-medium">Principal Outstanding</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    ₹{generatedData.claimSummary.totalOutstanding.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg p-2.5 border border-amber-100">
                  <p className="text-[11px] text-amber-700 font-medium">Section 16 Penal Interest</p>
                  <p className="text-base font-bold text-amber-700 mt-0.5">
                    + ₹{generatedData.claimSummary.totalPenalInterest.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white/90 rounded-lg p-2.5 border border-amber-300 shadow-xs">
                  <p className="text-[11px] text-red-700 font-bold">TOTAL STATUTORY CLAIM</p>
                  <p className="text-base font-extrabold text-red-700 mt-0.5">
                    ₹{generatedData.claimSummary.totalStatutoryClaim.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Statutory Cure Period (Days)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={cureDays}
                onChange={(e) => setCureDays(parseInt(e.target.value) || 15)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                RBI Base Bank Rate (%)
              </label>
              <input
                type="number"
                step="0.25"
                value={rbiBankRate}
                onChange={(e) => setRbiBankRate(parseFloat(e.target.value) || 6.75)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Creditor Udyam Reg. Number
              </label>
              <input
                type="text"
                value={udyamNumber}
                onChange={(e) => setUdyamNumber(e.target.value)}
                placeholder="UDYAM-MH-01-XXXXXXX"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cheque Details (if Sec 138 selected) */}
          {noticeType === "CHEQUE_DISHONOUR_138" && (
            <div className="rounded-xl border border-red-200 bg-red-50/40 p-3.5 space-y-3">
              <h4 className="text-xs font-semibold text-red-900">
                Cheque Dishonour Parameters (Section 138 NI Act)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Cheque Number</label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Drawn Bank Name</label>
                  <input
                    type="text"
                    value={drawnBank}
                    onChange={(e) => setDrawnBank(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Memo Dishonour Date</label>
                  <input
                    type="date"
                    value={dishonourDate}
                    onChange={(e) => setDishonourDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-gray-600 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={dishonourReason}
                    onChange={(e) => setDishonourReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Legal Notice Preview Pane */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <span>Formal Notice Preview</span>
                {generating && <span className="text-[10px] text-amber-600 animate-pulse">Calculating statutory claim...</span>}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition"
                >
                  {copied ? "✓ Copied!" : "📋 Copy Notice Text"}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition"
                >
                  🖨️ Print / Save PDF
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 max-h-72 overflow-y-auto font-mono text-xs text-gray-800 leading-relaxed whitespace-pre-wrap select-text">
              {generatedData ? (
                <>
                  <div className="font-bold text-gray-900 text-center border-b border-gray-200 pb-2 mb-3">
                    {generatedData.title}
                  </div>
                  {generatedData.body}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">Loading statutory notice preview...</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <p className="text-xs text-gray-500">
            Recorded notices automatically update the customer recovery timeline and audit trail.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveNotice}
              disabled={loading || generating}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {loading ? "Recording Notice..." : "⚖️ Record & Log Notice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
