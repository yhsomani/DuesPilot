"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { api } from "@/lib/api";
import type { ImportResult } from "@/lib/types";

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

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  customerName: "Customer Name *",
  invoiceNumber: "Invoice Number *",
  invoiceDate: "Invoice Date",
  dueDate: "Due Date *",
  amount: "Invoice Amount *",
  outstanding: "Outstanding Amount",
  email: "Customer Email",
  phone: "Customer Phone",
  gstin: "Customer GSTIN",
};

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
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
          if ((lower.includes("customer") || lower.includes("client") || lower.includes("party") || lower.includes("debtor")) && lower.includes("name"))
            autoMap.customerName = h;
          else if (lower.includes("invoice") && (lower.includes("number") || lower.includes("no") || lower.includes("#") || lower.includes("id")))
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
          else if (lower.includes("outstanding") || lower.includes("balance") || lower.includes("due amount"))
            autoMap.outstanding = h;
          else if (lower.includes("email") || lower.includes("mail"))
            autoMap.email = h;
          else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact"))
            autoMap.phone = h;
          else if (lower.includes("gst") || lower.includes("gstin") || lower.includes("tax id"))
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

  const isMappingValid = REQUIRED_FIELDS.every((f) => mapping[f] !== "");

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
      setError(e instanceof Error ? e.message : "Import failed. Please try again.");
      setStep("preview");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Receivables</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload your receivables from Tally, Busy, QuickBooks, Excel, or custom ERP exports.
          </p>
        </div>

        <a
          href="/api/import/sample"
          download
          className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>📄</span>
          <span>Download Sample CSV</span>
        </a>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3">
        {(["upload", "mapping", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === s
                  ? "bg-blue-600 text-white shadow-xs"
                  : i < ["upload", "mapping", "preview", "done"].indexOf(step)
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === s ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {s === "upload"
                ? "Upload CSV"
                : s === "mapping"
                ? "Map Columns"
                : s === "preview"
                ? "Review & Validate"
                : "Complete"}
            </span>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer shadow-xs"
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <svg
                  className="h-7 w-7 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">
                Drag & drop your CSV file here, or{" "}
                <span className="text-blue-600 underline underline-offset-2">browse files</span>
              </p>
              <p className="mt-2 text-xs text-gray-500 max-w-md mx-auto">
                Supports all standard accounting export formats. Automatic header detection for Customer Name, Invoice #, Due Date, and Amount.
              </p>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs text-blue-900">
            <div>
              <p className="font-semibold">Need a template to get started?</p>
              <p className="text-blue-700">Download our sample CSV with dummy data for Indian GST & receivables.</p>
            </div>
            <a
              href="/api/import/sample"
              download
              className="rounded-lg bg-blue-600 text-white px-3 py-1.5 font-semibold hover:bg-blue-700 transition shrink-0"
            >
              Get Template
            </a>
          </div>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <h3 className="font-bold text-gray-900 mb-1">Map Columns</h3>
            <p className="text-xs text-gray-500 mb-6">
              Match your CSV headers to DuesPilot fields. Fields marked with * are required to create invoices.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map(
                (field) => (
                  <div key={field} className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      value={mapping[field]}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="">-- Do Not Import --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">
                  Data Preview (First {Math.min(rows.length, 5)} of {rows.length} rows)
                </p>
                <span className="text-[11px] text-gray-500 font-mono">
                  {headers.length} columns detected
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {headers.slice(0, 7).map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left font-semibold text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        {headers.slice(0, 7).map((h) => (
                          <td
                            key={h}
                            className="px-4 py-2 text-gray-700 whitespace-nowrap"
                          >
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("upload")}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              ← Back to Upload
            </button>
            <button
              onClick={handlePreview}
              disabled={!isMappingValid}
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs"
            >
              Review & Validate →
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <h3 className="font-bold text-gray-900 mb-1">Validation & Execution Plan</h3>
            <p className="text-xs text-gray-500 mb-6">
              {rows.length} records ready for processing. Check the active column bindings below before executing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REQUIRED_FIELDS.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg bg-blue-50/50 border border-blue-100 px-3.5 py-2 text-xs"
                >
                  <span className="font-semibold text-blue-900">
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="font-mono text-blue-700 font-bold">
                    {mapping[field]}
                  </span>
                </div>
              ))}
              {(
                Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]
              )
                .filter((f) => !REQUIRED_FIELDS.includes(f) && mapping[f])
                .map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3.5 py-2 text-xs"
                  >
                    <span className="text-gray-600">
                      {FIELD_LABELS[field]}
                    </span>
                    <span className="font-mono text-gray-800">
                      {mapping[field]}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("mapping")}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              ← Edit Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={uploading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing {rows.length} Invoices…</span>
                </>
              ) : (
                <span>Confirm & Import {rows.length} Invoices</span>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div
          className={`rounded-2xl border p-8 shadow-xs ${
            result.invoicesCreated > 0
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-amber-200 bg-amber-50/50"
          }`}
        >
          <div
            className={`mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
              result.invoicesCreated > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span className="text-xl">{result.invoicesCreated > 0 ? "✅" : "⚠️"}</span>
          </div>
          <h3 className="text-lg font-bold text-center text-gray-900">
            {result.invoicesCreated > 0
              ? result.skippedRows > 0
                ? "Import Completed with Partial Skips"
                : "Receivables Successfully Imported!"
              : "No Invoices Were Imported"}
          </h3>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white p-4 text-center border border-gray-100 shadow-xs">
              <p className="text-2xl font-extrabold text-emerald-600">{result.validRows}</p>
              <p className="text-xs text-gray-500 mt-1">Invoices Created</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center border border-gray-100 shadow-xs">
              <p className="text-2xl font-extrabold text-amber-600">
                {result.skippedRows}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rows Skipped</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center border border-gray-100 shadow-xs">
              <p className="text-2xl font-extrabold text-blue-600">
                {result.customersCreated}
              </p>
              <p className="text-xs text-gray-500 mt-1">Customers Added</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center border border-gray-100 shadow-xs">
              <p className="text-2xl font-extrabold text-gray-900">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(result.totalAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Outstanding</p>
            </div>
          </div>

          {result.issues.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200 bg-amber-100/50">
                <p className="text-xs font-bold text-amber-900">
                  Skipped Row Diagnostics ({result.issues.length} reasons logged)
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-amber-200/60">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-2.5 text-xs"
                  >
                    <span className="shrink-0 rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                      Row {issue.row}
                    </span>
                    <span className="text-amber-900 font-medium">{issue.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setResult(null);
                setRows([]);
                setHeaders([]);
                setStep("upload");
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Upload Another File
            </button>
            {result.invoicesCreated > 0 && (
              <a
                href="/dashboard/queue"
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
              >
                Go to Collection Queue →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
