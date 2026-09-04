"use client";

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="mt-1 text-sm text-gray-500">Track and resolve invoice disputes</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Dispute management</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Track reasons: PO mismatch, GRN missing, quality dispute, quantity dispute. Resolve before chasing payment.
        </p>
        <button
          disabled
          className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          title="Dispute logging is not connected yet"
        >
          Log dispute
        </button>
      </div>
    </div>
  );
}
