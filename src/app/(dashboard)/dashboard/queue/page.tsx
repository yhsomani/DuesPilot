"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";

interface QueueItem {
  id: string;
  customer: string;
  initials: string;
  amount: number;
  daysOverdue: number;
  status: string;
  lastAction: string;
  nextAction: string;
  priority: "high" | "medium" | "low";
  promiseBroken: boolean;
}

const mockQueue: QueueItem[] = [
  {
    id: "1",
    customer: "Raj Steel",
    initials: "RS",
    amount: 480000,
    daysOverdue: 21,
    status: "Promise broken",
    lastAction: "Promise to pay on 28 Aug - broken",
    nextAction: "Call now",
    priority: "high",
    promiseBroken: true,
  },
  {
    id: "2",
    customer: "Delta Systems",
    initials: "DS",
    amount: 310000,
    daysOverdue: 42,
    status: "Dispute: PO mismatch",
    lastAction: "Customer says PO doesn't match invoice",
    nextAction: "Resolve dispute",
    priority: "high",
    promiseBroken: false,
  },
  {
    id: "3",
    customer: "ABC Engineering",
    initials: "AE",
    amount: 220000,
    daysOverdue: 9,
    status: "2nd reminder sent",
    lastAction: "WhatsApp reminder on 1 Sep",
    nextAction: "WhatsApp follow-up",
    priority: "medium",
    promiseBroken: false,
  },
  {
    id: "4",
    customer: "Sharma Exports",
    initials: "SE",
    amount: 130000,
    daysOverdue: 7,
    status: "Reminder sent",
    lastAction: "Email reminder on 30 Aug",
    nextAction: "WhatsApp follow-up",
    priority: "medium",
    promiseBroken: false,
  },
  {
    id: "5",
    customer: "Metro Components",
    initials: "MC",
    amount: 170000,
    daysOverdue: 4,
    status: "Auto reminder sent",
    lastAction: "Auto email on 1 Sep",
    nextAction: "Wait 3 days",
    priority: "low",
    promiseBroken: false,
  },
  {
    id: "6",
    customer: "Patel Traders",
    initials: "PT",
    amount: 95000,
    daysOverdue: 14,
    status: "No response",
    lastAction: "Email + WhatsApp sent",
    nextAction: "Call now",
    priority: "medium",
    promiseBroken: false,
  },
  {
    id: "7",
    customer: "Kumar Industries",
    initials: "KI",
    amount: 45000,
    daysOverdue: 2,
    status: "Due today",
    lastAction: "Pre-due reminder sent",
    nextAction: "Send due date notice",
    priority: "low",
    promiseBroken: false,
  },
];

export default function QueuePage() {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [queue] = useState(mockQueue);

  const filtered =
    filter === "all" ? queue : queue.filter((q) => q.priority === filter);

  const totalOverdue = queue.reduce((sum, q) => sum + q.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Today&apos;s prioritized actions — {formatINR(totalOverdue)} overdue
        </p>
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-2">
        {(["all", "high", "medium", "low"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === p
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            {p !== "all" && (
              <span className="ml-1 text-xs">
                ({queue.filter((q) => q.priority === p).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="px-6 py-5 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
                      item.priority === "high"
                        ? "bg-red-50 border border-red-200"
                        : item.priority === "medium"
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-green-50 border border-green-200"
                    }`}
                  >
                    <span
                      className={`font-bold text-xs ${
                        item.priority === "high"
                          ? "text-red-700"
                          : item.priority === "medium"
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}
                    >
                      {item.initials}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {item.customer}
                      </p>
                      {item.promiseBroken && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 uppercase">
                          Promise broken
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatINR(item.amount)} · {item.daysOverdue} days overdue ·{" "}
                      {item.status}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Last: {item.lastAction}</span>
                      <span>Next: {item.nextAction}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      item.priority === "high"
                        ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        : item.priority === "medium"
                        ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                        : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {item.nextAction}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
