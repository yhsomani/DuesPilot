"use client";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">Track and reconcile incoming payments</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Payment tracking</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Record payments, match them to invoices, and track reconciliation. Import bank statements to auto-match.
        </p>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Record payment
        </button>
      </div>
    </div>
  );
}
