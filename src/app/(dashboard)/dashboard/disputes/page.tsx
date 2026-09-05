"use client";

import { useEffect, useState } from "react";
import { api, apiPost, apiPatch, ApiError } from "@/lib/api";
import type { DisputeRow } from "@/lib/types";

const CATEGORIES = [
  { value: "pricing", label: "Pricing" },
  { value: "quantity", label: "Quantity" },
  { value: "quality", label: "Quality" },
  { value: "po_mismatch", label: "PO mismatch" },
  { value: "grn_missing", label: "GRN missing" },
  { value: "tax_gst", label: "Tax / GST" },
  { value: "documentation", label: "Documentation" },
  { value: "delivery", label: "Delivery" },
  { value: "credit_note", label: "Credit note" },
  { value: "other", label: "Other" },
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const fetchDisputes = async () => api<DisputeRow[]>("/api/disputes");

  const load = async () => {
    setDisputes(await fetchDisputes());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDisputes();
        if (cancelled) return;
        setDisputes(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and resolve invoice disputes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          Log dispute
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            onClick={() => setRetryKey((n) => n + 1)}
            className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading disputes…</p>}

      {!loading && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {disputes.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500">
              No disputes logged yet. Disputed invoices are excluded from the collection queue.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {disputes.map((d) => (
                <div key={d.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {d.invoiceNumber}
                        </p>
                        <span className="text-sm text-gray-500">· {d.customer}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{d.reason}</p>
                      {d.notes && (
                        <p className="mt-1 text-xs text-gray-400">{d.notes}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(d.createdAt).toLocaleDateString("en-IN")} ·{" "}
                        {CATEGORIES.find((c) => c.value === d.category)?.label ??
                          "Uncategorized"}
                      </p>
                    </div>
                    {d.status === "open" && (
                      <div className="flex gap-2 shrink-0">
                        <ResolveButton
                          label="Resolve"
                          color="green"
                          onClick={async () => {
                            await apiPatch(`/api/disputes/${d.id}`, {
                              status: "resolved",
                            });
                            await load();
                          }}
                        />
                        <ResolveButton
                          label="Withdraw"
                          color="gray"
                          onClick={async () => {
                            await apiPatch(`/api/disputes/${d.id}`, {
                              status: "withdrawn",
                            });
                            await load();
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <LogDisputeModal
          onClose={() => setShowModal(false)}
          onDone={async () => {
            setShowModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-red-50 text-red-700",
    resolved: "bg-green-50 text-green-700",
    withdrawn: "bg-gray-100 text-gray-600",
    rejected: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.open}`}
    >
      {status}
    </span>
  );
}

function ResolveButton({
  label,
  color,
  onClick,
}: {
  label: string;
  color: "green" | "gray";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        color === "green"
          ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function LogDisputeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [invoices, setInvoices] = useState<
    { id: string; number: string; customer: string; outstanding: number }[]
  >([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setInvoices(
          await api<
            { id: string; number: string; customer: string; outstanding: number }[]
          >("/api/invoices")
        );
      } catch {
        // ignore — invoice picker stays empty
      }
    })();
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/disputes", {
        invoiceId,
        reason,
        category: category || null,
        notes: notes || null,
      });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Log dispute</h3>
          <p className="text-sm text-gray-500">
            Disputed invoices are excluded from the collection queue until resolved.
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice *
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Select invoice…</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · {inv.customer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              placeholder="What is the customer disputing?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || !invoiceId || !reason.trim()}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Logging…" : "Log dispute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}