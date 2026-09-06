"use client";

import { useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Search,
  Check,
  Building2,
  DollarSign,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatINR } from "@/lib/utils";
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
        .filter(
          (m: ReconciliationMatch) =>
            m.confidenceLevel === "HIGH" &&
            m.customerId &&
            m.suggestedAllocations.length > 0
        )
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
      (m) =>
        selectedMatchIds.includes(m.transactionId) &&
        m.customerId &&
        m.suggestedAllocations.length > 0
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
        `Successfully reconciled and allocated ${formatINR(
          data.totalReconciledAmount || 0
        )} across ${data.successfulAllocations || 0} transaction(s)! Invoices and ledger updated.`
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
      const invMatch = m.suggestedAllocations.some((a) =>
        a.invoiceNumber.toLowerCase().includes(q)
      );
      if (!narrationMatch && !customerMatch && !refMatch && !invMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Bank Statement Reconciliation
            </h1>
            <Badge variant="primary" size="sm">
              Smart Matcher
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Import bank statements (HDFC, ICICI, SBI, Axis, generic CSV) to automatically detect inward payments and reconcile open invoices.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadSample}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            <span>Load Sample CSV</span>
          </Button>
        </div>
      </div>

      {/* Upload / Input Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
              <span>Upload or Paste Bank Statement CSV</span>
            </h2>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 shadow-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Browse CSV File</span>
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
            className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 focus:outline-none transition-all"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-gray-500">
              Supported headers: <span className="font-medium text-gray-700">Date</span>, <span className="font-medium text-gray-700">Narration / Description</span>, <span className="font-medium text-gray-700">UTR / Cheque / Ref</span>, <span className="font-medium text-gray-700">Deposit / Credit (INR)</span>.
            </p>
            <Button
              onClick={() => handleAnalyze()}
              disabled={loading || !csvText.trim()}
              loading={loading}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              {!loading && <Search className="h-4 w-4" strokeWidth={1.5} />}
              <span>{loading ? "Matching Against Receivables..." : "Analyze & Auto-Match"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 flex items-start gap-3 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs space-y-1 shadow-xs">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-700" strokeWidth={1.5} />
            <span>CSV Parsing Warnings ({parseErrors.length})</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
            {parseErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Credit Inflow"
            value={formatINR(summary.totalAmount)}
            subtitle={`${summary.total} credit transaction(s) parsed`}
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="High Confidence Matches"
            value={summary.highConfidence.toString()}
            subtitle="Exact invoice number or balance match"
            icon={ShieldCheck}
            variant="success"
          />
          <StatCard
            title="Fuzzy / Multi-Invoice"
            value={summary.mediumConfidence.toString()}
            subtitle="Customer name identified in narration"
            icon={Building2}
            variant="warning"
          />
          <StatCard
            title="Unmatched Credits"
            value={summary.unmatched.toString()}
            subtitle="Requires manual customer tagging"
            icon={AlertCircle}
            variant="danger"
          />
        </div>
      )}

      {/* Match Results Table */}
      {matches.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Table Controls */}
          <div className="border-b border-gray-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-gray-50/75">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-700 mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterConfidence("ALL")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterConfidence === "ALL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span>All</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.2 font-mono text-[10px]">
                  {matches.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("HIGH")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterConfidence === "HIGH"
                    ? "bg-green-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span>High Confidence</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.2 font-mono text-[10px]">
                  {summary?.highConfidence || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("MEDIUM")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterConfidence === "MEDIUM"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span>Medium</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.2 font-mono text-[10px]">
                  {summary?.mediumConfidence || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterConfidence("UNMATCHED")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filterConfidence === "UNMATCHED"
                    ? "bg-gray-700 text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span>Unmatched</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.2 font-mono text-[10px]">
                  {summary?.unmatched || 0}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search narration, customer..."
                  className="h-8 rounded-lg border border-gray-300 bg-white pl-8 pr-7 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAllMatched}
                className="h-8 text-xs font-semibold"
              >
                Select Matched
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="h-8 text-xs text-gray-600 hover:text-gray-900"
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteAllocation}
                disabled={allocating || selectedMatchIds.length === 0}
                loading={allocating}
                className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs shadow-xs"
              >
                {!allocating && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                <span>Reconcile Selected ({selectedMatchIds.length})</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all matched transactions"
                      checked={
                        selectedMatchIds.length > 0 &&
                        selectedMatchIds.length ===
                          matches.filter((m) => m.customerId && m.suggestedAllocations.length > 0).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) handleSelectAllMatched();
                        else handleDeselectAll();
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3">Date & Narration</th>
                  <th className="px-4 py-3">Deposit (INR)</th>
                  <th className="px-4 py-3">Matched Customer</th>
                  <th className="px-4 py-3">Confidence & Strategy</th>
                  <th className="px-4 py-3">Suggested Invoice Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMatches.map((match) => {
                  const isSelected = selectedMatchIds.includes(match.transactionId);
                  const canSelect = Boolean(match.customerId && match.suggestedAllocations.length > 0);

                  return (
                    <tr
                      key={match.transactionId}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select transaction ${match.transaction.reference || match.transactionId}`}
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => handleToggleSelect(match.transactionId)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">
                          {match.transaction.date}
                        </div>
                        <div className="text-gray-600 font-mono text-[11px] mt-0.5 line-clamp-2">
                          {match.transaction.narration}
                        </div>
                        {match.transaction.reference && (
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            Ref: {match.transaction.reference}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {formatINR(match.transaction.creditAmount)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {match.customerName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" strokeWidth={1.5} />
                            <span className="font-semibold text-gray-900">
                              {match.customerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No customer match</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              match.confidenceLevel === "HIGH"
                                ? "success"
                                : match.confidenceLevel === "MEDIUM"
                                ? "warning"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {match.confidenceLevel === "HIGH"
                              ? `✓ High (${match.confidenceScore}%)`
                              : match.confidenceLevel === "MEDIUM"
                              ? `⚠ Medium (${match.confidenceScore}%)`
                              : "Unmatched"}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {match.notes}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {match.suggestedAllocations.length > 0 ? (
                          <div className="space-y-1">
                            {match.suggestedAllocations.map((alloc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-md bg-gray-100 px-2 py-1 text-[11px] border border-gray-200"
                              >
                                <span className="font-mono font-bold text-gray-800">
                                  #{alloc.invoiceNumber}
                                </span>
                                <span className="text-green-700 font-mono font-bold flex items-center gap-1">
                                  <ArrowRight className="h-2.5 w-2.5" strokeWidth={2} />
                                  {formatINR(alloc.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">
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
