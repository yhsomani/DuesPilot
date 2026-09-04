"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

interface DashboardStats {
  totalReceivables: number;
  totalOverdue: number;
  totalDueSoon: number;
  highRisk: number;
  promiseBroken: number;
  customersOverdue: number;
}

const mockStats: DashboardStats = {
  totalReceivables: 4280000,
  totalOverdue: 1130000,
  totalDueSoon: 620000,
  highRisk: 340000,
  promiseBroken: 110000,
  customersOverdue: 37,
};

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

const agingData: AgingBucket[] = [
  { label: "Current", amount: 2530000, count: 42, color: "bg-green-500" },
  { label: "1-30 days", amount: 670000, count: 18, color: "bg-yellow-500" },
  { label: "31-60 days", amount: 460000, count: 12, color: "bg-orange-500" },
  { label: "61-90 days", amount: 340000, count: 5, color: "bg-red-400" },
  { label: "90+ days", amount: 280000, count: 2, color: "bg-red-600" },
];

interface QueueItem {
  id: string;
  customer: string;
  initials: string;
  amount: string;
  daysOverdue: number;
  status: string;
  action: string;
  actionColor: string;
  bgColor: string;
  borderColor: string;
}

const queueItems: QueueItem[] = [
  {
    id: "1",
    customer: "Raj Steel",
    initials: "RS",
    amount: "₹4.8L",
    daysOverdue: 21,
    status: "Promise broken",
    action: "CALL NOW",
    actionColor: "text-red-700 bg-red-50 border-red-200",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "2",
    customer: "ABC Engineering",
    initials: "AE",
    amount: "₹2.2L",
    daysOverdue: 9,
    status: "Low risk",
    action: "WHATSAPP",
    actionColor: "text-orange-700 bg-orange-50 border-orange-200",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: "3",
    customer: "Metro Components",
    initials: "MC",
    amount: "₹1.7L",
    daysOverdue: 4,
    status: "Auto reminder sent",
    action: "AUTO REMINDER",
    actionColor: "text-green-700 bg-green-50 border-green-200",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    id: "4",
    customer: "Delta Systems",
    initials: "DS",
    amount: "₹3.1L",
    daysOverdue: 42,
    status: "Dispute: PO mismatch",
    action: "RESOLVE",
    actionColor: "text-purple-700 bg-purple-50 border-purple-200",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: "5",
    customer: "Sharma Exports",
    initials: "SE",
    amount: "₹1.3L",
    daysOverdue: 7,
    status: "2nd reminder sent",
    action: "FOLLOW UP",
    actionColor: "text-yellow-700 bg-yellow-50 border-yellow-200",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
];

export default function DashboardPage() {
  const [stats] = useState<DashboardStats>(mockStats);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your collections at a glance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Receivables</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatINR(stats.totalReceivables)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Across all customers
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-600">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {formatINR(stats.totalOverdue)}
          </p>
          <p className="mt-1 text-xs text-red-500">
            {stats.customersOverdue} customers
          </p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-yellow-600">Due Soon</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">
            {formatINR(stats.totalDueSoon)}
          </p>
          <p className="mt-1 text-xs text-yellow-500">Within 7 days</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-orange-600">Broken Promises</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">
            {formatINR(stats.promiseBroken)}
          </p>
          <p className="mt-1 text-xs text-orange-500">Requires escalation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging Report */}
        <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Aging Overview</h2>
            <Link
              href="/dashboard/analytics"
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {agingData.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{bucket.label}</span>
                  <span className="font-medium text-gray-900">
                    {formatINR(bucket.amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bucket.color}`}
                    style={{
                      width: `${(bucket.amount / stats.totalReceivables) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {bucket.count} invoices
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Collection Queue */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">
                Today&apos;s Collection Queue
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatINR(stats.totalOverdue)} overdue ·{" "}
                {stats.customersOverdue} customers
              </p>
            </div>
            <Link
              href="/dashboard/queue"
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              View full queue
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {queueItems.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg ${item.bgColor} border ${item.borderColor} flex items-center justify-center`}
                  >
                    <span
                      className={`font-bold text-xs ${
                        item.actionColor.includes("red")
                          ? "text-red-700"
                          : item.actionColor.includes("orange")
                          ? "text-orange-700"
                          : item.actionColor.includes("green")
                          ? "text-green-700"
                          : item.actionColor.includes("purple")
                          ? "text-purple-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {item.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.customer}</p>
                    <p className="text-sm text-gray-500">
                      {item.amount} · {item.daysOverdue} days overdue · {item.status}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    item.actionColor
                  }`}
                >
                  {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/import"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Import receivables
          </Link>
          <Link
            href="/dashboard/queue"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            View collection queue
          </Link>
          <Link
            href="/dashboard/customers"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Customer list
          </Link>
        </div>
      </div>
    </div>
  );
}
