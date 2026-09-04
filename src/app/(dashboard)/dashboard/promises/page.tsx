"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { api } from "@/lib/api";
import type { PromiseRow } from "@/lib/types";

type FilterStatus = "all" | "ACTIVE" | "KEPT" | "BROKEN" | "RENEGOTIATED";

export default function PromisesPage() {
  const [promises, setPromises] = useState<PromiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<PromiseRow[]>("/api/promises");
        if (active) setPromises(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered =
    filter === "all" ? promises : promises.filter((p) => p.status === filter);

  const totalPromised = promises
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalBroken = promises
    .filter((p) => p.status === "BROKEN")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalKept = promises
    .filter((p) => p.status === "KEPT")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Promises to Pay</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track customer payment commitments
        </p>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-medium text-blue-600">Active Promises</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatINR(totalPromised)}</p>
            <p className="text-xs text-blue-500 mt-1">
              {promises.filter((p) => p.status === "ACTIVE").length} promises
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-600">Broken Promises</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{formatINR(totalBroken)}</p>
            <p className="text-xs text-red-500 mt-1">
              {promises.filter((p) => p.status === "BROKEN").length} broken
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-medium text-green-600">Kept Promises</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{formatINR(totalKept)}</p>
            <p className="text-xs text-green-500 mt-1">
              {promises.filter((p) => p.status === "KEPT").length} kept
            </p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading promises…</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center gap-2">
            {(["all", "ACTIVE", "BROKEN", "KEPT", "RENEGOTIATED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-sm text-gray-500">
                No payment promises to show.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((promise) => {
                  const broken = promise.status === "BROKEN";
                  const kept = promise.status === "KEPT";
                  return (
                    <div key={promise.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              broken
                                ? "bg-red-50 border border-red-200"
                                : kept
                                ? "bg-green-50 border border-green-200"
                                : "bg-yellow-50 border border-yellow-200"
                            }`}
                          >
                            <span
                              className={`font-bold text-xs ${
                                broken
                                  ? "text-red-700"
                                  : kept
                                  ? "text-green-700"
                                  : "text-yellow-700"
                              }`}
                            >
                              {promise.initials}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{promise.customer}</p>
                              {promise.invoiceNumber && (
                                <span className="text-xs text-gray-400">{promise.invoiceNumber}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatINR(promise.amount)} · Due{" "}
                              {new Date(promise.promiseDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              · {promise.source}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Confidence</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    promise.confidence > 70
                                      ? "bg-green-500"
                                      : promise.confidence > 40
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${promise.confidence}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{promise.confidence}%</span>
                            </div>
                          </div>
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              broken
                                ? "bg-red-50 border border-red-200 text-red-700"
                                : kept
                                ? "bg-green-50 border border-green-200 text-green-700"
                                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                            }`}
                          >
                            {broken ? "BROKEN" : kept ? "KEPT" : promise.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
