"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";

type PromiseStatus = "active" | "kept" | "broken";

interface Promise {
  id: string;
  customer: string;
  initials: string;
  amount: number;
  promiseDate: string;
  source: string;
  confidence: number;
  status: PromiseStatus;
  invoiceNumber?: string;
}

const mockPromises: Promise[] = [
  {
    id: "1",
    customer: "Raj Steel",
    initials: "RS",
    amount: 250000,
    promiseDate: "2026-08-28",
    source: "WhatsApp reply",
    confidence: 80,
    status: "broken",
    invoiceNumber: "INV-2026-001",
  },
  {
    id: "2",
    customer: "ABC Engineering",
    initials: "AE",
    amount: 220000,
    promiseDate: "2026-09-10",
    source: "Phone call",
    confidence: 60,
    status: "active",
    invoiceNumber: "INV-2026-005",
  },
  {
    id: "3",
    customer: "Metro Components",
    initials: "MC",
    amount: 170000,
    promiseDate: "2026-09-05",
    source: "Email reply",
    confidence: 70,
    status: "active",
    invoiceNumber: "INV-2026-006",
  },
  {
    id: "4",
    customer: "Sharma Exports",
    initials: "SE",
    amount: 130000,
    promiseDate: "2026-09-08",
    source: "WhatsApp reply",
    confidence: 50,
    status: "active",
    invoiceNumber: "INV-2026-008",
  },
  {
    id: "5",
    customer: "Patel Traders",
    initials: "PT",
    amount: 95000,
    promiseDate: "2026-08-20",
    source: "Phone call",
    confidence: 40,
    status: "broken",
    invoiceNumber: "INV-2026-009",
  },
  {
    id: "6",
    customer: "Metro Components",
    initials: "MC",
    amount: 85000,
    promiseDate: "2026-08-15",
    source: "WhatsApp reply",
    confidence: 90,
    status: "kept",
    invoiceNumber: "INV-2026-003",
  },
];

export default function PromisesPage() {
  const [filter, setFilter] = useState<"all" | PromiseStatus>("all");

  const filtered =
    filter === "all"
      ? mockPromises
      : mockPromises.filter((p) => p.status === filter);

  const totalPromised = mockPromises
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalBroken = mockPromises
    .filter((p) => p.status === "broken")
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-600">Active Promises</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {formatINR(totalPromised)}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            {mockPromises.filter((p) => p.status === "active").length} promises
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-600">Broken Promises</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {formatINR(totalBroken)}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {mockPromises.filter((p) => p.status === "broken").length} broken
          </p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-600">Kept Promises</p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {formatINR(
              mockPromises
                .filter((p) => p.status === "kept")
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </p>
          <p className="text-xs text-green-500 mt-1">
            {mockPromises.filter((p) => p.status === "kept").length} kept
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["all", "active", "broken", "kept"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Promises List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.map((promise) => (
            <div
              key={promise.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      promise.status === "broken"
                        ? "bg-red-50 border border-red-200"
                        : promise.status === "kept"
                        ? "bg-green-50 border border-green-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <span
                      className={`font-bold text-xs ${
                        promise.status === "broken"
                          ? "text-red-700"
                          : promise.status === "kept"
                          ? "text-green-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {promise.initials}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {promise.customer}
                      </p>
                      {promise.invoiceNumber && (
                        <span className="text-xs text-gray-400">
                          {promise.invoiceNumber}
                        </span>
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
                      <span className="text-xs text-gray-500">
                        {promise.confidence}%
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      promise.status === "broken"
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : promise.status === "kept"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                    }`}
                  >
                    {promise.status === "broken"
                      ? "BROKEN"
                      : promise.status === "kept"
                      ? "KEPT"
                      : "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
