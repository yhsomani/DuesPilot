"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { apiPost } from "@/lib/api";
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
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as ParsedRow[];
        if (data.length === 0) return;

        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        setRows(data);

        const autoMap: Partial<ColumnMapping> = {};
        hdrs.forEach((h) => {
          const lower = h.toLowerCase();
          if (lower.includes("customer") && lower.includes("name"))
            autoMap.customerName = h;
          else if (lower.includes("invoice") && lower.includes("number"))
            autoMap.invoiceNumber = h;
          else if (lower.includes("invoice") && lower.includes("date"))
            autoMap.invoiceDate = h;
          else if (lower.includes("due") && lower.includes("date"))
            autoMap.dueDate = h;
          else if (
            (lower.includes("amount") || lower.includes("total")) &&
            !lower.includes("outstanding") &&
            !lower.includes("balance")
          )
            autoMap.amount = h;
          else if (lower.includes("outstanding") || lower.includes("balance"))
            autoMap.outstanding = h;
          else if (lower.includes("email"))
            autoMap.email = h;
          else if (lower.includes("phone") || lower.includes("mobile"))
            autoMap.phone = h;
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
      const res = await apiPost<{ rows: ParsedRow[]; mapping: ColumnMapping }, ImportResult>(
        "/api/import",
        { rows, mapping }
      );
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Receivables</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your receivables from Tally, Excel, or any accounting export.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {(["upload", "mapping", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-blue-600 text-white"
                  : i < ["upload", "mapping", "preview", "done"].indexOf(step)
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                step === s ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {s === "upload"
                ? "Upload"
                : s === "mapping"
                ? "Map Columns"
                : s === "preview"
                ? "Preview"
                : "Done"}
            </span>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="mx-auto h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
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
            <p className="text-sm font-semibold text-gray-900">
              Drop your CSV file here, or{" "}
              <span className="text-blue-600">browse</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              CSV files only. Columns: customer_name, invoice_number,
              invoice_date, due_date, amount, outstanding.
            </p>
          </label>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Map your columns</h3>
            <p className="text-sm text-gray-500 mb-6">
              Match your CSV columns to DuesPilot fields. Fields marked with *
              are required.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map(
                (field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Skip --</option>
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
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">
                  Preview (first {Math.min(rows.length, 5)} of {rows.length} rows)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {headers.slice(0, 6).map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-xs font-semibold text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.slice(0, 6).map((h) => (
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
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePreview}
              disabled={!isMappingValid}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Review & Import
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Review mapping</h3>
            <p className="text-sm text-gray-500 mb-6">
              {rows.length} invoices will be imported with the following column
              mapping.
            </p>

            <div className="space-y-2">
              {REQUIRED_FIELDS.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="text-sm text-gray-900 font-mono">
                    {mapping[field]}
                  </span>
                </div>
              ))}
              {(
                Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]
              ).filter((f) => !REQUIRED_FIELDS.includes(f) && mapping[f]).map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-gray-600">
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="text-sm text-gray-700 font-mono">
                    {mapping[field]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep("mapping")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={uploading}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading
                ? "Importing..."
                : `Import ${rows.length} invoices`}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Import successful!</h3>
          <p className="mt-2 text-sm text-gray-600">
            {result.invoicesCreated} invoices imported (
            {result.customersCreated} customers created,{" "}
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(result.totalAmount)}{" "}
            total). Your collection queue is ready.
          </p>
          <a
            href="/dashboard/queue"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            View collection queue
          </a>
        </div>
      )}
    </div>
  );
}
