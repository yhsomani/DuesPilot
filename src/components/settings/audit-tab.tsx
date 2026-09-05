"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuditLogRow {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditResponse {
  logs: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}

export function AuditTab() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const limit = 25;

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);

      const res = await api<AuditResponse>(`/api/audit?${params.toString()}`);
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit & Compliance Log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable log of all user actions, security events, and data exports.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Actions</option>
            <option value="DATA_EXPORT">Data Exports</option>
            <option value="SETTINGS_UPDATE">Settings Updates</option>
            <option value="MESSAGE_SEND">Outbound Messages</option>
            <option value="PAYMENT_RECORD">Payment Records</option>
            <option value="PAYMENT_REVERSE">Payment Reversals</option>
            <option value="PROMISE_LOG">Promises Logged</option>
            <option value="DISPUTE_OPEN">Disputes Opened</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Entities</option>
            <option value="queue">Queue</option>
            <option value="customer">Customer</option>
            <option value="invoice">Invoice</option>
            <option value="payment">Payment</option>
            <option value="message">Message</option>
            <option value="billing">Billing</option>
          </select>

          <button
            onClick={() => loadLogs()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <p className="px-6 py-12 text-sm text-gray-500 text-center">Loading audit logs…</p>
        ) : logs.length === 0 ? (
          <p className="px-6 py-12 text-sm text-gray-500 text-center">
            No audit records matching the criteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Actor</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">IP Address</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/75 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-900">{log.user.name}</p>
                          <p className="text-[10px] text-gray-400">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {log.entityType ? `${log.entityType} ${log.entityId ? `#${log.entityId.slice(0, 6)}` : ""}` : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {log.ipAddress || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View JSON
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Showing {page * limit + 1} - {Math.min(total, (page + 1) * limit)} of {total} events
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-gray-200 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-700">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-gray-200 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Metadata Inspector Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Audit Event: {selectedLog.action}
                </h3>
                <p className="text-[11px] text-gray-400">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs rounded-b-xl">
              <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
