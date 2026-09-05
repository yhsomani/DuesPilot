"use client";

import { useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  Building2,
  DollarSign,
} from "lucide-react";
import type { ReconciliationMatch } from "@/lib/bank-reconciliation";

interface ReconSummary {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  unmatched: number;
  totalAmount: number;
}

const SAMPLE_CSV = `Date,Narration,Chq / Ref No.,Credit (INR),Balance (INR)
05/09/2026,NEFT-N09224256789-Acme Corp-INV-1001,N09224256789,25000.00,125000.00
04/09/2026,UPI/328947239847/Payment from Bharat Enterprises,328947239847,15000.00,100000.00
03/09/2026,RTGS/HDFCR5202409050012-Delta Logistics,HDFCR5202409050012,45000.00,85000.00
02/09/2026,IMPS/P2A/328947999999/Direct Settlement,328947999999,10000.00,40000.00`;

export default function ReconciliationPage() {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [summary, setSummary] = useState<ReconSummary | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      handleAnalyze(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV);
    handleAnalyze(SAMPLE_CSV);
  };

  const handleAnalyze = async (contentToAnalyze?: string) => {
    const content = contentToAnalyze || csvText;
    if (!content.trim()) {
      setErrorMessage("Please paste or upload bank statement CSV text.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setParseErrors([]);

    try {
      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_and_match",
          csvContent: content,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze bank statement");
      }

      setMatches(data.matches || []);
      setSummary(data.summary || null);
      setParseErrors(data.parseErrors || []);

      // Pre-select high-confidence matches by default
      const autoSelected = (data.matches || [])
        .filter((m: ReconciliationMatch) => m.confidenceLevel === "HIGH" && m.customerId && m.suggestedAllocations.length > 0)
        .map((m: ReconciliationMatch) => m.transactionId);
      setSelectedMatchIds(autoSelected);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error analyzing statement");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMatched = () => {
    const allMatched = matches
      .filter((m) => m.customerId && m.suggestedAllocations.length > 0)
      .map((m) => m.transactionId);
    setSelectedMatchIds(allMatched);
  };

  const handleDeselectAll = () => {
    setSelectedMatchIds([]);
  };

  const handleExecuteAllocation = async () => {
    const selectedMatches = matches.filter(
      (m) => selectedMatchIds.includes(m.transactionId) && m.customerId && m.suggestedAllocations.length > 0
    );

    if (selectedMatches.length === 0) {
      setErrorMessage("Please select at least one matched transaction to allocate.");
      return;
    }

    setAllocating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        action: "confirm_and_allocate",
        matches: selectedMatches.map((m) => ({
          transactionId: m.transactionId,
          customerId: m.customerId!,
          amount: m.transaction.creditAmount,
          paymentDate: m.transaction.date,
          reference: m.transaction.reference || m.transaction.narration.substring(0, 50),
          mode: "BANK_TRANSFER",
          allocations: m.suggestedAllocations.map((a) => ({
            invoiceId: a.invoiceId,
            amount: a.amount,
          })),
        })),
      };

      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reconcile payments");
      }

      setSuccessMessage(
        `Successfully reconciled and allocated ₹${(data.totalReconciledAmount || 0).toLocaleString("en-IN")} across ${data.successfulAllocations || 0} transaction(s)! Invoices and ledger updated.`
      );

      // Remove reconciled matches from active view
      const successfulIds = new Set(
        (data.results || [])
          .filter((r: { status: string }) => r.status === "SUCCESS")
          .map((r: { transactionId: string }) => r.transactionId)
      );

      setMatches((prev) => prev.filter((m) => !successfulIds.has(m.transactionId)));
      setSelectedMatchIds((prev) => prev.filter((id) => !successfulIds.has(id)));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error executing allocation");
    } finally {
      setAllocating(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filterConfidence !== "ALL" && m.confidenceLevel !== filterConfidence) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const narrationMatch = m.transaction.narration.toLowerCase().includes(q);
      const customerMatch = m.customerName?.toLowerCase().includes(q);
      const refMatch = m.transaction.reference.toLowerCase().includes(q);
      const invMatch = m.suggestedAllocations.some((a) => a.invoiceNumber.toLowerCase().includes(q));
      if (!narrationMatch && !customerMatch && !refMatch && !invMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bank Statement Reconciliation
          </h1>
          <p className="text-sm text-slate-500">
            Import bank statements (HDFC, ICICI, SBI, Axis, generic CSV) to automatically detect inward payments and reconcile open invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Load Sample CSV
          </button>
        </div>
      </div>

      {/* Upload / Input Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-600" />
              Upload or Paste Bank Statement CSV
            </h2>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Browse CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Paste CSV rows here (Columns: Date, Narration, Cheque / Ref No, Credit Amount, Balance)..."
            rows={4}
            className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Supported headers: Date, Narration / Description, UTR / Cheque / Ref, Deposit / Credit (INR).
            </p>
            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={loading || !csvText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Matching Against Receivables...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyze & Auto-Match
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            CSV Parsing Warnings ({parseErrors.length})
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {parseErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Credit Inflow
              </span>
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{summary.totalAmount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {summary.total} credit transaction(s) parsed
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                High Confidence Matches
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-900">
              {summary.highConfidence}
            </div>
            <div className="mt-1 text-xs text-emerald-700">
              Exact invoice number or balance match
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Fuzzy / Multi-Invoice
              </span>
              <Building2 className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900">
              {summary.mediumConfidence}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              Customer name identified in narration
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Unmatched
              </span>
              <AlertCircle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-700">
              {summary.unmatched}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Requires manual customer tagging
            </div>
          </div>
        </div>
      )}

      {/* Match Results Table */}
      {matches.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Table Controls */}
          <div className="border-b border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterConfidence("ALL")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filterConfidence === "ALL"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                All ({matches.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("HIGH")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filterConfidence === "HIGH"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                High Confidence ({summary?.highConfidence || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("MEDIUM")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filterConfidence === "MEDIUM"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Medium ({summary?.mediumConfidence || 0})
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("UNMATCHED")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filterConfidence === "UNMATCHED"
                    ? "bg-slate-700 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Unmatched ({summary?.unmatched || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search narration, customer..."
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSelectAllMatched}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Select Matched
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleExecuteAllocation}
                disabled={allocating || selectedMatchIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {allocating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Reconcile Selected ({selectedMatchIds.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedMatchIds.length > 0 &&
                        selectedMatchIds.length ===
                          matches.filter((m) => m.customerId && m.suggestedAllocations.length > 0).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) handleSelectAllMatched();
                        else handleDeselectAll();
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3">Date & Narration</th>
                  <th className="px-4 py-3">Deposit (INR)</th>
                  <th className="px-4 py-3">Matched Customer</th>
                  <th className="px-4 py-3">Confidence & Strategy</th>
                  <th className="px-4 py-3">Suggested Invoice Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatches.map((match) => {
                  const isSelected = selectedMatchIds.includes(match.transactionId);
                  const canSelect = Boolean(match.customerId && match.suggestedAllocations.length > 0);

                  return (
                    <tr
                      key={match.transactionId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => handleToggleSelect(match.transactionId)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {match.transaction.date}
                        </div>
                        <div className="text-slate-600 font-mono text-[11px] mt-0.5 line-clamp-2">
                          {match.transaction.narration}
                        </div>
                        {match.transaction.reference && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Ref: {match.transaction.reference}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{match.transaction.creditAmount.toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {match.customerName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-slate-900">
                              {match.customerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No customer match</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              match.confidenceLevel === "HIGH"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : match.confidenceLevel === "MEDIUM"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {match.confidenceLevel === "HIGH"
                              ? `✓ High (${match.confidenceScore}%)`
                              : match.confidenceLevel === "MEDIUM"
                              ? `⚠ Medium (${match.confidenceScore}%)`
                              : "Unmatched"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {match.notes}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {match.suggestedAllocations.length > 0 ? (
                          <div className="space-y-1">
                            {match.suggestedAllocations.map((alloc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded bg-slate-100 px-2 py-1 text-[11px]"
                              >
                                <span className="font-semibold text-slate-800">
                                  #{alloc.invoiceNumber}
                                </span>
                                <span className="text-emerald-700 font-mono font-medium flex items-center gap-1">
                                  <ArrowRight className="h-2.5 w-2.5" />
                                  ₹{alloc.amount.toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Manual allocation required
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
