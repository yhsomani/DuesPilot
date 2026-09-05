"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import type { ImportResult } from "@/lib/types";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";

type Step = "upload" | "mapping" | "preview" | "done";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  outstanding: string;
  email: string;
  phone: string;
  gstin: string;
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = [
  "customerName",
  "invoiceNumber",
  "dueDate",
  "amount",
];

const FIELD_LABELS: Record<keyof ColumnMapping, { label: string; desc: string }> = {
  customerName: { label: "Customer Name *", desc: "Corporate entity or debtor name" },
  invoiceNumber: { label: "Invoice Number *", desc: "Unique billing reference" },
  invoiceDate: { label: "Invoice Date", desc: "Original billing issuance date" },
  dueDate: { label: "Due Date *", desc: "Maturity / contractual payment date" },
  amount: { label: "Invoice Total *", desc: "Gross invoice bill amount in INR" },
  outstanding: { label: "Outstanding Balance", desc: "Unsettled overdue amount" },
  email: { label: "Accounts Email", desc: "Debtor accounts payable email" },
  phone: { label: "Contact Mobile", desc: "WhatsApp / phone for dunning" },
  gstin: { label: "Customer GSTIN", desc: "15-digit Indian Tax Identifier" },
};

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    customerName: "",
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    amount: "",
    outstanding: "",
    email: "",
    phone: "",
    gstin: "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const idemKeyRef = useRef<string | null>(null);
  const idemKey = () => (idemKeyRef.current ??= crypto.randomUUID());

  const parseCSV = useCallback((file: File) => {
    setFileName(file.name);
    idemKeyRef.current = crypto.randomUUID();
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as ParsedRow[];
        if (data.length === 0) {
          setError("The CSV file is empty or could not be parsed.");
          return;
        }

        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        setRows(data);
        setError(null);

        const autoMap: Partial<ColumnMapping> = {};
        hdrs.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (
            (lower.includes("customer") ||
              lower.includes("client") ||
              lower.includes("party") ||
              lower.includes("debtor")) &&
            lower.includes("name")
          )
            autoMap.customerName = h;
          else if (
            lower.includes("invoice") &&
            (lower.includes("number") || lower.includes("no") || lower.includes("#") || lower.includes("id"))
          )
            autoMap.invoiceNumber = h;
          else if (lower.includes("invoice") && lower.includes("date"))
            autoMap.invoiceDate = h;
          else if (lower.includes("due") && (lower.includes("date") || lower.includes("day")))
            autoMap.dueDate = h;
          else if (
            (lower.includes("amount") || lower.includes("total") || lower.includes("value")) &&
            !lower.includes("outstanding") &&
            !lower.includes("balance") &&
            !lower.includes("paid")
          )
            autoMap.amount = h;
          else if (
            lower.includes("outstanding") ||
            lower.includes("balance") ||
            lower.includes("due amount")
          )
            autoMap.outstanding = h;
          else if (lower.includes("email") || lower.includes("mail")) autoMap.email = h;
          else if (
            lower.includes("phone") ||
            lower.includes("mobile") ||
            lower.includes("contact")
          )
            autoMap.phone = h;
          else if (
            lower.includes("gst") ||
            lower.includes("gstin") ||
            lower.includes("tax id")
          )
            autoMap.gstin = h;
        });

        setMapping((prev) => ({ ...prev, ...autoMap }));
        setStep("mapping");
      },
    });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    parseCSV(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files[0];
    if (!selected) return;
    parseCSV(selected);
  };

  const isMappingValid = REQUIRED_FIELDS.every((f) => Boolean(mapping[f]));

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  const handlePreview = () => {
    setStep("preview");
  };

  const handleImport = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await api<ImportResult>("/api/import", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey() },
        body: JSON.stringify({ rows, mapping }),
      });
      setResult(res);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Please verify data formats and try again.");
      setStep("preview");
    } finally {
      setUploading(false);
    }
  };

  const stepsList = [
    { id: "upload", label: "Upload File" },
    { id: "mapping", label: "Map Columns" },
    { id: "preview", label: "Review & Plan" },
    { id: "done", label: "Results" },
  ];

  const currentStepIndex = stepsList.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Import Receivables</h1>
            <Badge variant="blue" size="sm">
              Batch Ingestion
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Ingest invoices from Tally, Busy, QuickBooks, SAP, Zoho Books, or custom CSV/Excel exports.
          </p>
        </div>

        <a
          href="/api/import/sample"
          download
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          <span>Download Sample CSV</span>
        </a>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          {stepsList.map((s, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      isCurrent ? "text-slate-900" : isDone ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 mx-3 h-0.5 rounded-full transition-colors ${
                      idx < currentStepIndex ? "bg-emerald-500" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-3xl border-2 border-dashed border-slate-300/80 bg-white p-12 text-center hover:border-blue-500 hover:bg-blue-50/20 transition-all cursor-pointer shadow-2xs group"
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloud className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">
                  Drag & drop your receivables CSV here, or{" "}
                  <span className="text-blue-600 underline underline-offset-4 hover:text-blue-700">
                    browse files
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Automatic header detection for Customer Name, Invoice #, Due Date, and Amounts. Supports up to 5,000 rows per batch.
                </p>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Need standard headers or sample test data?</p>
                <p className="text-[11px] text-slate-600">
                  Download our verified sample CSV configured for Indian GST receivables and ledger reconciliation.
                </p>
              </div>
            </div>
            <a
              href="/api/import/sample"
              download
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-blue-700 transition shadow-2xs shrink-0 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Sample CSV</span>
            </a>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">File Parsing Error</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Map File Columns</h2>
                <p className="text-xs text-slate-500">
                  Match your CSV headers to DuesPilot fields. Fields marked with * are required.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isMappingValid ? "success" : "warning"} size="sm">
                  {mappedCount} of {Object.keys(FIELD_LABELS).length} Fields Mapped
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => {
                const info = FIELD_LABELS[field];
                const isRequired = REQUIRED_FIELDS.includes(field);
                const isMapped = Boolean(mapping[field]);

                return (
                  <div
                    key={field}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      isMapped
                        ? "border-blue-200/80 bg-blue-50/30"
                        : isRequired
                        ? "border-amber-200/80 bg-amber-50/30"
                        : "border-slate-200/70 bg-slate-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">{info.label}</label>
                      {isRequired && (
                        <span className="text-[10px] font-bold text-amber-700 uppercase">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2 truncate">{info.desc}</p>
                    <select
                      value={mapping[field]}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="">-- Do Not Import --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Sample Preview */}
          {rows.length > 0 && (
            <div className="rounded-3xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Data Sample Preview ({Math.min(rows.length, 5)} of {rows.length} rows)
                  </p>
                  <p className="text-[11px] text-slate-500">File: {fileName}</p>
                </div>
                <span className="text-[11px] text-slate-500 font-mono font-bold">
                  {headers.length} headers detected
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {headers.slice(0, 7).map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left font-bold text-slate-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        {headers.slice(0, 7).map((h) => (
                          <td key={h} className="px-4 py-2 text-slate-700 whitespace-nowrap">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("upload")}
              className="gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Upload</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePreview}
              disabled={!isMappingValid}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
            >
              <span>Review & Validate</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Validation Plan */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Execution & Binding Summary</h2>
            <p className="text-xs text-slate-500 mb-6">
              Review active column mappings for{" "}
              <strong className="text-slate-800">{rows.length} records</strong> before committing to the database.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REQUIRED_FIELDS.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-xl bg-blue-50/70 border border-blue-100 px-3.5 py-2.5 text-xs"
                >
                  <span className="font-bold text-blue-950">{FIELD_LABELS[field].label}</span>
                  <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                    {mapping[field]}
                  </span>
                </div>
              ))}
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[])
                .filter((f) => !REQUIRED_FIELDS.includes(f) && mapping[f])
                .map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-medium text-slate-700">{FIELD_LABELS[field].label}</span>
                    <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {mapping[field]}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3 shadow-2xs"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Ingestion Blocked</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("mapping")}
              disabled={uploading}
              className="gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Edit Mapping</span>
            </Button>

            <Button
              size="sm"
              onClick={handleImport}
              loading={uploading}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
            >
              <span>Confirm & Import {rows.length} Invoices</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Completion & Results */}
      {step === "done" && result && (
        <div className="space-y-6">
          <div
            className={`rounded-3xl border p-8 shadow-2xs text-center ${
              result.invoicesCreated > 0
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-amber-200 bg-amber-50/40"
            }`}
          >
            <div
              className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4 border shadow-2xs ${
                result.invoicesCreated > 0
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}
            >
              {result.invoicesCreated > 0 ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <AlertTriangle className="h-8 w-8" />
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              {result.invoicesCreated > 0
                ? result.skippedRows > 0
                  ? "Import Completed with Partial Skips"
                  : "Receivables Ingested Successfully!"
                : "No Invoices Were Imported"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {result.invoicesCreated > 0
                ? `${result.invoicesCreated} invoices have been parsed and linked to debtor accounts for dunning and reconciliation.`
                : "The uploaded rows contained structural format errors or duplicate entries."}
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <StatCard
                title="Invoices Created"
                value={result.validRows.toString()}
                subtitle="Parsed & committed"
                icon={CheckCircle2}
                variant="success"
              />
              <StatCard
                title="Rows Skipped"
                value={result.skippedRows.toString()}
                subtitle="Validation rejects"
                icon={AlertTriangle}
                variant={result.skippedRows > 0 ? "warning" : "default"}
              />
              <StatCard
                title="Customers Added"
                value={result.customersCreated.toString()}
                subtitle="New debtor records"
                icon={FileText}
                variant="blue"
              />
              <StatCard
                title="Total Outstanding"
                value={formatINR(result.totalAmount)}
                subtitle="Ledger principal"
                icon={FileSpreadsheet}
                variant="default"
              />
            </div>

            {/* Skipped Diagnostics */}
            {result.issues.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-white text-left shadow-2xs overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <p className="text-xs font-bold text-amber-900">
                      Skipped Row Diagnostics ({result.issues.length} reasons logged)
                    </p>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {result.issues.map((issue, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-5 py-2.5 text-xs hover:bg-slate-50"
                    >
                      <Badge variant="warning" size="sm" className="font-mono">
                        Row {issue.row}
                      </Badge>
                      <span className="text-slate-800 font-medium">{issue.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setRows([]);
                  setHeaders([]);
                  setStep("upload");
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Upload Another File</span>
              </Button>

              {result.invoicesCreated > 0 && (
                <Link href="/dashboard/queue">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
                  >
                    <span>Open Collection Queue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
