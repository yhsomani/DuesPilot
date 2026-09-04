"use client";

import { formatINR } from "@/lib/utils";

const metrics = [
  { label: "Days Sales Outstanding (DSO)", value: "47 days", change: "-3 days vs last month", positive: true },
  { label: "Collection Effectiveness Index", value: "72%", change: "+5% vs last month", positive: true },
  { label: "Promise Adherence Rate", value: "64%", change: "+2% vs last month", positive: true },
  { label: "Avg Days to Payment", value: "52 days", change: "+1 day vs last month", positive: false },
  { label: "Broken Promise Rate", value: "36%", change: "-4% vs last month", positive: true },
  { label: "Automation Rate", value: "45%", change: "+12% vs last month", positive: true },
];

const monthlyData = [
  { month: "Apr", collected: 3200000, overdue: 800000 },
  { month: "May", collected: 3500000, overdue: 900000 },
  { month: "Jun", collected: 2800000, overdue: 1100000 },
  { month: "Jul", collected: 3100000, overdue: 1000000 },
  { month: "Aug", collected: 3400000, overdue: 1130000 },
  { month: "Sep", collected: 1800000, overdue: 1200000 },
];

export default function AnalyticsPage() {
  const maxVal = Math.max(...monthlyData.map(d => d.collected + d.overdue));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Collection performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{m.value}</p>
            <p className={`mt-1 text-xs font-medium ${m.positive ? "text-green-600" : "text-red-600"}`}>
              {m.change}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly Collection Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-6">Monthly Collections vs Overdue</h2>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map(d => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center" style={{ height: "180px", justifyContent: "flex-end" }}>
                <div
                  className="w-full bg-red-400 rounded-t"
                  style={{ height: `${(d.overdue / maxVal) * 160}px` }}
                />
                <div
                  className="w-full bg-blue-500 rounded-b"
                  style={{ height: `${(d.collected / maxVal) * 160}px` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-blue-500" />
            Collected
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-red-400" />
            Overdue
          </div>
        </div>
      </div>

      {/* Top Overdue Customers */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top Overdue Customers</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { name: "Raj Steel", amount: 480000, days: 21 },
            { name: "Delta Systems", amount: 310000, days: 42 },
            { name: "ABC Engineering", amount: 220000, days: 9 },
            { name: "Metro Components", amount: 170000, days: 11 },
            { name: "Sharma Exports", amount: 130000, days: 7 },
          ].map((c, i) => (
            <div key={i} className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 w-5">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-900">{c.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-red-600 font-medium">{formatINR(c.amount)}</span>
                <span className="text-gray-400 text-xs">{c.days}d overdue</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
